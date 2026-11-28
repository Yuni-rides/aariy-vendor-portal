import { httpUpload } from "@/shared/api/http";
import { AUTH_BYPASS } from "@/features/auth/auth.mock";

/**
 * Shared file upload. Upload first, then send the returned `key` in the form that uses the file
 * (documents[].key, brands[].logoKey, product images, and so on).
 *
 *   POST /media/upload   multipart/form-data
 *     files    1 to 5 files (field name "files", repeated)
 *     purpose  optional; leave it out, the form that uses the key decides what the file is
 *     market   optional, PK or US (ignored for vendors)
 *
 * Usage:
 *   const [uploaded] = await mediaApi.upload([file]);
 *   payload.logoKey = uploaded.key;
 *
 *   const key = await uploadFile(file);           // one file, returns the key
 */

export type MediaPurpose =
  | "PRODUCT_IMAGE"
  | "BRAND_ASSET"
  | "KYB_DOCUMENT"
  | "QC_PHOTO"
  | "RETURN_EVIDENCE"
  | "SHIPPING_LABEL"
  | "STATEMENT_PDF"
  | "IMPORT_FILE"
  | "EXPORT_FILE"
  | "TICKET_ATTACHMENT"
  | "SHIPPING_DOCUMENT"
  | "PROFILE_IMAGE"
  | "CATEGORY_IMAGE"
  | "UPLOAD";

export type UploadedFile = {
  fileId: string;
  /** Send this in the form that uses the file. */
  key: string;
  url: string;
  visibility: "PUBLIC" | "PRIVATE" | string;
  purpose: MediaPurpose | string;
  market: string;
  contentType: string;
  sizeBytes: number;
};

export type UploadOptions = {
  purpose?: MediaPurpose;
  market?: "PK" | "US";
  /** 0 to 100, across every file in the call. */
  onProgress?: (percent: number) => void;
};

type ApiResult<T> = { status: boolean; code?: string; message: string; data?: T };

/** The API takes at most 5 files per request; longer lists are sent in batches. */
export const MAX_FILES_PER_UPLOAD = 5;

const chunk = <T,>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** Test mode: no network, a fake key per file. */
const mockUpload = (files: File[]): UploadedFile[] =>
  files.map((f) => {
    const key = `tmp/test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
    return {
      fileId: `test-${Math.random().toString(36).slice(2)}`,
      key,
      url: URL.createObjectURL(f),
      visibility: "PUBLIC",
      purpose: "UPLOAD",
      market: "PK",
      contentType: f.type,
      sizeBytes: f.size,
    };
  });

/** Turns an upload error into a message for the seller. */
export const uploadErrorMessage = (e: any): string =>
  e?.response?.data?.message ??
  (e?.code === "ECONNABORTED" ? "The upload took too long. Try again." : "Could not upload the file. Try again.");

export const mediaApi = {
  /** Uploads the files and returns one result per file, in the same order. Throws when an upload fails. */
  upload: async (files: File[], opts: UploadOptions = {}): Promise<UploadedFile[]> => {
    if (!files.length) return [];
    if (AUTH_BYPASS) {
      opts.onProgress?.(100);
      return mockUpload(files);
    }

    const total = files.reduce((n, f) => n + f.size, 0) || 1;
    let doneBytes = 0;
    const results: UploadedFile[] = [];

    for (const batch of chunk(files, MAX_FILES_PER_UPLOAD)) {
      const body = new FormData();
      batch.forEach((f) => body.append("files", f, f.name));
      if (opts.purpose) body.append("purpose", opts.purpose);
      if (opts.market) body.append("market", opts.market);

      const batchBytes = batch.reduce((n, f) => n + f.size, 0);
      const res = await httpUpload.post<ApiResult<UploadedFile[] | UploadedFile>>("/media/upload", body, {
        onUploadProgress: (ev) => {
          if (!opts.onProgress) return;
          const sent = ev.total ? (ev.loaded / ev.total) * batchBytes : 0;
          opts.onProgress(Math.min(99, Math.round(((doneBytes + sent) / total) * 100)));
        },
      });
      doneBytes += batchBytes;

      const data = res.data?.data;
      const list = Array.isArray(data) ? data : data ? [data] : [];
      if (!res.data?.status || list.length !== batch.length || list.some((u) => !u?.key)) {
        throw { response: { data: { message: res.data?.message ?? "Could not upload the file. Try again." } } };
      }
      results.push(...list);
    }

    opts.onProgress?.(100);
    return results;
  },
};

/** Uploads one file and returns its key. */
export const uploadFile = async (file: File, opts?: UploadOptions): Promise<string> => {
  const [uploaded] = await mediaApi.upload([file], opts);
  return uploaded.key;
};
