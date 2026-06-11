from __future__ import annotations

import argparse
from pathlib import Path

from exporters import export_outputs
from frame_extract import iter_subtitle_frames, read_video_info
from paddle_ocr_engine import PaddleOcrEngine
from subtitle_merge import RawOcrItem, merge_subtitles
from text_utils import is_useful_text


def main() -> None:
    args = parse_args()
    validate_args(args)

    video_path = Path(args.video).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not video_path.is_file():
        raise SystemExit(f"[ERROR] Video file does not exist: {video_path}")

    print(f"[INFO] Loading video: {video_path}")
    video_info = read_video_info(video_path)
    print(
        f"[INFO] Video duration: {video_info.duration:.2f}s, "
        f"size: {video_info.width}x{video_info.height}, fps: {video_info.fps:.2f}"
    )
    print(f"[INFO] Sampling fps: {args.fps}")
    print("[INFO] Initializing PaddleOCR...")

    engine = PaddleOcrEngine(
        lang=args.lang,
        use_angle_cls=args.use_angle_cls,
        det_limit_side_len=args.det_limit_side_len,
        min_rec_score=args.min_rec_score,
    )

    raw_items: list[RawOcrItem] = []
    sampled_frames = 0

    print("[INFO] Running OCR...")
    for sampled in iter_subtitle_frames(
        video_path,
        sample_fps=args.fps,
        crop_left_ratio=args.crop_left_ratio,
        crop_right_ratio=args.crop_right_ratio,
        crop_top_ratio=args.crop_top_ratio,
        crop_bottom_ratio=args.crop_bottom_ratio,
        preprocess_mode=args.preprocess_mode,
        preprocess_scale=args.preprocess_scale,
    ):
        sampled_frames += 1
        line = engine.recognize(sampled.image)
        if not line:
            continue

        if not is_useful_text(
            line.text,
            min_text_length=args.min_text_length,
            max_text_length=args.max_text_length,
            min_han_chars=args.min_han_chars,
        ):
            continue

        raw_items.append(
            RawOcrItem(
                timestamp=sampled.timestamp,
                text=line.text,
                score=line.score,
            )
        )

    segments = merge_subtitles(
        raw_items,
        sample_fps=args.fps,
        similarity_threshold=args.similarity_threshold,
        max_merge_gap_sec=args.max_merge_gap_sec,
    )

    paths = export_outputs(
        output_dir=output_dir,
        episode_id=args.episode_id,
        source_video=args.video,
        video_info=video_info,
        config={
            "engine": "paddleocr",
            "lang": args.lang,
            "sample_fps": args.fps,
            "crop_left_ratio": args.crop_left_ratio,
            "crop_right_ratio": args.crop_right_ratio,
            "crop_top_ratio": args.crop_top_ratio,
            "crop_bottom_ratio": args.crop_bottom_ratio,
            "preprocess_mode": args.preprocess_mode,
            "preprocess_scale": args.preprocess_scale,
            "use_angle_cls": args.use_angle_cls,
            "det_limit_side_len": args.det_limit_side_len,
            "min_rec_score": args.min_rec_score,
            "similarity_threshold": args.similarity_threshold,
            "min_text_length": args.min_text_length,
            "max_text_length": args.max_text_length,
            "min_han_chars": args.min_han_chars,
            "max_merge_gap_sec": args.max_merge_gap_sec,
        },
        stats={
            "sampled_frames": sampled_frames,
            "raw_ocr_items": len(raw_items),
            "merged_segments": len(segments),
        },
        segments=segments,
    )

    print(f"[INFO] Sampled frames: {sampled_frames}")
    print(f"[INFO] Raw OCR items: {len(raw_items)}")
    print(f"[INFO] Merged subtitle segments: {len(segments)}")
    print(f"[INFO] Saved: {paths['dialogue']}")
    print(f"[INFO] Saved: {paths['srt']}")
    print(f"[INFO] Saved: {paths['meta']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract burned-in short-drama subtitles with PaddleOCR.")
    parser.add_argument("--video", required=True, help="Input video path.")
    parser.add_argument("--episode-id", required=True, help="Episode id used in exported line ids.")
    parser.add_argument("--output-dir", required=True, help="Output directory.")
    parser.add_argument("--fps", type=float, default=2.0, help="Frame sampling FPS.")
    parser.add_argument("--lang", default="ch", help="PaddleOCR language, default: ch.")
    parser.add_argument("--crop-left-ratio", type=float, default=0.05)
    parser.add_argument("--crop-right-ratio", type=float, default=0.95)
    parser.add_argument("--crop-top-ratio", type=float, default=0.58)
    parser.add_argument("--crop-bottom-ratio", type=float, default=0.82)
    parser.add_argument("--preprocess-mode", choices=["none", "subtitle"], default="subtitle")
    parser.add_argument("--preprocess-scale", type=float, default=2.0)
    parser.add_argument("--use-angle-cls", action="store_true", help="Enable PaddleOCR text orientation classifier.")
    parser.add_argument("--det-limit-side-len", type=int, default=960)
    parser.add_argument("--min-rec-score", type=float, default=0.45)
    parser.add_argument("--similarity-threshold", type=float, default=0.85)
    parser.add_argument("--min-text-length", type=int, default=2)
    parser.add_argument("--max-text-length", type=int, default=40)
    parser.add_argument("--min-han-chars", type=int, default=2)
    parser.add_argument("--max-merge-gap-sec", type=float, default=1.0)
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if args.fps <= 0:
        raise SystemExit("[ERROR] --fps must be greater than 0")

    if not 0 <= args.crop_left_ratio < args.crop_right_ratio <= 1:
        raise SystemExit("[ERROR] horizontal crop ratios must be ordered and within 0-1")

    if not 0 <= args.crop_top_ratio < args.crop_bottom_ratio <= 1:
        raise SystemExit("[ERROR] vertical crop ratios must be ordered and within 0-1")

    if args.preprocess_scale < 1:
        raise SystemExit("[ERROR] --preprocess-scale must be greater than or equal to 1")

    if not 0 <= args.min_rec_score <= 1:
        raise SystemExit("[ERROR] --min-rec-score must be within 0-1")

    if not 0 <= args.similarity_threshold <= 1:
        raise SystemExit("[ERROR] --similarity-threshold must be within 0-1")

    if args.max_text_length < args.min_text_length:
        raise SystemExit("[ERROR] --max-text-length must be greater than or equal to --min-text-length")


if __name__ == "__main__":
    main()
