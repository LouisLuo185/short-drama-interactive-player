export type WhisperXWord = {
  word?: string;
  start?: number;
  end?: number;
  score?: number;
};

export type WhisperXSegment = {
  start: number;
  end: number;
  text: string;
  words?: WhisperXWord[];
  avg_logprob?: number;
};

export type WhisperXOutput = {
  segments?: WhisperXSegment[];
  language?: string;
};

export type NormalizedAsrSegment = {
  segment_id: string;
  episode_id: string;
  start: number;
  end: number;
  duration_sec: number;
  raw_text: string;
  clean_text: string;
  asr_confidence: number | null;
  avg_logprob: number | null;
  word_count: number | null;
  source: "whisperx";
};

export type HighlightWindow = {
  window_id: string;
  episode_id: string;
  target_segment_id: string;
  start: number;
  end: number;
  context_start: number;
  context_end: number;
  previous_text: string;
  target_text: string;
  next_text: string;
  context_text: string;
  asr_confidence: number | null;
  name_uncertainty: boolean;
  recommended_task: "highlight_scoring";
  source: "whisperx_context_window";
};

export type HighlightCandidate = {
  window_id: string;
  episode_id: string;
  target_segment_id: string;
  start: number;
  end: number;
  is_highlight: boolean;
  highlight_type: string;
  highlight_score: number;
  plot_summary: string;
  asr_rewrite: string;
  trigger_text: string;
  trigger_time: number | null;
  safe_interaction_title: string;
  safe_interaction_prompt: string;
  emotion_tags: string[];
  name_uncertainty: boolean;
  reason: string;
  raw_model_output?: string;
};

export type PreprocessEpisodeResult = {
  episode_id: string;
  segment_count: number;
  window_count: number;
  duration_sec: number;
  segments_path: string;
  highlight_windows_path: string;
};
