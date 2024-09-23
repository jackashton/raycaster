export const toClipSpace = (width: number, height: number, x: number, y: number): [number, number] => [
  2 * (x / width) - 1,
  1 - 2 * (y / height),
];
