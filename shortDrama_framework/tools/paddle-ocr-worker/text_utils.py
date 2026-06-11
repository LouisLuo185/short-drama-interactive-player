from __future__ import annotations

import re
from difflib import SequenceMatcher


HAN_RE = re.compile(r"[\u4e00-\u9fff]")
USEFUL_RE = re.compile(r"[\w\u4e00-\u9fff]")


def clean_text(value: str) -> str:
    text = value.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"([\u4e00-\u9fff])\s+([\u4e00-\u9fff])", r"\1\2", text)
    return text


def is_useful_text(
    value: str,
    *,
    min_text_length: int,
    max_text_length: int,
    min_han_chars: int,
) -> bool:
    compact = re.sub(r"\s+", "", value)
    han_count = len(HAN_RE.findall(compact))

    if len(compact) < min_text_length or len(compact) > max_text_length:
        return False

    if han_count < min_han_chars:
        return False

    return bool(USEFUL_RE.search(compact))


def similarity(left: str, right: str) -> float:
    return SequenceMatcher(None, left, right).ratio()
