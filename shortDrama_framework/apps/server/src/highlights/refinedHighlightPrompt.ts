import type { ChatMessage } from "../llm/doubaoClient.js";
import type { RefinedSentence } from "../asr/types.js";
import { serializeStoryContextForPrompt, type StoryContext } from "./storyContext.js";

export function buildRefinedHighlightMessages(params: {
  episodeId: string;
  windowId: string;
  sentences: RefinedSentence[];
  storyContext?: StoryContext;
  danmakuNearbySignals?: unknown;
}): ChatMessage[] {
  const sentencesJson = params.sentences.map((sentence) => ({
    sentence_id: sentence.sentence_id,
    start: sentence.start,
    end: sentence.end,
    text: sentence.text,
    sentence_type: sentence.sentence_type,
    is_potential_trigger: sentence.is_potential_trigger
  }));

  return [
    {
      role: "system",
      content: [
        "你是一个短剧高光点识别模型。",
        "你会收到已经经过修正和自然断句的 sentence-level ASR 时间轴。你的任务是判断局部剧情中是否存在高光点，并选择最适合触发播放条 marker 的关键句子。",
        "重要规则：",
        "1. 高光点不是整段开始，而是关键剧情信息释放完成之后。",
        "2. 如果关键高光来自某句台词，marker_time 应该在该句台词说完之后，而不是台词开始时。",
        "3. 不要把 marker_time 放在高光台词中间。",
        "4. 如果是身份反转、打脸、告白、悬念、喜剧 punchline，必须等触发句完整播放完再打点。",
        "5. 如果只是铺垫或普通设定，不要给过高分。",
        "6. 如果提供了全局剧情上下文、人物表、前序集摘要或弹幕信号，必须优先使用这些信息判断谁是主角、配角、反派，以及该片段对主线是否重要。",
        "7. 不要因为当前窗口里某个配角说话多，就把配角误判成主角。",
        "8. 如果人物身份或关系不确定，不要编造角色名；请设置 safety.name_uncertainty=true，并在 review.risk_reasons 中写明 role_uncertainty 或 context_insufficient。",
        "9. score 必须是 0-1 的小数，不允许输出 4、8、90 这类非归一化分数。",
        "10. 输出必须是合法 JSON。",
        "11. 不要输出 Markdown。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请根据下面的 refined sentence timeline 判断是否存在短剧高光点。",
        "",
        "输入：",
        `episode_id: ${params.episodeId}`,
        `window_id: ${params.windowId}`,
        "",
        "全局剧情上下文（可能为空；如果为空请更谨慎，不要强行判断人物身份）：",
        serializeStoryContextForPrompt(params.storyContext ?? { loaded_files: [] }),
        "",
        "当前候选窗口附近弹幕观众反应信号（可能为空；只能作为观众反应参考，不得替代剧情理解）：",
        JSON.stringify(params.danmakuNearbySignals ?? null, null, 2),
        "",
        "上下文句子：",
        JSON.stringify(sentencesJson, null, 2),
        "",
        "请输出 JSON：",
        JSON.stringify(
          {
            schema_version: "1.0",
            episode_id: params.episodeId,
            window_id: params.windowId,
            target_sentence_ids: ["..."],
            time: {
              start: 0,
              end: 0,
              trigger_sentence_id: "...",
              trigger_sentence_start: 0,
              trigger_sentence_end: 0,
              marker_time_policy: "after_trigger_sentence_end",
              marker_time: 0
            },
            highlight: {
              is_highlight: true,
              type: "身份反转",
              score: 0.0,
              priority: 1,
              confidence: 0.0
            },
            content: {
              plot_summary: "...",
              trigger_text: "...",
              asr_rewrite: "...",
              main_character_refs: ["..."],
              supporting_character_refs: ["..."],
              relationship_context: "...",
              danmu_evidence: ["..."]
            },
            ui: {
              marker_label: "...",
              tooltip_title: "...",
              tooltip_text: "...",
              interaction_prompt: "..."
            },
            safety: {
              name_uncertainty: true,
              avoid_proper_names: true,
              role_uncertainty: true,
              context_insufficient: true
            },
            review: {
              needs_human_review: true,
              risk_reasons: ["role_uncertainty"],
              editable_fields: [
                "content.plot_summary",
                "ui.tooltip_title",
                "ui.tooltip_text",
                "highlight.type",
                "time.marker_time"
              ]
            },
            reason: "..."
          },
          null,
          2
        ),
        "",
        "判断要求：",
        "1. 如果没有强剧情事件变化，is_highlight=false，type=普通片段。",
        "2. 如果存在高光，必须选择一个 trigger_sentence_id。",
        "3. marker_time 必须晚于或等于 trigger_sentence_end。",
        "4. 如果你不能确定 marker_time，请先输出 trigger_sentence_end，程序会再加 post_delay。",
        "5. score 表示高光强度，不要把所有片段都打成高分。",
        "6. priority 用于前端筛选，1-5 分，身份反转/打脸/强喜剧可给 4-5，普通设定和角色登场通常不超过 2-3。",
        "7. 如果全局上下文不足以确认人物身份，请在文案中使用“该角色/对方/被羞辱者”等中性称谓，不要写“主角/女主/男主”。",
        "8. 如果弹幕信号和台词高光一致，可以把弹幕证据写入 content.danmu_evidence；如果没有弹幕证据则输出空数组。",
        "9. 如果 ASR 显示普通但弹幕信号很强，请不要强行改成剧情高光；只说明可能是视觉/动作/颜值/BGM/弹幕梗，并设置 review.needs_human_review=true。"
      ].join("\n")
    }
  ];
}
