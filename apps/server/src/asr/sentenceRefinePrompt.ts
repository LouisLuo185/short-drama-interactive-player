import type { ChatMessage } from "../llm/doubaoClient.js";
import type { WhisperXSegment } from "./types.js";

export function buildSentenceRefineMessages(params: {
  episodeId: string;
  sourceSegmentId: string;
  segment: WhisperXSegment;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是一个中文短剧 ASR 字幕修正与自然断句助手。",
        "你的任务是根据 WhisperX 识别出的中文 ASR 文本，修正明显错字、补充中文标点，并按照自然语义切分成句子。",
        "你只负责文本层面的修正和断句，不负责生成时间戳。",
        "重要规则：",
        "1. 不要改变剧情含义。",
        "2. 不要扩写剧情。",
        "3. 不要添加原文没有的人物、动作或信息。",
        "4. 可以修正明显的 ASR 错字，但不确定的人名、地名、专有名词不要强行改。",
        "5. 遇到疑问、感叹、称呼变化、话轮变化、剧情动作变化时，可以断句。",
        "6. 关键高光台词必须尽量保持完整，不要拆碎。",
        "7. 输出必须是合法 JSON。",
        "8. 不要输出 Markdown。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请对下面 WhisperX ASR 文本进行中文标点修正和自然断句。",
        "",
        "输入信息：",
        `episode_id: ${params.episodeId}`,
        `source_segment_id: ${params.sourceSegmentId}`,
        `start: ${params.segment.start}`,
        `end: ${params.segment.end}`,
        "",
        "原始 ASR 文本：",
        params.segment.text,
        "",
        "请输出 JSON，格式如下：",
        JSON.stringify(
          {
            episode_id: params.episodeId,
            source_segment_id: params.sourceSegmentId,
            sentences: [
              {
                text: "修正并断句后的自然句",
                role: "dialogue/narration/unknown",
                sentence_type: "statement/question/exclamation/turning_point/action/unknown",
                is_potential_trigger: true
              }
            ]
          },
          null,
          2
        ),
        "",
        "断句要求：",
        "1. 每个 sentence.text 应该是自然完整的一句话。",
        "2. 不要输出 start/end 时间。",
        "3. 不要把关键反转台词拆碎。",
        "4. 如果遇到多个人物连续说话，应尽量拆成多句。",
        "5. 如果 ASR 文本明显缺少标点，请补充中文标点。",
        "6. 如果某句可能是反转、冲突、喜剧、悬念、告白、亲情等高光触发句，请设置 is_potential_trigger=true。"
      ].join("\n")
    }
  ];
}
