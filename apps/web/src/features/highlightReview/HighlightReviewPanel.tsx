import { useEffect, useMemo, useState } from "react";
import { ADMIN_MODE } from "../admin/adminConfig";
import {
  fetchHighlightCandidatesForReview,
  saveHighlightOverride
} from "./highlightReviewApi";
import type {
  HighlightCandidateDebug,
  LlmHighlightOverride
} from "./highlightReviewTypes";
import type { HighlightMarker } from "../../types/highlightMarker";

type HighlightReviewPanelProps = {
  episodeId: string;
  onSaved?: () => void;
};

const HIGHLIGHT_TYPES = [
  "身份反转",
  "打脸爽点",
  "喜剧反差",
  "冲突羞辱",
  "悬念钩子",
  "撒糖暧昧",
  "亲情情绪",
  "设定揭露",
  "角色登场",
  "普通片段"
];

export function HighlightReviewPanel(props: HighlightReviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [candidates, setCandidates] = useState<HighlightCandidateDebug[]>([]);
  const [overrides, setOverrides] = useState<LlmHighlightOverride[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LlmHighlightOverride | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const overrideMap = useMemo(
    () => new Map(overrides.map((override) => [override.candidateId, override])),
    [overrides]
  );

  useEffect(() => {
    if (!ADMIN_MODE || !isOpen) return;
    void loadCandidates();
  }, [isOpen, props.episodeId]);

  if (!ADMIN_MODE) return null;

  async function loadCandidates() {
    try {
      setIsLoading(true);
      setStatus(null);
      const data = await fetchHighlightCandidatesForReview(props.episodeId);
      setCandidates(
        data.selectedMarkers?.length
          ? data.selectedMarkers.map(markerToReviewCandidate)
          : data.candidates ?? []
      );
      setOverrides(data.overrides ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "高光点加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  function startEdit(candidate: HighlightCandidateDebug) {
    const candidateId = getCandidateId(candidate);
    const existing = overrideMap.get(candidateId);

    setEditingId(candidateId);
    setDraft({
      candidateId,
      enabled: existing?.enabled ?? Boolean(candidate.highlight?.is_highlight),
      timeSec: existing?.timeSec ?? candidate.time?.marker_time ?? 0,
      startSec: existing?.startSec ?? candidate.time?.start ?? 0,
      endSec: existing?.endSec ?? candidate.time?.end ?? 0,
      type: existing?.type ?? candidate.highlight?.type ?? "普通片段",
      score: existing?.score ?? candidate.highlight?.score ?? 0,
      priority: existing?.priority ?? candidate.highlight?.priority ?? 1,
      confidence: existing?.confidence ?? candidate.highlight?.confidence ?? 0,
      label: existing?.label ?? candidate.ui?.marker_label ?? "",
      title: existing?.title ?? candidate.ui?.tooltip_title ?? "",
      text: existing?.text ?? candidate.ui?.tooltip_text ?? "",
      triggerText: existing?.triggerText ?? candidate.content?.trigger_text ?? "",
      reason: existing?.reason ?? candidate.reason ?? ""
    });
  }

  async function saveDraft() {
    if (!draft) return;

    try {
      setStatus("正在保存...");
      await saveHighlightOverride(props.episodeId, draft);
      setStatus("已保存人工修正，刷新后端高光分发结果。");
      setEditingId(null);
      setDraft(null);
      await loadCandidates();
      props.onSaved?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败");
    }
  }

  return (
    <section className="mt-5 rounded-[1.5rem] border border-amber-200/15 bg-black/30 p-5 text-amber-50">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black">高光点人工微调</h2>
          <p className="mt-1 text-sm text-amber-50/58">
            保存到 human_overrides.json，不覆盖 LLM 原始结果。
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-stone-950 transition hover:bg-amber-200"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? "收起" : "展开编辑"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4">
          {isLoading ? <p className="text-sm text-amber-100/70">正在加载高光候选...</p> : null}
          {status ? <p className="mb-3 text-sm text-amber-100">{status}</p> : null}
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const candidateId = getCandidateId(candidate);
              const isEditing = editingId === candidateId;
              const needsReview = Boolean(candidate.review?.needs_human_review);

              return (
                <div
                  key={candidateId}
                  className="rounded-2xl border border-amber-200/10 bg-amber-50/[0.04] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-amber-200/55">
                        {candidateId} · {formatTime(candidate.time?.marker_time)}
                      </p>
                      <h3 className="mt-1 text-base font-black">
                        {candidate.ui?.tooltip_title || candidate.ui?.marker_label || candidate.highlight?.type}
                      </h3>
                      <p className="mt-1 text-sm text-amber-50/65">
                        {candidate.ui?.tooltip_text || candidate.content?.plot_summary || "暂无描述"}
                      </p>
                      {needsReview ? (
                        <p className="mt-2 text-xs text-red-200">
                          待审核：{candidate.review?.risk_reasons?.join(" / ") || "模型标记不确定"}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-amber-200/20 px-3 py-1.5 text-sm font-bold text-amber-100 transition hover:bg-amber-50/10"
                      onClick={() => startEdit(candidate)}
                    >
                      编辑
                    </button>
                  </div>

                  {isEditing && draft ? (
                    <Editor
                      draft={draft}
                      onChange={setDraft}
                      onCancel={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      onSave={() => void saveDraft()}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Editor(props: {
  draft: LlmHighlightOverride;
  onChange: (draft: LlmHighlightOverride) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const update = (patch: Partial<LlmHighlightOverride>) => props.onChange({ ...props.draft, ...patch });

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-amber-200/10 bg-black/25 p-4 md:grid-cols-2">
      <label className="flex items-center gap-2 text-sm font-bold text-amber-100">
        <input
          type="checkbox"
          checked={props.draft.enabled ?? true}
          onChange={(event) => update({ enabled: event.target.checked })}
        />
        展示该高光点
      </label>
      <Field label="marker 时间">
        <input
          className="input"
          type="number"
          step="0.1"
          value={props.draft.timeSec ?? 0}
          onChange={(event) => update({ timeSec: Number(event.target.value) })}
        />
      </Field>
      <Field label="高光类型">
        <select
          className="input"
          value={props.draft.type ?? "普通片段"}
          onChange={(event) => update({ type: event.target.value })}
        >
          {HIGHLIGHT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>
      <Field label="分数 0-1">
        <input
          className="input"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={props.draft.score ?? 0}
          onChange={(event) => update({ score: Number(event.target.value) })}
        />
      </Field>
      <Field label="标题">
        <input
          className="input"
          value={props.draft.title ?? ""}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>
      <Field label="短标签">
        <input
          className="input"
          value={props.draft.label ?? ""}
          onChange={(event) => update({ label: event.target.value })}
        />
      </Field>
      <Field label="描述">
        <textarea
          className="input min-h-24"
          value={props.draft.text ?? ""}
          onChange={(event) => update({ text: event.target.value })}
        />
      </Field>
      <Field label="触发台词">
        <textarea
          className="input min-h-24"
          value={props.draft.triggerText ?? ""}
          onChange={(event) => update({ triggerText: event.target.value })}
        />
      </Field>
      <div className="flex gap-2 md:col-span-2">
        <button
          type="button"
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-stone-950"
          onClick={props.onSave}
        >
          保存修正
        </button>
        <button
          type="button"
          className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-bold text-amber-100"
          onClick={props.onCancel}
        >
          取消
        </button>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-bold text-amber-100">
      {props.label}
      {props.children}
    </label>
  );
}

function getCandidateId(candidate: HighlightCandidateDebug) {
  return candidate.window_id ?? "unknown_window";
}

function markerToReviewCandidate(marker: HighlightMarker): HighlightCandidateDebug {
  return {
    window_id: marker.id,
    episode_id: marker.episodeId,
    displayScore: marker.debug?.displayScore ?? marker.score,
    time: {
      start: marker.startSec,
      end: marker.endSec,
      marker_time: marker.timeSec
    },
    highlight: {
      is_highlight: true,
      type: marker.type,
      score: marker.score,
      priority: marker.priority,
      confidence: marker.confidence
    },
    content: {
      plot_summary: marker.text,
      trigger_text: marker.debug?.triggerText
    },
    ui: {
      marker_label: marker.label,
      tooltip_title: marker.title,
      tooltip_text: marker.text
    },
    reason: marker.debug?.reason
  };
}

function formatTime(value?: number) {
  if (!Number.isFinite(value)) return "0.0s";
  return `${Number(value).toFixed(1)}s`;
}
