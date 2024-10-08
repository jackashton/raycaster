const parseHeaderAttributes = (headerLines: string[]) => {
  const [format, width, height, maxColorValue] = headerLines;

  if (maxColorValue !== '255') {
    throw new Error('Only 8-bit color depth (max value 255) is supported.');
  }

  return { format, width: parseInt(width), height: parseInt(height) };
};

export const parsePPMP6 = (data: Uint8Array) => {
  const header = new TextDecoder().decode(data.subarray(0, 20));
  const headerLines = header.split(/\s+/);
  const { format, width, height } = parseHeaderAttributes(headerLines);

  if (format !== 'P6') {
    throw new Error('Unsupported PPM format: ' + format);
  }

  const values = new Uint8Array(width * height * 3);
  const headerLength = header.indexOf('255') + 4;

  for (let i = headerLength; i < data.length; i += 3) {
    const ri = i,
      gi = i + 1,
      bi = i + 2;
    values[ri - headerLength] = data[ri];
    values[gi - headerLength] = data[gi];
    values[bi - headerLength] = data[bi];
  }

  return { width, height, values };
};

export const parsePPMP3 = (data: Uint8Array) => {
  const header = new TextDecoder().decode(data);
  const headerLines = header.split(/\s+/);
  const { format, width, height } = parseHeaderAttributes(headerLines);

  if (format !== 'P3') {
    throw new Error('Unsupported PPM format: ' + format);
  }

  const pixelData = headerLines.slice(4).join('\n');
  const values = new Uint8Array(width * height * 3);
  const parsedValues = pixelData.split(/\s+/).map(Number);

  if (parsedValues.length !== width * height * 3) {
    throw new Error('Pixel data does not match expected size.');
  }

  values.set(parsedValues);

  return { width, height, values };
};

const parsePPM = (data: Uint8Array) => {
  const header = new TextDecoder().decode(data.subarray(0, 20));
  const format = header.split(/\s+/)[0];

  if (format === 'P6') {
    return parsePPMP6(data);
  } else if (format === 'P3') {
    return parsePPMP3(data);
  } else {
    throw new Error('Unsupported PPM format: ' + format);
  }
};

export default parsePPM;
