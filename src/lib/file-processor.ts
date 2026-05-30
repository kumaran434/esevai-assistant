import imageCompression from 'browser-image-compression';
import { jsPDF } from 'jspdf';

export async function mergeFrontBack(front: File, back: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imgFront = new Image();
    const imgBack = new Image();

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 2) {
        // Side-by-side layout
        const width = imgFront.width + imgBack.width + 40; // 40px gap
        const height = Math.max(imgFront.height, imgBack.height);
        
        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(imgFront, 0, (height - imgFront.height) / 2);
          ctx.drawImage(imgBack, imgFront.width + 40, (height - imgBack.height) / 2);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], `merged_${front.name}`, { type: 'image/jpeg' }));
          } else {
            reject(new Error("Canvas to Blob conversion failed"));
          }
        }, 'image/jpeg', 0.9);
      }
    };

    imgFront.onload = onLoad;
    imgBack.onload = onLoad;
    imgFront.onerror = reject;
    imgBack.onerror = reject;

    const readerF = new FileReader();
    readerF.onload = (e) => (imgFront.src = e.target?.result as string);
    readerF.readAsDataURL(front);

    const readerB = new FileReader();
    readerB.onload = (e) => (imgBack.src = e.target?.result as string);
    readerB.readAsDataURL(back);
  });
}

export async function compressImage(file: File, maxSizeKb: number = 500): Promise<File> {
  const options = {
    maxSizeMB: maxSizeKb / 1024, // Use website specific limit if provided, else default 500KB
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: file.type.startsWith('image/') ? file.type : 'image/jpeg'
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Compression failed:', error);
    return file;
  }
}

export async function convertImageToPdf(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const doc = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });
        doc.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        const pdfBlob = doc.output('blob');
        resolve(new File([pdfBlob], file.name.replace(/\.[^/.]+$/, "") + ".pdf", { type: 'application/pdf' }));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function mergeIDCardImages(front: File, back: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const frontImg = new Image();
    const backImg = new Image();
    let loaded = 0;

    const onLoaded = () => {
      loaded++;
      if (loaded === 2) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context failed');

        // Layout: Side-by-side
        canvas.width = frontImg.width + backImg.width + 20; // 20px gap
        canvas.height = Math.max(frontImg.height, backImg.height);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frontImg, 0, (canvas.height - frontImg.height) / 2);
        ctx.drawImage(backImg, frontImg.width + 20, (canvas.height - backImg.height) / 2);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const mergedFile = new File([blob], `merged_${front.name}`, { type: 'image/jpeg' });
            resolve(await compressImage(mergedFile));
          } else {
            reject('Blob creation failed');
          }
        }, 'image/jpeg', 0.8);
      }
    };

    frontImg.onload = onLoaded;
    backImg.onload = onLoaded;
    frontImg.src = URL.createObjectURL(front);
    backImg.src = URL.createObjectURL(back);
  });
}
