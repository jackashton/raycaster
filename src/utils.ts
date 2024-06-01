export const normalizeAngle = (theta: number) => {
  if (theta > 2 * Math.PI) theta -= 2 * Math.PI;
  if (theta < 0) theta += 2 * Math.PI;
  return theta;
};

export const rotate = (position: [number, number], angle: number) => {
  let [x, y] = position;
  x = x * Math.cos(angle);
  y = y * -Math.sin(angle);
  return [x, y];
};
