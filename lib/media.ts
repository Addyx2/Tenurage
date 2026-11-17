// Property photos and video tours are links (https) to where the agency
// already keeps them: their website, Reapit, or a file host. Tenurage shows
// them; it doesn't store the files.

const MAX_PHOTOS = 20;

function httpsUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** One photo link per line (or comma separated). Returns the clean list, or the first bad line. */
export function parsePhotoUrls(raw: string): { photos: string[] } | { error: string } {
  const photos: string[] = [];
  for (const line of raw.split(/[\n,]/).map((l) => l.trim()).filter(Boolean)) {
    const url = httpsUrl(line);
    if (!url) return { error: `"${line.slice(0, 60)}" isn't an https link to a photo` };
    if (!photos.includes(url)) photos.push(url);
  }
  if (photos.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos` };
  return { photos };
}

/** A video tour: an https link to a video file browsers can play (.mp4, .webm, .mov). Empty clears it. */
export function parseVideoUrl(raw: string): { videoUrl: string | null } | { error: string } {
  if (!raw.trim()) return { videoUrl: null };
  const url = httpsUrl(raw);
  if (!url || !/\.(mp4|webm|mov|m4v)$/i.test(new URL(url).pathname)) {
    return { error: "Link straight to the video file (an https link ending .mp4, .webm or .mov)" };
  }
  return { videoUrl: url };
}

/** A map link for directions to a property. */
export function directionsUrl(address: string, postcode: string): string {
  const where = address.toUpperCase().includes(postcode.toUpperCase()) ? address : `${address}, ${postcode}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}`;
}
