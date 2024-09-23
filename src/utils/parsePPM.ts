export const fetchPPMData = async (ppmPath: string): Promise<Uint8Array | null> => {
  const response = await fetch(ppmPath);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

export const parsePPMP6 = (data: Uint8Array) => {
  // Find the header, which is ASCII
  const header = new TextDecoder().decode(data.slice(0, 20)); // Read first part of the file
  const headerLines = header.split(/\s+/);

  const format = headerLines[0];
  if (format !== 'P6') {
    throw new Error('Unsupported PPM format: ' + format);
  }

  // Extract width, height, and max color value
  const width = parseInt(headerLines[1]);
  const height = parseInt(headerLines[2]);
  const maxColorValue = parseInt(headerLines[3]);

  if (maxColorValue !== 255) {
    throw new Error('Only 8-bit color depth (max value 255) is supported.');
  }

  // The pixel data starts after the header and maxColorValue line (use length of the header)
  const headerLength = header.indexOf('255') + 4; // Skip past "255\n"

  const values = [];
  for (let i = headerLength, length = data.length; i < length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    values.push(r, g, b);
  }

  return { width, height, values };
};
