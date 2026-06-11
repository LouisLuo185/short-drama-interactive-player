import type { ReactNode } from "react";
import type { PlayerController } from "./player";
import type { InteractionType, TimelineEvent } from "./timeline";

export type InteractionReportEvent = {
  episodeId: string;
  highlightId?: string;
  timelineEventId: string;
  interactionType: InteractionType;
  action: string;
  payload?: Record<string, unknown>;
  currentTimeSec: number;
  clientTs: number;
};

export type InteractionPluginContext = {
  player: PlayerController;
  episodeId: string;
  currentTimeSec: number;
  hasSubmittedAction: (timelineEventId: string) => boolean;
  markActionSubmitted: (timelineEventId: string) => void;
  reportInteractionEvent: (event: InteractionReportEvent) => Promise<void>;
};

export type InteractionPlugin = {
  type: InteractionType;
  render: (timelineEvent: TimelineEvent, context: InteractionPluginContext) => ReactNode;
};
