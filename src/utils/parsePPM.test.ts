import { describe, it, expect } from 'vitest';
import parsePPM from './parsePPM';

/**
 * Sample P6 PPM binary data (5x5 pixels, all white)
 * P6
 * 8 8
 * 255
 * (binary)
 */
const sampleP6Data = new Uint8Array([
  80, 54, 10, 52, 32, 52, 10, 50, 53, 53, 10, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
]);

/**
 * Sample P3 PPM binary data (2x2 pixels, all black)
 * P3
 * 4 4
 * 255
 * 0 0 0 0 0 0 0 0 0 0 0 0
 */
const sampleP3Data = new Uint8Array([
  80, 51, 10, 50, 32, 50, 10, 50, 53, 53, 10, 48, 32, 48, 32, 48, 32, 48, 32, 48, 32, 48, 32, 48, 32, 48, 32, 48, 32,
  48, 32, 48, 32, 48,
]);

describe('PPM Parser', () => {
  it('should correctly parse P6 PPM format', () => {
    const result = parsePPM(sampleP6Data);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.values).toEqual(new Uint8Array(48).fill(255)); // 4x4 white pixels
  });

  it('should correctly parse P3 PPM format', () => {
    const result = parsePPM(sampleP3Data);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.values).toEqual(new Uint8Array(12).fill(0)); // 2x2 black pixels
  });

  it('should throw an error for unsupported PPM format', () => {
    const invalidData = new Uint8Array([80, 50, 10]); // Invalid format P2
    expect(() => parsePPM(invalidData)).toThrow('Unsupported PPM format: P2');
  });

  it('should throw an error for incorrect max color value in P6', () => {
    const invalidMaxColor = new Uint8Array(sampleP6Data);
    invalidMaxColor[9] = 52;

    expect(() => parsePPM(invalidMaxColor)).toThrow('Only 8-bit color depth (max value 255) is supported.');
  });

  it('should throw an error if pixel data does not match expected size in P3', () => {
    const invalidP3Data = sampleP3Data.slice(0, 17);
    expect(() => parsePPM(invalidP3Data)).toThrow('Pixel data does not match expected size.');
  });
});
