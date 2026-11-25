import { mediaApi } from "@/shared/api/media.api";
import type { DocumentType, SellerProfileForm } from "./seller-profile.types";

/** A file picked on the page that still needs a key, and where its key goes back. */
type Pending = { file: File; apply: (f: SellerProfileForm, key: string, url: string) => SellerProfileForm };

/** Files picked on this page that have no upload key yet: documents, brand logo and banner. */
function pendingFiles(form: SellerProfileForm): Pending[] {
  const list: Pending[] = [];

  (Object.keys(form.documents) as DocumentType[]).forEach((type) => {
    const slot = form.documents[type];
    if (!slot?.file || slot.key) return;
    list.push({
      file: slot.file,
      apply: (f, key) => ({ ...f, documents: { ...f.documents, [type]: { ...slot, key, file: undefined } } }),
    });
  });

  form.brands.forEach((b, i) => {
    const setBrand = (f: SellerProfileForm, patch: Partial<SellerProfileForm["brands"][number]>) => ({
      ...f,
      brands: f.brands.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    });
    if (b.logoFile && !b.logoKey) {
      list.push({ file: b.logoFile, apply: (f, key) => setBrand(f, { logoKey: key, logoFile: undefined }) });
    }
    if (b.bannerFile && !b.bannerKey) {
      list.push({ file: b.bannerFile, apply: (f, key) => setBrand(f, { bannerKey: key, bannerFile: undefined }) });
    }
  });

  return list;
}

/**
 * Uploads every picked file through POST /media/upload and returns the form with the keys filled in.
 * Throws when an upload fails; files that already have a key are not sent again.
 */
export async function uploadPendingFiles(form: SellerProfileForm, onProgress?: (percent: number) => void): Promise<SellerProfileForm> {
  const pending = pendingFiles(form);
  if (!pending.length) return form;
  const uploaded = await mediaApi.upload(
    pending.map((p) => p.file),
    { onProgress },
  );
  return pending.reduce((f, p, i) => p.apply(f, uploaded[i].key, uploaded[i].url), form);
}
