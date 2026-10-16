import type { SubmittedDocument } from "@/types";

export const MAX_DOCUMENT_MB = 5;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

/**
 * Turns an uploaded PDF or image into a document record, or throws a sentence
 * explaining why it can't be used. With a real backend this becomes an upload.
 */
export async function toDocument(file: File): Promise<SubmittedDocument> {
  if (!(file.type === "application/pdf" || file.type.startsWith("image/"))) throw new Error(`${file.name} isn't a PDF or image.`);
  if (file.size > MAX_DOCUMENT_MB * 1024 * 1024) throw new Error(`${file.name} is over ${MAX_DOCUMENT_MB} MB.`);
  return { name: file.name, type: file.type, size: file.size, url: await readAsDataUrl(file) };
}
