/**
 * Reads an uploaded image as a data URL, scaled down so it fits in `maxSide` pixels.
 * Unlike a blob: URL it survives a reload and can be saved to browser storage.
 * SVGs are kept as-is (already small and scale without loss).
 */
export function readImageAsDataUrl(file: File, maxSide = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const source = String(reader.result || '');
      if (file.type === 'image/svg+xml') { resolve(source); return; }
      const image = new Image();
      image.onerror = () => reject(new Error('Could not read the image.'));
      image.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Shrinks a photo so its longer side is at most `maxSide` pixels and re-encodes it as JPEG, keeping uploads small.
 * GIFs (may be animated) and images already small enough are returned unchanged.
 */
export function resizeImageFile(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (file.type === 'image/gif') return Promise.resolve(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read “${file.name}”.`)); };
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      if (scale === 1 && file.size <= 1024 * 1024) { resolve(file); return; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      if (!context) { resolve(file); return; }
      // JPEG has no transparency: paint white behind PNG / WebP cut-outs.
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', quality);
    };
    image.src = url;
  });
}
