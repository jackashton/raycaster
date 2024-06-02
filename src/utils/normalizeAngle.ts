const normalizeAngle = (theta: number) => {
  if (theta > 2 * Math.PI) theta -= 2 * Math.PI;
  if (theta < 0) theta += 2 * Math.PI;
  return theta;
};

export default normalizeAngle;
