import type { SubmittedDocument } from "@/types";

/** A blob: URL for files still in the browser (data: URLs can't be opened in a new tab). */
async function localUrl(url: string): Promise<string> {
  return url.startsWith("data:") ? URL.createObjectURL(await (await fetch(url)).blob()) : url;
}

/** Opens an image or PDF in a new tab, whether it's just been added or is stored on the server. */
export async function openDocument(doc: SubmittedDocument): Promise<void> {
  window.open(await localUrl(doc.url), "_blank", "noopener");
}

/**
 * Saves the file under its own name. Browsers ignore `download` on links to another site (the
 * files live on Supabase), so it's fetched first; if that's blocked, Supabase's own ?download=
 * link is opened instead.
 */
export async function downloadDocument(doc: SubmittedDocument): Promise<void> {
  try {
    const blob = await (await fetch(doc.url)).blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch {
    const fallback = new URL(doc.url);
    fallback.searchParams.set("download", doc.name);
    window.open(fallback.toString(), "_blank", "noopener");
  }
}

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
