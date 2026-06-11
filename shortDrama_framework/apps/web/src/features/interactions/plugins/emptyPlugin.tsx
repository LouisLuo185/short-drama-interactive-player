import type { InteractionPlugin } from "../../../types/interaction";

export const emptyPlugin: InteractionPlugin = {
  type: "none",
  render: () => null
};
