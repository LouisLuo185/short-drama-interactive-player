export type RawDanmuRow = {
  dramaTitle: string;
  groupTitle: string;
  rawTime: number;
  likeCount?: number;
  text: string;
};

export type DanmuItem = {
  id: string;
  dramaTitle: string;
  episodeNo: number;
  timeSec: number;
  text: string;
  likeCount?: number;
  color?: string;
};

export type ParsedDanmuResult = {
  allItems: DanmuItem[];
  invalidCount: number;
  skippedReasonCounts: {
    missingDramaTitle: number;
    invalidEpisodeNo: number;
    invalidTime: number;
    emptyText: number;
    outOfDuration: number;
  };
};

export type DanmuImportStatus = "idle" | "success" | "error";
