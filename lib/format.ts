export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    return `${hours}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function decodeText(bytes: Uint8Array, encoding: number): string {
  try {
    if (encoding === 0) return new TextDecoder("iso-8859-1").decode(bytes);
    if (encoding === 1) {
      if (bytes.length >= 2) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (view.getUint16(0) === 0xfeff) {
          return new TextDecoder("utf-16").decode(bytes.subarray(2));
        }
        if (view.getUint16(0) === 0xfffe) {
          return new TextDecoder("utf-16le").decode(bytes.subarray(2));
        }
      }
      return new TextDecoder("iso-8859-1").decode(bytes);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

export function cleanText(value: string): string {
  return value.replace(/\0+$/g, "").trim();
}

export function stripHtml(value: string): string {
  return cleanText(value.replace(/<[^>]*>/g, " "));
}