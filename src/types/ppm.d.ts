import { PPMImage } from 'ppm-parser';

declare module '*.ppm' {
  const value: PPMImage;
  export default value;
}
