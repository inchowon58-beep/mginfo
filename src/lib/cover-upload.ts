import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { hasBlobStore } from "@/lib/blob-store";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg", "image/svg+xml"]);
const MAX_BYTES = 4 * 1024 * 1024;

export function assertCoverFile(file: File) {
  if (!ALLOWED.has(file.type)) {
    throw new Error("jpg, png, webp, gif, svg만 올릴 수 있습니다.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("이미지는 4MB 이하만 올릴 수 있습니다.");
  }
}

function safeFileName(name: string): string {
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".jpg";
  const base = path
    .basename(name, path.extname(name))
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${Date.now()}-${base || "cover"}${ext || ".jpg"}`;
}

export async function saveCoverFile(file: File): Promise<string> {
  assertCoverFile(file);
  const filename = safeFileName(file.name);
  const pathname = `covers/${filename}`;

  if (hasBlobStore()) {
    const body = Buffer.from(await file.arrayBuffer());
    try {
      const blob = await put(pathname, body, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type || "image/jpeg",
      });
      return blob.url;
    } catch {
      await put(pathname, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: file.type || "image/jpeg",
      });
      return `/api/media/${pathname}`;
    }
  }

  if (process.env.VERCEL) {
    throw new Error("이미지를 올리려면 Vercel Blob이 연결되어 있어야 합니다.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", "covers");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/covers/${filename}`;
}
