import { readFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** The photo's bytes: from public/ for the bundled stand-ins and dev uploads, over HTTP for the Blob store. */
export async function readPhoto(src: string): Promise<Buffer> {
  if (src.startsWith("/")) {
    const file = path.join(PUBLIC_DIR, src);
    if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new Error("Not a public file");
    return readFile(file);
  }
  const res = await fetch(src, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Photo answered ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
