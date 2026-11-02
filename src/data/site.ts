/** The public JVA website, for "View website" and "View listing" links. */
export function websiteUrl(path = "/"): string {
  const base = (import.meta.env.VITE_WEBSITE_URL as string | undefined) ?? "https://www.jointventureassets.com";
  return `${base.replace(/\/$/, "")}${path}`;
}
