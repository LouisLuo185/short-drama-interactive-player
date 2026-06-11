from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from text_utils import similarity


@dataclass(frozen=True)
class RawOcrItem:
    timestamp: float
    text: str
    score: float


@dataclass(frozen=True)
class DialogueSegment:
    start: float
    end: float
    text: str


def merge_subtitles(
    items: list[RawOcrItem],
    *,
    sample_fps: float,
    similarity_threshold: float,
    max_merge_gap_sec: float,
) -> list[DialogueSegment]:
    groups: list[list[RawOcrItem]] = []

    for item in sorted(items, key=lambda value: value.timestamp):
        if not groups:
            groups.append([item])
            continue

        current = groups[-1]
        previous = current[-1]
        if (
            similarity(previous.text, item.text) >= similarity_threshold
            and item.timestamp - previous.timestamp <= max_merge_gap_sec
        ):
            current.append(item)
        else:
            groups.append([item])

    return [
        DialogueSegment(
            start=round(group[0].timestamp, 3),
            end=round(group[-1].timestamp + 1 / sample_fps, 3),
            text=choose_representative_text(group),
        )
        for group in groups
    ]


def choose_representative_text(group: list[RawOcrItem]) -> str:
    counts = Counter(item.text for item in group)
    return sorted(
        counts.keys(),
        key=lambda text: (counts[text], len(text)),
        reverse=True,
    )[0]
