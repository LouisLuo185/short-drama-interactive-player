import type { InteractionPluginContext } from "../../types/interaction";
import type { TimelineEvent } from "../../types/timeline";
import { interactionPluginRegistry } from "../../features/interactions/interactionRegistry";

type InteractionOverlayLayerProps = {
  visibleEvent: TimelineEvent | null;
  context: InteractionPluginContext | null;
};

export function InteractionOverlayLayer(props: InteractionOverlayLayerProps) {
  if (!props.visibleEvent || !props.context) {
    return null;
  }

  const plugin =
    interactionPluginRegistry[props.visibleEvent.interactionType] ?? interactionPluginRegistry.none;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto">{plugin.render(props.visibleEvent, props.context)}</div>
    </div>
  );
}
