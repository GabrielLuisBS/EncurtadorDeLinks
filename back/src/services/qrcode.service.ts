import QRCode from "qrcode";

/**
 * Sob demanda a partir da URL curta — determinístico a partir do slug, então
 * não precisa ser armazenado, só recalculado a cada request (ver nota
 * "Funcionalidades do Link" no Obsidian).
 */
export const qrcodeService = {
  generatePng(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, { type: "png" });
  },
};
