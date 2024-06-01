export const normalizeAngle = (theta: number) => {
  if (theta > 2 * Math.PI) theta -= 2 * Math.PI;
  if (theta < 0) theta += 2 * Math.PI;
  return theta;
};

export const normalize = (vector: [number, number]): [number, number] => {
  const [x, y] = vector;
  const magnitude = Math.sqrt(x * x + y * y);

  // Check for zero magnitude to avoid division by zero
  if (magnitude === 0) {
    throw new Error('Cannot normalize a zero vector');
  }

  return [x / magnitude, y / magnitude];
};
