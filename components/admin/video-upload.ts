import { upload } from "@vercel/blob/client";

import { MAX_VIDEO_BYTES, MAX_VIDEO_MB, VIDEO_TYPES } from "@/lib/testimonials";

import { uploadPhoto } from "./image-upload";

/** app/api/admin/upload/route.ts */
const ENDPOINT = "/api/admin/upload";
const EXTENSION: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
/** Bigger than this goes up in parts, each retried on its own, so a weak connection doesn't start over. */
const MULTIPART_FROM = 20 * 1024 * 1024;

/**
 * A frame about a second in, as a JPEG for the cover, which also proves this browser can play the file. Resolves to
 * null when the browser plays it but won't hand over a frame in time (some phones); the video then shows its own.
 */
function grabFrame(file: File): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      settle();
    };
    const timer = setTimeout(() => finish(() => resolve(null)), 15_000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => finish(() => reject(new Error("This browser can't play that video. Save it as an MP4 and try again.")));
    video.onloadedmetadata = () => {
      if (!video.videoWidth) return finish(() => reject(new Error("That file has no picture. Choose a video.")));
      video.currentTime = Math.min(1, (video.duration || 0) / 4);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      try {
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch {
        return finish(() => resolve(null));
      }
      canvas.toBlob((blob) => finish(() => resolve(blob ? new File([blob], "cover.jpg", { type: "image/jpeg" }) : null)), "image/jpeg", 0.9);
    };
    video.src = url;
  });
}

/** Where the route sends uploads (a Blob store, or the dev folder), asked once per page. */
let mode: Promise<string> | null = null;
const uploadMode = () =>
  (mode ??= fetch(ENDPOINT)
    .then((res) => res.json() as Promise<{ mode?: string; error?: string }>)
    .then((body) => {
      if (!body.mode) throw new Error(body.error ?? "Couldn't upload.");
      return body.mode;
    })
    .catch((error) => {
      mode = null;
      throw error;
    }));

/** The development path: the file itself to the route, over XHR because fetch can't report how much has gone. */
function postToRoute(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { url?: string; error?: string };
        if (body.url) resolve(body.url);
        else reject(new Error(body.error ?? "Couldn't upload."));
      } catch {
        reject(new Error("Couldn't upload."));
      }
    };
    xhr.onerror = () => reject(new Error("Couldn't upload. Check the connection and try again."));
    const form = new FormData();
    form.set("file", file);
    xhr.send(form);
  });
}

/**
 * A customer's video for the home page: checked, its cover taken, then sent with its progress reported. With a Blob
 * store it goes straight there from the browser, past the 4 MB a server action takes. Resolves to the video's URL and
 * its cover's (null without one), or an error message.
 */
export async function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<{ video: string; poster: string | null } | { error: string }> {
  if (!VIDEO_TYPES.includes(file.type)) return { error: "Choose an MP4, MOV or WebM video." };
  if (file.size > MAX_VIDEO_BYTES) return { error: `That video is over ${MAX_VIDEO_MB} MB. Trim it, or send it at a lower quality.` };
  try {
    const cover = await grabFrame(file);
    const where = await uploadMode();
    if (where === "off") return { error: "Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to upload videos." };
    const video =
      where === "blob"
        ? (
            await upload(`home/video.${EXTENSION[file.type]}`, file, {
              access: "public",
              handleUploadUrl: ENDPOINT,
              contentType: file.type,
              multipart: file.size > MULTIPART_FROM,
              onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
            })
          ).url
        : await postToRoute(file, onProgress);
    const poster = cover ? await uploadPhoto(cover, "home", 1080) : null;
    return { video, poster: poster && "url" in poster ? poster.url : null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't upload." };
  }
}
