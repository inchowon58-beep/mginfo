const READY = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const SKIP_CONVERT = new Set(["image/svg+xml"]);
const MAX_BYTES = 3.6 * 1024 * 1024;
const MAX_EDGE = 1920;

function looksLikeImage(file: File) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|svg)$/i.test(file.name || "");
}

export function pickImageFiles(files: File[]) {
  return files.filter(looksLikeImage);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("사진을 변환하지 못했습니다."))), "image/jpeg", quality);
  });
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이 사진은 올릴 수 없습니다. jpg/png로 다시 선택해 보세요."));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareUploadImage(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  if (SKIP_CONVERT.has(type)) return file;
  if (READY.has(type) && file.size <= MAX_BYTES) return file;

  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 변환하지 못했습니다.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.88;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > MAX_BYTES && quality > 0.5) {
    quality -= 0.12;
    blob = await canvasToJpeg(canvas, quality);
  }
  const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
