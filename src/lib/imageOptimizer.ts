/**
 * A ultra-fast canvas-based compressor that avoids the overhead of libraries
 * for common compression tasks. This implementation is purely main-thread safe
 * and does not use Web Workers, preventing CSP or worker-related freezes.
 */
async function canvasCompress(
  blob: Blob,
  targetSizeKb: number,
  quality: number,
  maxWidth: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Compression timeout"));
    }, 5000);

    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    
    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if too large
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas failure"));
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Blob conversion failure"));
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error("Image load failure"));
    };
  });
}

/**
 * Iteratively compresses an image to hit a specific target size.
 */
export async function compressToTargetSize(
  input: Blob | string,
  targetSizeKb: number,
  _format: string = 'image/jpeg'
): Promise<string> {
  let blob: Blob;
  
  if (typeof input === 'string') {
    const response = await fetch(input);
    blob = await response.blob();
  } else {
    blob = input;
  }

  try {
    // Pass 1: standard
    let currentBlob = await canvasCompress(blob, targetSizeKb, 0.7, 1200);
    
    // Pass 2: if still too big
    if (currentBlob.size / 1024 > targetSizeKb) {
      currentBlob = await canvasCompress(currentBlob, targetSizeKb, 0.5, 800);
    }
    
    // Pass 3: aggressive
    if (currentBlob.size / 1024 > targetSizeKb) {
      currentBlob = await canvasCompress(currentBlob, targetSizeKb, 0.3, 600);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(currentBlob);
    });
  } catch (error) {
    console.warn('Compression fallback to original:', error);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}

import { getIpcRenderer, isElectron } from './electron-mock';

export function downloadBase64(dataUrl: string, fileName: string) {
  if (isElectron()) {
    const ipc = getIpcRenderer();
    if (ipc) {
      const mimeType = dataUrl.startsWith('data:') 
        ? (dataUrl.match(/^data:([^;]+);/) || [])[1] || 'image/jpeg' 
        : 'image/jpeg';
      
      ipc.send('download-file', {
        dataUrl,
        fileName,
        type: mimeType
      });
      return;
    }
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
