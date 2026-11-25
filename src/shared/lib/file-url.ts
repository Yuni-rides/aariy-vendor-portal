import { env } from "@/core/env/env";

/**
 * Turns a stored file key (e.g. "sellers/123/logo.png") into a URL in the public S3 bucket.
 * Full URLs (http, https, blob, data) are returned as they are.
 */
export const fileUrl = (key?: string | null): string | null => {
  if (!key) return null;
  if (/^(https?:|blob:|data:)/i.test(key)) return key;
  const base = env.NEXT_PUBLIC_S3_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
};
