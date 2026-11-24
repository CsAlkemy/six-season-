import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { isAdmin } from "@/lib/auth";
import { putFile, uploadMode } from "@/lib/blob";
import { MAX_VIDEO_BYTES, MAX_VIDEO_MB, VIDEO_TYPES } from "@/lib/testimonials";

/**
 * Videos for the home page's customer feedback (components/admin/video-upload.ts). A video is far bigger than a server
 * action takes (4 MB, next.config.ts), so with a Blob store the browser sends it straight there: this only hands it a
 * one-time token for one video in the home folder. In development without a store it takes the file itself and keeps
 * it in public/local-uploads, like the photos. GET says which of the two to use. Admins only.
 */

const denied = () => Response.json({ error: "Sign in to the admin again." }, { status: 401 });

export async function GET() {
  if (!(await isAdmin())) return denied();
  return Response.json({ mode: uploadMode() });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return denied();
  const mode = uploadMode();

  if (mode === "blob") {
    try {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          if (!/^home\/video\.(mp4|webm|mov)$/.test(pathname)) throw new Error("Videos go in the home folder.");
          return { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: true };
        },
      });
      return Response.json(result);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Couldn't upload." }, { status: 400 });
    }
  }

  if (mode === "local") {
    const file = (await request.formData().catch(() => null))?.get("file");
    if (!(file instanceof File) || !VIDEO_TYPES.includes(file.type) || file.size > MAX_VIDEO_BYTES) {
      return Response.json({ error: `Upload an MP4, MOV or WebM video under ${MAX_VIDEO_MB} MB.` }, { status: 400 });
    }
    return Response.json({ url: await putFile("home", file) });
  }

  return Response.json({ error: "Connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to upload videos." }, { status: 503 });
}
