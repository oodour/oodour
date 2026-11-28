// The name Git for Windows opens for the bytes of a path: UTF-8 where the bytes are valid UTF-8 (a lone surrogate
// included), an invalid byte from 0xA0 up as the character with that code, and a lower one as its two hex digits.
export function gitText(bytes: Uint8Array): string {
  let text = '';
  let at = 0;

  while (at < bytes.length) {
    const [character, length] = characterAt(bytes.subarray(at));
    text += character;
    at += length;
  }

  return text;
}

const tail = (byte: number | undefined): number | undefined =>
  byte !== undefined && (byte & 0xc0) === 0x80 ? byte & 0x3f : undefined;

function characterAt(bytes: Uint8Array): readonly [string, number] {
  // Stryker disable next-line LzJsNumericLiteral: gitText passes one byte or more, and 1 and -1 are no more a continuation byte than 0 is
  const [lead = 0, second = 0, third, fourth] = bytes;
  const [b, c, d] = [tail(second), tail(third), tail(fourth)];

  if (lead < 0x80) {
    return [String.fromCharCode(lead), 1];
  }

  const byItself = [lead >= 0xa0 ? String.fromCharCode(lead) : lead.toString(16), 1] as const;

  if (lead < 0xc2 || b === undefined) {
    return byItself;
  }

  if (lead < 0xe0) {
    return [String.fromCharCode(((lead & 0x1f) << 6) | b), 2];
  }

  if (c === undefined || (lead === 0xe0 && second < 0xa0)) {
    return byItself;
  }

  if (lead < 0xf0) {
    return [String.fromCharCode(((lead & 0x0f) << 12) | (b << 6) | c), 3];
  }

  if (d === undefined || lead >= 0xf5 || (lead === 0xf0 && second < 0x90) || (lead === 0xf4 && second >= 0x90)) {
    return byItself;
  }

  return [String.fromCodePoint(((lead & 0x07) << 18) | (b << 12) | (c << 6) | d), 4];
}
