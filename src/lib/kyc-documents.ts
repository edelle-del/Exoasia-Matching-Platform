export const KYC_BUCKET = "kyc-documents";
export const KYC_MAX_BYTES = 10 * 1024 * 1024;
export const KYC_DOCUMENT_TYPES = ["sec-certificate", "dti-registration"] as const;

export function validateKycFile(type: string, size: number, bytes: Uint8Array): string | null {
  if (!size || size > KYC_MAX_BYTES) return "Choose a file up to 10 MB.";
  const pdf = type === "application/pdf" && Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-";
  const png = type === "image/png" && Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return pdf || png || jpg ? null : "Upload a valid PDF, PNG, or JPEG document.";
}
