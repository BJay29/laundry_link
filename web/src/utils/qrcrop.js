import jsQR from 'jsqr';

/**
 * AUTO-CROP NG QR CODE
 *
 * Kapag nag-upload ang shop ng screenshot (hal. buong screen ng GCash/Maya
 * na may pangalan, logo, button, atbp.), hinahanap dito ang QR code mismo
 * gamit ang jsQR, tapos ginugupit ang larawan para QR code lang (may maliit
 * na puting margin / "quiet zone" sa paligid para madaling ma-scan) ang
 * matitira. Parisukat ang resulta.
 *
 * Ibinabalik ang { file, cropped }:
 *   - cropped = true  → may nahanap na QR; `file` ay bagong PNG na QR lang
 *   - cropped = false → walang nahanap na QR; `file` ay ang orihinal
 *
 * Walang naa-upload dito — local (sa browser) lang ang lahat ng proseso.
 */

const DETECT_MAX_SIDE = 1600; // paliitin ang larawan para mabilis ang detection
const OUTPUT_MAX_SIDE = 1024; // pinakamalaking sukat ng gupit na QR
const QUIET_ZONE_RATIO = 0.12; // puting margin sa paligid ng QR (porsyento ng laki ng QR)

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image.'));
    };
    img.src = url;
  });

const canvasToFile = (canvas, name) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create the cropped image.'));
        return;
      }
      resolve(new File([blob], name, { type: 'image/png' }));
    }, 'image/png');
  });

export async function cropQrFromFile(file) {
  try {
    const img = await loadImage(file);
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    // 1) Hanapin ang QR sa (pinaliit na) kopya ng larawan.
    const scale = Math.min(1, DETECT_MAX_SIDE / Math.max(naturalW, naturalH));
    const dw = Math.max(1, Math.round(naturalW * scale));
    const dh = Math.max(1, Math.round(naturalH * scale));

    const detectCanvas = document.createElement('canvas');
    detectCanvas.width = dw;
    detectCanvas.height = dh;
    const dctx = detectCanvas.getContext('2d', { willReadFrequently: true });
    dctx.fillStyle = '#ffffff';
    dctx.fillRect(0, 0, dw, dh);
    dctx.drawImage(img, 0, 0, dw, dh);
    const imageData = dctx.getImageData(0, 0, dw, dh);

    const code = jsQR(imageData.data, dw, dh, { inversionAttempts: 'attemptBoth' });
    if (!code) return { file, cropped: false };

    // 2) Kunin ang bounding box ng QR (sa sukat ng orihinal na larawan).
    const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = code.location;
    const xs = [topLeftCorner.x, topRightCorner.x, bottomRightCorner.x, bottomLeftCorner.x];
    const ys = [topLeftCorner.y, topRightCorner.y, bottomRightCorner.y, bottomLeftCorner.y];
    const minX = Math.min(...xs) / scale;
    const maxX = Math.max(...xs) / scale;
    const minY = Math.min(...ys) / scale;
    const maxY = Math.max(...ys) / scale;

    const qrSide = Math.max(maxX - minX, maxY - minY);
    const margin = qrSide * QUIET_ZONE_RATIO;
    const cropSide = qrSide + margin * 2;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sx = cx - cropSide / 2;
    const sy = cy - cropSide / 2;

    // 3) Iguhit sa puting parisukat. Kapag lumampas ang margin sa gilid ng
    //    larawan, puting espasyo ang idadagdag (hindi madudurog ang QR).
    const outSide = Math.max(1, Math.round(Math.min(cropSide, OUTPUT_MAX_SIDE)));
    const ratio = outSide / cropSide;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outSide;
    outCanvas.height = outSide;
    const octx = outCanvas.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, outSide, outSide);
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(img, -sx * ratio, -sy * ratio, naturalW * ratio, naturalH * ratio);

    const cropped = await canvasToFile(outCanvas, 'qr-code.png');
    return { file: cropped, cropped: true };
  } catch (_) {
    // Kung pumalya ang anumang hakbang, gamitin na lang ang orihinal na file.
    return { file, cropped: false };
  }
}

export default cropQrFromFile;