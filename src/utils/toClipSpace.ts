export const canvasToClipSpace = (canvasWidth: number, canvasHeight: number, x: number, y: number): [number, number] => {
  const clipX = 2 * (x / canvasWidth) - 1;
  const clipY = 1 - 2 * (y / canvasHeight);
  return [clipX, clipY];
};
