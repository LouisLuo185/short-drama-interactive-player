export type VideoAnchorPoint = {
  x: number;
  y: number;
};

type VideoContentRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function getVideoTopRightAnchor(input: {
  videoElement: HTMLVideoElement | null;
  playerElement: HTMLElement | null;
  anchor?: "video_top_right" | "video_right_middle";
  offsetX?: number;
  offsetY?: number;
}): VideoAnchorPoint {
  const anchor = input.anchor ?? "video_top_right";
  const offsetX = input.offsetX ?? 38;
  const offsetY = input.offsetY ?? 54;
  const playerRect = input.playerElement?.getBoundingClientRect();

  if (!input.videoElement || !playerRect) {
    return { x: 0, y: 0 };
  }

  const contentRect = getObjectContainContentRect(input.videoElement);
  const safeX = contentRect.right - playerRect.left - offsetX;
  const safeY =
    anchor === "video_right_middle"
      ? contentRect.top - playerRect.top + contentRect.height / 2 + offsetY
      : contentRect.top - playerRect.top + offsetY;

  return clampToPlayer({
    x: safeX,
    y: safeY,
    playerWidth: playerRect.width,
    playerHeight: playerRect.height
  });
}

function getObjectContainContentRect(videoElement: HTMLVideoElement): VideoContentRect {
  const rect = videoElement.getBoundingClientRect();
  const intrinsicWidth = videoElement.videoWidth || rect.width;
  const intrinsicHeight = videoElement.videoHeight || rect.height;
  const intrinsicRatio = intrinsicWidth / Math.max(1, intrinsicHeight);
  const elementRatio = rect.width / Math.max(1, rect.height);

  if (!Number.isFinite(intrinsicRatio) || intrinsicRatio <= 0) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  if (elementRatio > intrinsicRatio) {
    const contentHeight = rect.height;
    const contentWidth = contentHeight * intrinsicRatio;
    const left = rect.left + (rect.width - contentWidth) / 2;
    return {
      left,
      top: rect.top,
      right: left + contentWidth,
      bottom: rect.bottom,
      width: contentWidth,
      height: contentHeight
    };
  }

  const contentWidth = rect.width;
  const contentHeight = contentWidth / intrinsicRatio;
  const top = rect.top + (rect.height - contentHeight) / 2;
  return {
    left: rect.left,
    top,
    right: rect.right,
    bottom: top + contentHeight,
    width: contentWidth,
    height: contentHeight
  };
}

function clampToPlayer(input: {
  x: number;
  y: number;
  playerWidth: number;
  playerHeight: number;
}) {
  const padding = 28;
  return {
    x: clamp(input.x, padding, Math.max(padding, input.playerWidth - padding)),
    y: clamp(input.y, padding, Math.max(padding, input.playerHeight - padding))
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
