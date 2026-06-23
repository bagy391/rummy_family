/**
 * Cleans double-encoded UTF-8 strings (mojibake) that might occur
 * due to encoding mismatches between Supabase, databases, and client devices.
 */
export function decodeCleanUTF8(str: string | null | undefined): string {
  if (!str) return "";
  try {
    const bytes = new Uint8Array(
      str.split("").map((c) => {
        const code = c.charCodeAt(0);
        // Map Windows-1252/Unicode mapping back to actual byte value
        const unicodeToByte: Record<number, number> = {
          8364: 0x80, // €
          8218: 0x82, // ‚
          402:  0x83, // ƒ
          8222: 0x84, // „
          8230: 0x85, // …
          8224: 0x86, // †
          8225: 0x87, // ‡
          710:  0x88, // ˆ
          8240: 0x89, // ‰
          352:  0x8a, // Š
          8249: 0x8b, // ‹
          338:  0x8c, // Œ
          381:  0x8e, // Ž
          8216: 0x91, // ‘
          8217: 0x92, // ’
          8220: 0x93, // “
          8221: 0x94, // ”
          8226: 0x95, // •
          8211: 0x96, // –
          8212: 0x97, // —
          732:  0x98, // ˜
          8482: 0x99, // ™
          353:  0x9a, // š
          8250: 0x9b, // ›
          339:  0x9c, // œ
          382:  0x9e, // ž
          376:  0x9f, // Ÿ
        };
        return unicodeToByte[code] || (code & 0xff);
      })
    );
    return new TextDecoder("utf-8").decode(bytes);
  } catch (e) {
    return str;
  }
}
