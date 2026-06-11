export type WhisperXWord = {
  word: string;
  start?: number;
  end?: number;
  score?: number;
};

export type WhisperXSegment = {
  id?: string | number;
  start: number;
  end: number;
  text: string;
  words?: WhisperXWord[];
};

export type WhisperXEpisode = {
  episodeId: string;
  dramaSlug: string;
  sourceJsonPath: string;
  sourceSrtPath?: string;
  segments: WhisperXSegment[];
};

export type RefinedSentenceDraft = {
  text: string;
  role?: "dialogue" | "narration" | "unknown";
  sentence_type?:
    | "statement"
    | "question"
    | "exclamation"
    | "turning_point"
    | "action"
    | "unknown";
  is_potential_trigger?: boolean;
};

export type RefinedSentence = {
  sentence_id: string;
  episode_id: string;
  source_segment_id: string;
  start: number;
  end: number;
  duration: number;
  text: string;
  raw_text: string;
  role: "dialogue" | "narration" | "unknown";
  sentence_type:
    | "statement"
    | "question"
    | "exclamation"
    | "turning_point"
    | "action"
    | "unknown";
  is_potential_trigger: boolean;
  alignment_status: "matched" | "fuzzy_matched" | "estimated" | "failed";
  time_source: "whisperx_word_timestamps" | "estimated_by_char_ratio";
};

export type RefinedSentencesFile = {
  schema_version: "1.0";
  episode_id: string;
  source: {
    asr_engine: "whisperX";
    time_source: "whisperx_word_timestamps" | "estimated_by_char_ratio";
  };
  sentences: RefinedSentence[];
};
