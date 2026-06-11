import type { ChatMessage } from "../llm/doubaoClient.js";
import type { RefinedSentence } from "../asr/types.js";

export type EpisodeStoryInput = {
  episode_id: string;
  episode_no: number;
  sentences: Pick<RefinedSentence, "sentence_id" | "start" | "end" | "text" | "sentence_type">[];
  danmaku_story_context?: unknown;
};

export function buildStoryContextMessages(params: {
  dramaSlug: string;
  episodes: EpisodeStoryInput[];
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "你是短剧剧情全局理解助手。",
        "你会收到多集经过语义断句的台词时间轴。你的任务不是打高光点，而是生成后续高光识别可复用的全局剧情上下文。",
        "重点：",
        "1. 区分主角、配角、反派、被打脸者、施压者、救场者。",
        "2. 不要因为某一集某个角色说话多，就把 TA 判为主角。",
        "3. 如果角色姓名不确定，使用 role=unknown，并在 notes 里说明不确定。",
        "4. ASR 可能有同音字错误，请记录 common_asr_mistakes，但不要过度纠错。",
        "5. 输出必须是合法 JSON，不要 Markdown。",
        "6. 不要编造台词中没有依据的人名、身份和关系。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `drama_slug: ${params.dramaSlug}`,
        "",
        "输入 episodes：",
        JSON.stringify(params.episodes, null, 2),
        "",
        "请输出 JSON，格式如下：",
        JSON.stringify(
          {
            drama_context: {
              drama_slug: params.dramaSlug,
              title: "",
              main_plot: "",
              core_conflicts: [],
              global_notes: []
            },
            character_map: {
              characters: [
                {
                  canonical_name: "",
                  aliases: [],
                  role: "protagonist | antagonist | supporting | unknown",
                  identity: "",
                  relationship_to_protagonist: "",
                  common_asr_mistakes: [],
                  notes: []
                }
              ]
            },
            episode_summaries: {
              episodes: [
                {
                  episode_id: "ep_001",
                  episode_no: 1,
                  summary: "",
                  character_changes: [],
                  important_reveals: [],
                  open_questions: []
                }
              ]
            },
            danmaku_signals: {
              episodes: []
            }
          },
          null,
          2
        ),
        "",
        "额外要求：",
        "1. main_plot 用 1-3 句话概括主线。",
        "2. character_map 中如果无法确认主角，不要硬写 protagonist。",
        "3. episode_summaries 只总结输入中出现的集数。",
        "4. important_reveals 重点记录身份反转、关系变化、玉佩/信物/关键设定、反派行为。",
        "5. danmaku_signals 目前可以输出空 episodes，后续会由弹幕分析模块补充。"
      ].join("\n")
    }
  ];
}
