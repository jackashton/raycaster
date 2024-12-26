declare module '*.ppm' {
  interface PPMData {
    values: Uint8Array;
    width: number;
    height: number;
  }

  const value: PPMData;
  export default value;
}
