import { useState, type ReactNode } from "react";
import { PlayerIcon } from "./PlayerIcon";

type PlayerManagementDrawerProps = {
  children: ReactNode;
};

export function PlayerManagementDrawer(props: PlayerManagementDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-5 rounded-[1.5rem] border border-amber-200/10 bg-amber-50/[0.035] p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left text-amber-50"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
      >
        <span>
          <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-amber-200/70">
            <PlayerIcon name="sliders" className="h-4 w-4" />
            Tools
          </span>
          <span className="mt-1 block text-sm text-amber-50/50">
            Highlights review and danmaku import are kept outside the watching surface.
          </span>
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-200/15 bg-black/30 text-amber-100">
          <PlayerIcon
            name={isOpen ? "chevron-left" : "chevron-right"}
            className={`h-4 w-4 transition ${isOpen ? "rotate-90" : ""}`}
          />
        </span>
      </button>

      {isOpen ? <div className="mt-4 space-y-4">{props.children}</div> : null}
    </section>
  );
}
