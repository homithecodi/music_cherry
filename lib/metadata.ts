import { cleanText, decodeText, stripHtml } from "./format";

type Bytes = Uint8Array<ArrayBuffer>;

export type AudioMetadata = {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  picture?: Blob;
  pictureMime?: string;
};

function syncSafe(bytes: Bytes, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function uint32(bytes: Bytes, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function deunsynchronise(bytes: Bytes): Bytes {
  const out = new Uint8Array(bytes.length);
  let written = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    out[written] = bytes[i];
    written += 1;
    if (bytes[i] === 0xff && bytes[i + 1] === 0x00) i += 1;
  }
  return out.subarray(0, written);
}

function decodeTerminated(bytes: Bytes, start: number, encoding: number) {
  if (encoding === 1 || encoding === 2) {
    const wide = encoding === 1;
    for (let i = start; i + 1 < bytes.length; i += wide ? 2 : 1) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) {
        return { text: decodeText(bytes.subarray(start, i), encoding), next: i + 2 };
      }
    }
    return { text: decodeText(bytes.subarray(start), encoding), next: bytes.length };
  }

  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === 0) {
      return { text: decodeText(bytes.subarray(start, i), encoding), next: i + 1 };
    }
  }
  return { text: decodeText(bytes.subarray(start), encoding), next: bytes.length };
}

function parseTextFrame(body: Bytes): string {
  if (body.length < 2) return "";
  const encoding = body[0];
  return cleanText(decodeText(body.subarray(1), encoding).split("\0")[0]);
}

function parsePictureFrame(body: Bytes, legacy: boolean): AudioMetadata {
  if (body.length < 4) return {};
  const encoding = body[0];
  let cursor = 1;

  let mime: string;
  if (legacy) {
    mime = decodeText(body.subarray(cursor, cursor + 3), 0);
    cursor += 3;
  } else {
    const { text, next } = decodeTerminated(body, cursor, 0);
    mime = text || "image/jpeg";
    cursor = next;
  }

  cursor += 1;

  const { next } = decodeTerminated(body, cursor, encoding);
  cursor = next;

  if (cursor >= body.length) return {};
  const normalized = mime.toLowerCase().includes("png") ? "image/png" : "image/jpeg";
  return { picture: new Blob([body.slice(cursor)], { type: normalized }), pictureMime: normalized };
}

function parseId3v2(bytes: Bytes): AudioMetadata {
  const result: AudioMetadata = {};
  if (bytes.length < 10) return result;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return result;

  const major = bytes[3];
  const flags = bytes[5];
  const declared = syncSafe(bytes, 6);
  let body = bytes.subarray(10, 10 + declared);

  if (flags & 0x80) body = deunsynchronise(body);

  let cursor = 0;
  if (flags & 0x40) {
    if (major >= 4 && body.length >= 4) {
      cursor += syncSafe(body, 0);
    } else if (body.length >= 4) {
      cursor += 4 + uint32(body, 0);
    }
  }

  const legacy = major === 2;
  const idLength = legacy ? 3 : 4;
  const headerLength = legacy ? 6 : 10;

  while (cursor + headerLength <= body.length) {
    const id = String.fromCharCode(...body.subarray(cursor, cursor + idLength));
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;

    let size: number;
    if (legacy) {
      size =
        (body[cursor + 3] << 16) | (body[cursor + 4] << 8) | body[cursor + 5];
    } else if (major >= 4) {
      size = syncSafe(body, cursor + 4);
    } else {
      size = uint32(body, cursor + 4);
    }

    const start = cursor + headerLength;
    const end = start + size;
    if (size <= 0 || end > body.length) break;

    const frameBody = body.subarray(start, end);

    switch (id) {
      case "TIT2":
      case "TT2":
        result.title = parseTextFrame(frameBody);
        break;
      case "TPE1":
      case "TP1":
        result.artist = parseTextFrame(frameBody);
        break;
      case "TALB":
      case "TAL":
        result.album = parseTextFrame(frameBody);
        break;
      case "TDRC":
      case "TYER":
      case "TYE":
        result.year = parseTextFrame(frameBody).slice(0, 4);
        break;
      case "APIC":
      case "PIC": {
        const picture = parsePictureFrame(frameBody, legacy);
        if (picture.picture) {
          result.picture = picture.picture;
          result.pictureMime = picture.pictureMime;
        }
        break;
      }
      default:
        break;
    }

    cursor = end;
  }

  return result;
}

function parseId3v1(bytes: Bytes): AudioMetadata {
  if (bytes.length < 128) return {};
  const offset = bytes.length - 128;
  if (bytes[offset] !== 0x54 || bytes[offset + 1] !== 0x41 || bytes[offset + 2] !== 0x47) {
    return {};
  }

  const read = (start: number, length: number) => {
    const slice = bytes.subarray(offset + start, offset + start + length);
    let end = slice.length;
    while (end > 0 && (slice[end - 1] === 0 || slice[end - 1] === 0x20)) end -= 1;
    return decodeText(slice.subarray(0, end), 0);
  };

  const result: AudioMetadata = {};
  const title = read(3, 30);
  const artist = read(33, 30);
  const album = read(63, 30);
  const year = read(93, 4);
  if (title) result.title = title;
  if (artist) result.artist = artist;
  if (album) result.album = album;
  if (/^\d{4}$/.test(year)) result.year = year;
  return result;
}

function findAtom(bytes: Bytes, path: string[], start = 0, end = bytes.length): boolean {
  const [name, ...rest] = path;
  let cursor = start;
  while (cursor + 8 <= end) {
    let size = uint32(bytes, cursor);
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    let headerSize = 8;
    if (size === 1 && cursor + 16 <= end) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + cursor + 8, 8);
      size = Number(view.getBigUint64(0));
      headerSize = 16;
    }
    if (size === 0) size = end - cursor;
    if (size < headerSize) return false;
    if (type === name) {
      return rest.length === 0 || findAtom(bytes, rest, cursor + headerSize, cursor + size);
    }
    cursor += size;
  }
  return false;
}

function readAtomRange(bytes: Bytes, path: string[]): { start: number; end: number } | null {
  const [name, ...rest] = path;
  let cursor = 0;
  const end = bytes.length;
  while (cursor + 8 <= end) {
    let size = uint32(bytes, cursor);
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    let headerSize = 8;
    if (size === 1 && cursor + 16 <= end) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + cursor + 8, 8);
      size = Number(view.getBigUint64(0));
      headerSize = 16;
    }
    if (size === 0) size = end - cursor;
    if (size < headerSize) return null;
    if (type === name) {
      const start = cursor + headerSize;
      if (rest.length === 0) return { start, end: cursor + size };
      return readAtomRange(bytes.subarray(start, cursor + size), rest);
    }
    cursor += size;
  }
  return null;
}

type IlstItem = { text: string; picture?: Blob; pictureMime?: string };

function parseIlstItem(bytes: Bytes): IlstItem {
  const range = readAtomRange(bytes, ["data"]);
  if (!range) return { text: "" };
  const body = bytes.subarray(range.start, range.end);
  if (body.length < 8) return { text: "" };

  const flags = uint32(body, 4) & 0x00ffffff;
  const payload = body.subarray(8);

  if (flags === 13) {
    return { text: "", picture: new Blob([payload], { type: "image/jpeg" }), pictureMime: "image/jpeg" };
  }

  if (flags === 14) {
    const mime = decodeTerminated(payload, 0, 0).text || "image/jpeg";
    const normalized = mime.toLowerCase().includes("png") ? "image/png" : "image/jpeg";
    return { text: "", picture: new Blob([payload], { type: normalized }), pictureMime: normalized };
  }

  return { text: decodeText(payload, 0) };
}

function parseMp4(bytes: Bytes): AudioMetadata {
  const result: AudioMetadata = {};

  const ilst = readAtomRange(bytes, ["moov", "udta", "meta", "ilst"]);
  if (!ilst) return result;

  let cursor = ilst.start;
  while (cursor + 8 <= ilst.end) {
    const size = uint32(bytes, cursor);
    if (size < 8 || cursor + size > ilst.end) break;
    const name = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    const item = bytes.subarray(cursor + 8, cursor + size);

    if (name === "\xa9nam" || name === "trkn") {
      cursor += size;
      continue;
    }

    const parsed = parseIlstItem(item);
    const text = parsed.text;
    switch (name) {
      case "\xa9nam":
        if (text) result.title = cleanText(text);
        break;
      case "\xa9ART":
      case "aART":
        if (text) result.artist = cleanText(text);
        break;
      case "\xa9alb":
        if (text) result.album = cleanText(text);
        break;
      case "\xa9day":
        if (text) result.year = cleanText(text).slice(0, 4);
        break;
      case "covr":
        if (parsed.picture && !result.picture) {
          result.picture = parsed.picture;
          result.pictureMime = parsed.pictureMime;
        }
        break;
      default:
        break;
    }
    cursor += size;
  }

  return result;
}

function looksLikeFlac(bytes: Bytes): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x66 &&
    bytes[1] === 0x4c &&
    bytes[2] === 0x61 &&
    bytes[3] === 0x43
  );
}

function parseVorbisComment(bytes: Bytes): AudioMetadata {
  const result: AudioMetadata = {};
  let cursor = 4;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (cursor + 4 > bytes.length) return result;

  const readLength = () => {
    let len = 0;
    for (let i = 0; i < 4; i += 1) {
      len |= view.getUint8(cursor) << (i * 8);
      cursor += 1;
      if (cursor > bytes.length) return -1;
    }
    return len >>> 0;
  };

  const vendorLength = readLength();
  if (vendorLength < 0) return result;
  cursor += vendorLength;

  if (cursor + 4 > bytes.length) return result;
  const count = readLength();
  if (count < 0) return result;

  for (let i = 0; i < count; i += 1) {
    const length = readLength();
    if (length < 0 || cursor + length > bytes.length) break;
    const entry = decodeText(bytes.subarray(cursor, cursor + length), 0);
    cursor += length;
    const split = entry.indexOf("=");
    if (split < 0) continue;
    const key = entry.slice(0, split).toUpperCase();
    const value = cleanText(entry.slice(split + 1));
    if (!value) continue;
    if (key === "TITLE") result.title = value;
    else if (key === "ARTIST") result.artist = value;
    else if (key === "ALBUM") result.album = value;
    else if (key === "DATE" || key === "YEAR") result.year = value.slice(0, 4);
    else if (key === "METADATA_BLOCK_PICTURE" && !result.picture) {
      try {
        const decoded = atob(value);
        const raw = new Uint8Array(decoded.length);
        for (let j = 0; j < decoded.length; j += 1) raw[j] = decoded.charCodeAt(j);
        const picture = parsePictureFrame(raw, false);
        if (picture.picture) {
          result.picture = picture.picture;
          result.pictureMime = picture.pictureMime;
        }
      } catch {
        /* malformed base64 picture block */
      }
    }
  }

  return result;
}

export function metadataFromFilename(name: string): AudioMetadata {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_/g, " ").trim();
  const result: AudioMetadata = {};

  const split = base.match(/^(.{1,60}?)\s+[-–—]\s+(.+)$/);
  if (split) {
    result.artist = split[1].trim();
    result.title = split[2].trim();
  } else {
    result.title = base;
  }

  const year = base.match(/\b(19|20)\d{2}\b/);
  if (year) result.year = year[0];

  return result;
}

export async function readMetadata(file: Blob, fileName: string): Promise<AudioMetadata> {
  let result: AudioMetadata = {};

  try {
    const head = new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer());

    if (head.length >= 10 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      result = parseId3v2(head);
    } else if (looksLikeFlac(head)) {
      result = parseVorbisComment(head);
    } else if (findAtom(head, ["moov", "udta", "meta", "ilst"]) || findAtom(head, ["moov", "udta", "meta"])) {
      result = parseMp4(head);
    }

    if (file.size > 512 * 1024 && !result.picture) {
      const tail = new Uint8Array(await file.slice(file.size - 128).arrayBuffer());
      const v1 = parseId3v1(tail);
      result = {
        title: result.title ?? v1.title,
        artist: result.artist ?? v1.artist,
        album: result.album ?? v1.album,
        year: result.year ?? v1.year,
        picture: result.picture,
        pictureMime: result.pictureMime,
      };
    }
  } catch {
    result = {};
  }

  const fallback = metadataFromFilename(fileName);

  return {
    title: stripHtml(result.title ?? "") || fallback.title,
    artist: stripHtml(result.artist ?? "") || fallback.artist,
    album: result.album ? stripHtml(result.album) : fallback.album,
    year: result.year,
    picture: result.picture,
    pictureMime: result.pictureMime,
  };
}