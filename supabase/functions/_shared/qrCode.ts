/**
 * QR code des e-mails clients.
 *
 * Renvoie du base64 brut, jamais une `data:` URI : Gmail refuse d'afficher les
 * images en data URI, et le QR n'était qu'un cadre vide. Il doit voyager en
 * pièce jointe référencée par `cid:`, comme le logo.
 */
import QRCode from 'npm:qrcode@1.5.4';

/** Identifiant de la pièce jointe portant le QR code. */
export const QR_CID = 'qr-espace-tvm38';

/**
 * Renvoie une chaîne vide en cas d'échec : un e-mail sans QR reste parfaitement
 * utilisable, alors qu'une exception ferait perdre la notification entière.
 */
export async function qrCodeBase64(url: string): Promise<string> {
  try {
    const dataUri = await QRCode.toDataURL(url, {
      width: 192,
      margin: 1,
      color: { dark: '#0053a1', light: '#ffffff' },
    });
    return dataUri.slice(dataUri.indexOf(',') + 1);
  } catch (err) {
    console.error('QR code non généré', err);
    return '';
  }
}

/** Pièce jointe du QR, vide si le code n'a pas pu être généré. */
export function pieceJointeQr(base64: string) {
  return base64
    ? [{ filename: 'espace-client-tvm38.png', content: base64, encoding: 'base64' as const, cid: QR_CID }]
    : [];
}
