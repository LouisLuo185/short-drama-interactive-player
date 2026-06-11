export type DramaCard = {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  tags: string[];
  episodeCount: number;
};

export type DramaDetail = {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  tags: string[];
  episodes: EpisodeBrief[];
};

export type EpisodeBrief = {
  id: string;
  dramaId: string;
  episodeNo: number;
  title: string;
  durationSec: number;
  coverUrl?: string;
};
