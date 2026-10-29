import { createHmac, randomUUID } from "node:crypto";
import type { ImageKitAuthParameters } from "@/types";
import { AppError } from "@/types";

export function generateImageKitUploadAuth(options: { token?: string; expireInSeconds?: number } = {}): ImageKitAuthParameters {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) throw new Error("ImageKit public key, private key and URL endpoint must be configured.");
  const lifetime = options.expireInSeconds ?? 5 * 60;
  if (!Number.isInteger(lifetime) || lifetime < 60 || lifetime >= 60 * 60) throw new Error("ImageKit upload token lifetime must be 60 seconds to less than one hour.");
  const token = options.token ?? randomUUID();
  const expire = Math.floor(Date.now() / 1000) + lifetime;
  const signature = createHmac("sha1", privateKey).update(`${token}${expire}`).digest("hex");
  return { token, expire, signature, publicKey, urlEndpoint };
}

export function validateImageUpload(input: { mimeType: string; sizeBytes: number; purpose: "portfolio" | "profile" | "private_document" }): void {
  const allowedTypes = input.purpose === "private_document"
    ? ["image/jpeg", "image/png", "application/pdf"]
    : ["image/jpeg", "image/png", "image/webp"];
  const maxBytes = input.purpose === "private_document" ? 10 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!allowedTypes.includes(input.mimeType)) throw new AppError("Unsupported file type.", 400, "UNSUPPORTED_FILE_TYPE");
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > maxBytes) throw new AppError(`File exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit or is empty.`, 400, "INVALID_FILE_SIZE");
}
