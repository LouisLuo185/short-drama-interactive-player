import type { InteractionPlugin } from "../../types/interaction";
import type { InteractionType } from "../../types/timeline";
import { emptyPlugin } from "./plugins/emptyPlugin";
import { emojiBurstPlugin } from "./plugins/emojiBurstPlugin";
import { reactionVotePlugin } from "./plugins/reactionVotePlugin";

export const interactionPluginRegistry: Record<InteractionType, InteractionPlugin> = {
  emoji_burst: emojiBurstPlugin,
  reaction_vote: reactionVotePlugin,
  none: emptyPlugin,
  comment_prompt: emptyPlugin,
  branch_choice: emptyPlugin
};
