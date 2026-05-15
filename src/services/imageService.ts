// 图片压缩服务 - 浏览器端 Canvas API 压缩
import type { ImageCompressConfig } from '../stores/diaryStore';
import { getFormatDateStr } from '../stores/diaryStore';

const DEFAULT_MAX_LONG_SIDE = 2000;
const DEFAULT_MAX_SIZE_MB = 2;
const DEFAULT_QUALITY = 0.7;
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

export async function compressImage(
  file: File,
  config?: Partial<ImageCompressConfig>
): Promise<Blob> {
  const maxLongSide = config?.maxLongSide ?? DEFAULT_MAX_LONG_SIDE;
  const maxSizeMB = config?.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;
  const initialQuality = config?.quality ?? DEFAULT_QUALITY;

  const img = await loadImage(file);

  let { width, height } = img;
  if (Math.max(width, height) > maxLongSide) {
    const ratio = maxLongSide / Math.max(width, height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = initialQuality;
  let blob: Blob | null = null;

  while (quality >= MIN_QUALITY) {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= maxSizeMB * 1024 * 1024) {
      return blob;
    }
    quality -= 0.1;
    quality = Math.round(quality * 10) / 10;
  }

  if (blob && blob.size > maxSizeMB * 1024 * 1024) {
    const scaleDown = Math.sqrt((maxSizeMB * 1024 * 1024) / blob.size);
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

const DEFAULT_NAME_FORMAT = 'Image-{date}-{seq}';

export function generateImageFilename(
  date: Date,
  seq: number,
  nameFormat?: string
): string {
  const format = nameFormat || DEFAULT_NAME_FORMAT;
  const dateStr = getFormatDateStr(date);
  const seqStr = seq.toString().padStart(3, '0');
  
  return format
    .replace('{date}', dateStr)
    .replace('{seq}', seqStr) + '.jpg';
}
