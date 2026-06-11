from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from text_utils import clean_text


@dataclass(frozen=True)
class OcrLine:
    text: str
    score: float


class PaddleOcrEngine:
    def __init__(
        self,
        *,
        lang: str,
        use_angle_cls: bool,
        det_limit_side_len: int,
        min_rec_score: float,
    ) -> None:
        self.min_rec_score = min_rec_score
        self.ocr = self._create_ocr(
            lang=lang,
            use_angle_cls=use_angle_cls,
            det_limit_side_len=det_limit_side_len,
        )
        self.use_angle_cls = use_angle_cls

    def recognize(self, image: object) -> OcrLine | None:
        result = self._run_ocr(image)
        lines = [
            line
            for line in parse_paddle_result(result)
            if line.text and line.score >= self.min_rec_score
        ]

        if not lines:
            return None

        text = clean_text(" ".join(line.text for line in lines))
        score = sum(line.score for line in lines) / len(lines)
        return OcrLine(text=text, score=score)

    def _run_ocr(self, image: object) -> Any:
        if hasattr(self.ocr, "predict"):
            return self.ocr.predict(image)

        if hasattr(self.ocr, "ocr"):
            try:
                return self.ocr.ocr(image, cls=self.use_angle_cls)
            except TypeError:
                return self.ocr.ocr(image)

        raise RuntimeError("Unsupported PaddleOCR object: missing ocr/predict method")

    @staticmethod
    def _create_ocr(*, lang: str, use_angle_cls: bool, det_limit_side_len: int) -> Any:
        os.environ.setdefault("FLAGS_use_mkldnn", "0")
        os.environ.setdefault("FLAGS_enable_pir_api", "0")

        from paddleocr import PaddleOCR

        try:
            # PaddleOCR 3.x API. Use mobile models and disable MKLDNN/oneDNN on
            # Windows to avoid the PP-OCRv5 server static-inference crash.
            return PaddleOCR(
                lang=lang,
                text_detection_model_name="PP-OCRv4_mobile_det",
                text_recognition_model_name="PP-OCRv4_mobile_rec",
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=use_angle_cls,
                text_det_limit_side_len=det_limit_side_len,
                device="cpu",
                engine="paddle_static",
                engine_config={
                    "run_mode": "paddle",
                    "cpu_threads": 4,
                    "enable_cinn": False,
                },
                enable_mkldnn=False,
                enable_hpi=False,
                cpu_threads=4,
            )
        except ValueError as error:
            raise


def parse_paddle_result(result: Any) -> list[OcrLine]:
    lines: list[OcrLine] = []
    _parse_any(result, lines)
    return lines


def _parse_any(value: Any, lines: list[OcrLine]) -> None:
    if value is None:
        return

    if isinstance(value, dict):
        texts = value.get("rec_texts")
        scores = value.get("rec_scores")
        if isinstance(texts, list):
            for index, text in enumerate(texts):
                score = scores[index] if isinstance(scores, list) and index < len(scores) else 1.0
                _append_line(lines, text, score)
            return

        for nested in value.values():
            _parse_any(nested, lines)
        return

    if isinstance(value, (tuple, list)):
        if len(value) >= 2 and isinstance(value[0], str) and isinstance(value[1], (int, float)):
            _append_line(lines, value[0], float(value[1]))
            return

        if (
            len(value) >= 2
            and isinstance(value[1], (tuple, list))
            and len(value[1]) >= 2
            and isinstance(value[1][0], str)
        ):
            _append_line(lines, value[1][0], value[1][1])
            return

        for nested in value:
            _parse_any(nested, lines)


def _append_line(lines: list[OcrLine], text: Any, score: Any) -> None:
    cleaned = clean_text(str(text))
    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        numeric_score = 1.0

    if cleaned:
        lines.append(OcrLine(text=cleaned, score=numeric_score))
