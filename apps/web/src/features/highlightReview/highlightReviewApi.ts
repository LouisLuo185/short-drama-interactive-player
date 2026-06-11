import { getJson, resolveBackendUrl } from "../../services/http";
import type {
  HighlightCandidateDebugResponse,
  LlmHighlightOverride
} from "./highlightReviewTypes";

export function fetchHighlightCandidatesForReview(episodeId: string) {
  return getJson<HighlightCandidateDebugResponse>(
    `/api/episodes/${episodeId}/llm-highlight-candidates`
  );
}

export async function saveHighlightOverride(episodeId: string, override: LlmHighlightOverride) {
  const response = await fetch(
    resolveBackendUrl(
      `/api/episodes/${episodeId}/llm-highlight-overrides/${override.candidateId}`
    ),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(override)
    }
  );
  const text = await response.text();

  if (!text.trim()) {
    throw new Error("保存失败：后端返回为空");
  }

  const body = JSON.parse(text) as { data?: unknown; error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `保存失败：${response.status}`);
  }

  return body.data;
}
