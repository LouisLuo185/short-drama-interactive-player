export type ArcPosition = {
  x: number;
  y: number;
  angleDeg: number;
};

export function getArcPositions(
  count: number,
  radius: number,
  startDeg = 180,
  endDeg = 90
): ArcPosition[] {
  if (count <= 0) return [];

  if (count === 1) {
    return [{ x: -radius, y: 0, angleDeg: 180 }];
  }

  return Array.from({ length: count }).map((_, index) => {
    const ratio = index / (count - 1);
    const angleDeg = startDeg + (endDeg - startDeg) * ratio;
    const rad = (angleDeg * Math.PI) / 180;

    return {
      x: Math.cos(rad) * radius,
      y: Math.sin(rad) * radius,
      angleDeg
    };
  });
}

export function getNearestOptionIndex(input: {
  pointerX: number;
  pointerY: number;
  anchorX: number;
  anchorY: number;
  positions: ArcPosition[];
  hitTargetPx: number;
}) {
  let nearestIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  input.positions.forEach((position, index) => {
    const optionX = input.anchorX + position.x;
    const optionY = input.anchorY + position.y;
    const distance = Math.hypot(input.pointerX - optionX, input.pointerY - optionY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestDistance <= input.hitTargetPx ? nearestIndex : -1;
}
