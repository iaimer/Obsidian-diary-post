// 图片压缩服务 - 浏览器端 Canvas API 压缩

const MAX_LONG_SIDE = 2000;
const MAX_SIZE_MB = 2;
const INITIAL_QUALITY = 0.7;
const MIN_QUALITY = 0.3;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality
    );
  });
}

export async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);

  let { width, height } = img;
  if (Math.max(width, height) > MAX_LONG_SIDE) {
    const ratio = MAX_LONG_SIDE / Math.max(width, height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let blob: Blob | null = null;

  while (quality >= MIN_QUALITY) {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= MAX_SIZE_MB * 1024 * 1024) {
      return blob;
    }
    quality -= 0.1;
    quality = Math.round(quality * 10) / 10;
  }

  if (blob && blob.size > MAX_SIZE_MB * 1024 * 1024) {
    const scaleDown = Math.sqrt((MAX_SIZE_MB * 1024 * 1024) / blob.size);
    const newWidth = Math.round(width * scaleDown);
    const newHeight = Math.round(height * scaleDown);

    const canvas2 = document.createElement('canvas');
    canvas2.width = newWidth;
    canvas2.height = newHeight;
    const ctx2 = canvas2.getContext('2d')!;
    ctx2.drawImage(img, 0, 0, newWidth, newHeight);

    return await canvasToBlob(canvas2, 'image/jpeg', MIN_QUALITY);
  }

  return blob!;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function generateImageFilename(date: Date, seq: number): string {
  const dayStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  return `Image-${dayStr}-${seq.toString().padStart(3, '0')}.jpg`;
}
