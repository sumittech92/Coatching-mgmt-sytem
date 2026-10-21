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
