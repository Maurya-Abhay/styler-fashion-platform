import { apiRequest } from "@/components/api-client";

export type ImageKitUploadPurpose = "profile" | "portfolio" | "private_document";

export type ImageKitUploadedFile = {
  url: string;
  fileId: string;
  filePath?: string;
};

export async function uploadImageKit(
  file: File,
  purpose: ImageKitUploadPurpose,
): Promise<ImageKitUploadedFile> {
  const auth = await apiRequest<{
    publicKey: string;
    signature: string;
    token: string;
    expire: number;
  }>("/api/imagekit/auth", {
    method: "POST",
    body: JSON.stringify({ purpose, mimeType: file.type, sizeBytes: file.size }),
  });
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", auth.publicKey);
  form.append("signature", auth.signature);
  form.append("token", auth.token);
  form.append("expire", String(auth.expire));
  form.append("useUniqueFileName", "true");
  const folder = purpose === "private_document"
    ? "/styler/private-documents"
    : purpose === "profile"
      ? "/styler/profiles"
      : "/styler/portfolio";
  form.append("folder", folder);
  if (purpose === "private_document") form.append("isPrivateFile", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || "Image upload failed.");
  if (typeof result?.url !== "string" || typeof result?.fileId !== "string") {
    throw new Error("ImageKit returned an incomplete upload response.");
  }
  return {
    url: result.url,
    fileId: result.fileId,
    ...(typeof result.filePath === "string" ? { filePath: result.filePath } : {}),
  };
}
