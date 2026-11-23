// The name Git for Windows opens for the bytes of a path: UTF-8 where the bytes are valid UTF-8 (a lone surrogate
// included), an invalid byte from 0xA0 up as the character with that code, and a lower one as its two hex digits.
export function gitText(bytes: Uint8Array): string {
  let text = '';
  let at = 0;

  while (at < bytes.length) {
    const [character, length] = characterAt(bytes.subarray(at, at + 4));
    text += character;
    at += length;
  }

  return text;
}

const tail = (byte: number | undefined): number | undefined =>
  byte !== undefined && (byte & 0xc0) === 0x80 ? byte & 0x3f : undefined;

function characterAt(bytes: Uint8Array): readonly [string, number] {
  const [lead = 0, second, third, fourth] = bytes;
  const [b, c, d] = [tail(second), tail(third), tail(fourth)];

  if (lead < 0x80) {
    return [String.fromCharCode(lead), 1];
  }

  if (lead >= 0xc2 && lead < 0xe0 && b !== undefined) {
    return [String.fromCharCode(((lead & 0x1f) << 6) | b), 2];
  }

  if (lead >= 0xe0 && lead < 0xf0 && !(lead === 0xe0 && (second ?? 0) < 0xa0) && b !== undefined && c !== undefined) {
    return [String.fromCharCode(((lead & 0x0f) << 12) | (b << 6) | c), 3];
  }

  const inRange = !(lead === 0xf0 && (second ?? 0) < 0x90) && !(lead === 0xf4 && (second ?? 0) >= 0x90);

  if (lead >= 0xf0 && lead < 0xf5 && inRange && b !== undefined && c !== undefined && d !== undefined) {
    return [String.fromCodePoint(((lead & 0x07) << 18) | (b << 12) | (c << 6) | d), 4];
  }

  return [lead >= 0xa0 ? String.fromCharCode(lead) : lead.toString(16), 1];
}
