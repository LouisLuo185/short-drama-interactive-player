export type ImportHighlightInput = {
  type?: string;
  startTimeSec: number;
  peakTimeSec?: number;
  endTimeSec: number;
  highlightType?: string;
  confidence?: number;
  title: string;
  description?: string;
  interactionType: string;
  interactionPayload?: Record<string, unknown>;
  priority?: number;
  showOnce?: boolean;
  actionOnce?: boolean;
};

export type ImportEpisodeInput = {
  episodeNo: number;
  title: string;
  videoUrl: string;
  coverUrl?: string;
  durationSec: number;
  highlights?: ImportHighlightInput[];
};

export type ImportDramaInput = {
  title: string;
  description?: string;
  tags?: string[];
  coverUrl: string;
  episodes: ImportEpisodeInput[];
};

export type ImportDramaResult = {
  dramaId: string;
  episodeIds: string[];
  highlightIds: string[];
};
