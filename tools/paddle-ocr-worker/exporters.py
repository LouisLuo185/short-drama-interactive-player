from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from frame_extract import VideoInfo
from subtitle_merge import DialogueSegment


def export_outputs(
    *,
    output_dir: Path,
    episode_id: str,
    source_video: str,
    video_info: VideoInfo,
    config: dict[str, Any],
    stats: dict[str, int],
    segments: list[DialogueSegment],
) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    dialogue_path = output_dir / "dialogue_segments.json"
    srt_path = output_dir / "ocr.srt"
    meta_path = output_dir / "meta.json"

    dialogue_payload = {
        "episode_id": episode_id,
        "source_video": source_video,
        "segments": [
            {
                "line_id": f"{episode_id}_line_{index + 1:04d}",
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
                "source": "ocr",
                "role_id": None,
                "role_name": None,
                "emotion": None,
                "need_review": False,
            }
            for index, segment in enumerate(segments)
        ],
    }

    meta_payload = {
        "episode_id": episode_id,
        "source_video": source_video,
        "video_info": {
            "width": video_info.width,
            "height": video_info.height,
            "fps": video_info.fps,
            "duration": video_info.duration,
            "total_frames": video_info.total_frames,
        },
        "ocr_config": config,
        "stats": stats,
    }

    dialogue_path.write_text(json.dumps(dialogue_payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
    srt_path.write_text(to_srt(segments), "utf-8")
    meta_path.write_text(json.dumps(meta_payload, ensure_ascii=False, indent=2) + "\n", "utf-8")

    return {
        "dialogue": dialogue_path,
        "srt": srt_path,
        "meta": meta_path,
    }


def to_srt(segments: list[DialogueSegment]) -> str:
    blocks = []
    for index, segment in enumerate(segments, start=1):
        blocks.append(
            f"{index}\n{format_srt_time(segment.start)} --> {format_srt_time(segment.end)}\n{segment.text}\n"
        )
    return "\n".join(blocks)


def format_srt_time(seconds: float) -> str:
    total_ms = max(0, round(seconds * 1000))
    ms = total_ms % 1000
    total_seconds = total_ms // 1000
    sec = total_seconds % 60
    total_minutes = total_seconds // 60
    minute = total_minutes % 60
    hour = total_minutes // 60
    return f"{hour:02d}:{minute:02d}:{sec:02d},{ms:03d}"
