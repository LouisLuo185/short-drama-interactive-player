from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


@dataclass(frozen=True)
class VideoInfo:
    width: int
    height: int
    fps: float
    duration: float
    total_frames: int


@dataclass(frozen=True)
class SampledFrame:
    timestamp: float
    image: object


def read_video_info(video_path: Path) -> VideoInfo:
    import cv2

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / fps if fps > 0 else 0
    capture.release()

    return VideoInfo(
        width=width,
        height=height,
        fps=fps,
        duration=duration,
        total_frames=total_frames,
    )


def iter_subtitle_frames(
    video_path: Path,
    *,
    sample_fps: float,
    crop_left_ratio: float,
    crop_right_ratio: float,
    crop_top_ratio: float,
    crop_bottom_ratio: float,
    preprocess_mode: str,
    preprocess_scale: float,
) -> Iterator[SampledFrame]:
    import cv2

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    source_fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / source_fps if source_fps > 0 else 0
    step = 1 / sample_fps
    timestamp = 0.0

    while timestamp <= duration:
        capture.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
        ok, frame = capture.read()
        if not ok:
            break

        h, w = frame.shape[:2]
        x1 = int(w * crop_left_ratio)
        x2 = int(w * crop_right_ratio)
        y1 = int(h * crop_top_ratio)
        y2 = int(h * crop_bottom_ratio)
        crop = frame[y1:y2, x1:x2]
        crop = preprocess_frame(crop, mode=preprocess_mode, scale=preprocess_scale)

        yield SampledFrame(timestamp=round(timestamp, 3), image=crop)
        timestamp += step

    capture.release()


def preprocess_frame(image: object, *, mode: str, scale: float) -> object:
    if mode == "none":
        return image

    import cv2

    processed = image
    if scale != 1:
        processed = cv2.resize(
            processed,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )

    processed = cv2.convertScaleAbs(processed, alpha=1.35, beta=8)
    blurred = cv2.GaussianBlur(processed, (0, 0), 1.0)
    processed = cv2.addWeighted(processed, 1.5, blurred, -0.5, 0)
    return processed
