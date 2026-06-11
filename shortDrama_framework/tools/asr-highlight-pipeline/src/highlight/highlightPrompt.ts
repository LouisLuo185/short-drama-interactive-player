import type { HighlightWindow } from "../types.js";
import type { ChatMessage } from "../llm/doubaoClient.js";

const HIGHLIGHT_TYPES = [
  "角色登场",
  "冲突羞辱",
  "身份反转",
  "打脸爽点",
  "喜剧反差",
  "亲情情绪",
  "设定揭露",
  "撒糖暧昧",
  "悬念钩子",
  "普通片段"
];

export function buildHighlightMessages(window: HighlightWindow): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是一个短剧高光点识别模型。",
        "你的任务是根据 WhisperX ASR 字幕窗口，完成保守字幕修正、剧情总结、上下文理解和高光打分。",
        "WhisperX ASR 可能没有标点，也可能把同音专名识别错，例如姓氏、家族名、人名。",
        "不要因为专名可能错就否定剧情判断。高光识别应优先基于语义、人物关系、冲突、反转、打脸、亲情和悬念。",
        "如果存在专名不确定，互动文案必须规避具体人名/姓氏/家族名，使用类型化表达。",
        `highlight_type 只能从这些值中选择：${HIGHLIGHT_TYPES.join("、")}`,
        "只输出合法 JSON，不要输出 Markdown 或解释性正文。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请分析下面短剧 ASR 上下文窗口。",
        "",
        `window_id: ${window.window_id}`,
        `episode_id: ${window.episode_id}`,
        `target_segment_id: ${window.target_segment_id}`,
        `target_start: ${window.start}`,
        `target_end: ${window.end}`,
        `asr_confidence: ${window.asr_confidence ?? "unknown"}`,
        `name_uncertainty: ${window.name_uncertainty}`,
        "",
        "context_text:",
        window.context_text,
        "",
        "请只输出 JSON，字段必须完整：",
        JSON.stringify(
          {
            window_id: window.window_id,
            episode_id: window.episode_id,
            target_segment_id: window.target_segment_id,
            start: window.start,
            end: window.end,
            is_highlight: true,
            highlight_type: "身份反转",
            highlight_score: 0.86,
            plot_summary: "一句话总结剧情功能",
            asr_rewrite: "保守修正后的目标段字幕，不要过度脑补",
            trigger_text: "最能触发情绪的台词",
            trigger_time: window.start,
            safe_interaction_title: "身份反转来了",
            safe_interaction_prompt: "这一句是不是有点爽？",
            emotion_tags: ["反转", "爽感"],
            name_uncertainty: window.name_uncertainty,
            reason: "一句话说明判断依据"
          },
          null,
          2
        ),
        "",
        "判断要求：",
        "1. highlight_score 为 0 到 1，0.7 以上才建议作为强高光。",
        "2. 如果只是过渡，is_highlight=false，highlight_type=普通片段。",
        "3. asr_rewrite 可以修正明显语序/标点，但不要强行改写专名。",
        "4. safe_interaction_title 和 safe_interaction_prompt 必须适合前端直接展示。",
        "5. 如果 name_uncertainty=true，互动文案不要直接使用具体姓氏、家族名或人名。"
      ].join("\n")
    }
  ];
}
