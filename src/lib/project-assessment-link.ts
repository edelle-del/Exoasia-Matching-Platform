import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";

export type ProjectAssessmentData = {
  owner_id: string;
  name: string;
  description: string;
  stage: string;
  sector: string;
};

export function createProjectAssessmentData(
  input: ProjectAssessmentData,
): ProjectAssessmentData {
  return {
    owner_id: input.owner_id.trim(),
    name: input.name.trim(),
    description: input.description.trim(),
    stage: input.stage.trim(),
    sector: input.sector.trim(),
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  return new Uint8Array(Buffer.from(value, "base64"));
}

export function compressProjectAssessmentData(
  input: ProjectAssessmentData,
): string {
  const json = JSON.stringify(createProjectAssessmentData(input));
  return bytesToBase64(gzipSync(strToU8(json)));
}

export function decompressProjectAssessmentData(
  encoded: string,
): ProjectAssessmentData {
  const json = strFromU8(
    gunzipSync(base64ToBytes(decodeURIComponent(encoded))),
  );
  return JSON.parse(json) as ProjectAssessmentData;
}

export function buildProjectAssessmentRedirectUrl(
  input: ProjectAssessmentData,
): string {
  const encoded = encodeURIComponent(compressProjectAssessmentData(input));
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_VRA_CONNECTION ??
        process.env.NEXT_VRA_CONNECTION)
      : undefined;
  const base = envBase && envBase.length > 0 ? envBase : "https://exoasia.org/";
  return `${base.replace(/\/+$/, "")}/${encoded}`;
}
