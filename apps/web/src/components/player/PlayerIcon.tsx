type PlayerIconName =
  | "chevron-left"
  | "chevron-right"
  | "play"
  | "pause"
  | "sparkles"
  | "sparkles-off"
  | "volume"
  | "muted"
  | "maximize"
  | "minimize"
  | "sliders";

type PlayerIconProps = {
  name: PlayerIconName;
  className?: string;
};

export function PlayerIcon(props: PlayerIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={props.className ?? "h-5 w-5"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {renderIcon(props.name)}
    </svg>
  );
}

function renderIcon(name: PlayerIconName) {
  switch (name) {
    case "chevron-left":
      return <path d="m15 18-6-6 6-6" />;
    case "chevron-right":
      return <path d="m9 18 6-6-6-6" />;
    case "play":
      return <path d="M8 5v14l11-7Z" fill="currentColor" stroke="none" />;
    case "pause":
      return (
        <>
          <path d="M8 5v14" />
          <path d="M16 5v14" />
        </>
      );
    case "sparkles":
      return (
        <>
          <path d="m12 3 1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8Z" />
          <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z" />
          <path d="m19 14 .7 1.8L22 17l-2.3.8L19 20l-.7-2.2L16 17l2.3-1.2Z" />
        </>
      );
    case "sparkles-off":
      return (
        <>
          <path d="m3 3 18 18" />
          <path d="m12 3 1.6 4.2L18 9l-3.1 1.3" />
          <path d="M10.4 10.8 12 15l1.1-3" />
          <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z" />
        </>
      );
    case "volume":
      return (
        <>
          <path d="M4 9v6h4l5 4V5L8 9Z" />
          <path d="M16 9.5a4 4 0 0 1 0 5" />
          <path d="M19 7a8 8 0 0 1 0 10" />
        </>
      );
    case "muted":
      return (
        <>
          <path d="M4 9v6h4l5 4V5L8 9Z" />
          <path d="m17 9 5 5" />
          <path d="m22 9-5 5" />
        </>
      );
    case "maximize":
      return (
        <>
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M21 16v5h-5" />
          <path d="M8 21H3v-5" />
        </>
      );
    case "minimize":
      return (
        <>
          <path d="M8 3v5H3" />
          <path d="M16 3v5h5" />
          <path d="M21 16h-5v5" />
          <path d="M3 16h5v5" />
        </>
      );
    case "sliders":
      return (
        <>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </>
      );
  }
}
