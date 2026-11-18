export function validYoutubeUrl(value: unknown) {
  if (value == null || value === "") return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(url.hostname);
  } catch { return false; }
}
