"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatLongDate } from "@/features/orders/orders.helpers";
import { UploadTile } from "@/features/onboarding/components/UploadTile";
import { DOCS, DOC_TYPES, DOC_TYPES_LABEL, MAX_DOC_BYTES, MAX_OTHER_DOCS } from "@/features/onboarding/onboarding.helpers";
import type { DocKey, UploadedDoc } from "@/features/onboarding/onboarding.types";
import { formatBytes } from "@/features/onboarding/onboarding.helpers";
import { Btn, Field, Muted, Panel, PanelTitle, fieldClass } from "@/shared/ui/seller";
import { useBrandProfileStore } from "../brand-profile.store";
import { KybDocStatus, ProfileResult } from "../brand-profile.types";

/**
 * Document changes the seller has made on this page but not sent yet.
 * They go to Aariy together with the other edits when "Submit changes" is pressed.
 */
export type KybDraft = {
  docs: Partial<Record<DocKey, UploadedDoc>>;
  others: { id: string; label: string; file: UploadedDoc }[];
};

export const emptyKybDraft = (): KybDraft => ({ docs: {}, others: [] });
export const kybDraftCount = (d: KybDraft) => Object.keys(d.docs).length + d.others.length;

const statusLabel: Record<KybDocStatus, string> = { APPROVED: "Approved", IN_REVIEW: "In review", REJECTED: "Rejected" };
const statusTone: Record<KybDocStatus, StatusTone> = { APPROVED: "success", IN_REVIEW: "info", REJECTED: "danger" };

const notify = (res: ProfileResult) => toast({ title: res.message, variant: res.success ? "default" : "destructive" });

/** Same checks as onboarding: JPG, PNG, WEBP or PDF up to 5 MB. */
function toUploaded(file: File | undefined): UploadedDoc | null {
  if (!file) return null;
  if (!DOC_TYPES.includes(file.type)) {
    toast({ title: "Upload a JPG, PNG, WEBP or PDF file.", variant: "destructive" });
    return null;
  }
  if (file.size > MAX_DOC_BYTES) {
    toast({ title: "Files must be 5 MB or smaller.", variant: "destructive" });
    return null;
  }
  // TODO(api): upload to private storage (visible to Aariy admin roles only) when the changes are submitted.
  return { name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
}

const NotSubmitted = () => <StatusBadge tone="warning">Not submitted</StatusBadge>;

export function KybDocumentsCard({ draft, onChange }: { draft: KybDraft; onChange: (next: KybDraft) => void }) {
  const profile = useBrandProfileStore((s) => s.profile);
  const { saving, removeOtherKybDoc } = useBrandProfileStore();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<UploadedDoc | null>(null);
  const [errors, setErrors] = useState<{ label?: string; file?: string }>({});

  if (!profile) return null;
  const { documents, others } = profile.kyb;
  const added = DOCS.filter((d) => draft.docs[d.key] || documents[d.key]).length;

  // Same rules as onboarding, based on what is on file now.
  const required = new Set<DocKey>(["CNIC_FRONT", "CNIC_BACK", "TAX_CERTIFICATE", "BANK_PROOF"]);
  if (profile.legal.strnMasked) required.add("SALES_TAX_CERTIFICATE");

  const stageDoc = (key: DocKey, doc: UploadedDoc | null) => {
    const docs = { ...draft.docs };
    if (doc) docs[key] = doc;
    else delete docs[key];
    onChange({ ...draft, docs });
  };

  const stageOther = () => {
    const errs: typeof errors = {};
    if (!label.trim()) errs.label = "Say what this document is.";
    if (!file) errs.file = "Upload the file.";
    setErrors(errs);
    if (Object.keys(errs).length || !file) return;
    onChange({ ...draft, others: [...draft.others, { id: `new-${Date.now()}`, label: label.trim(), file }] });
    setAdding(false);
    setLabel("");
    setFile(null);
  };

  const otherTotal = others.length + draft.others.length;

  return (
    <Panel className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <PanelTitle className="mb-0">KYB documents</PanelTitle>
          <span className="text-xs text-muted-foreground">
            {added} of {DOCS.length} added · {DOC_TYPES_LABEL}
          </span>
        </div>
        <Muted>
          Only Aariy’s review team can see these files. Press Submit changes to send new or replaced files for review.
        </Muted>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {DOCS.map((d) => {
            const staged = draft.docs[d.key];
            const onFile = documents[d.key];
            const shown = staged ?? onFile ?? null;
            return (
              <div key={d.key} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
                  <span>{d.label}</span>
                  {staged ? (
                    <NotSubmitted />
                  ) : onFile ? (
                    <StatusBadge tone={statusTone[onFile.status]}>{statusLabel[onFile.status]}</StatusBadge>
                  ) : required.has(d.key) ? (
                    <StatusBadge tone="warning">Missing</StatusBadge>
                  ) : (
                    <span className="text-[11px]">Optional</span>
                  )}
                </div>
                <UploadTile
                  file={shown}
                  ariaLabel={`Upload ${d.label}`}
                  invalid={!staged && (onFile?.status === "REJECTED" || (!onFile && required.has(d.key)))}
                  onPick={(f) => {
                    const up = toUploaded(f);
                    if (up) stageDoc(d.key, up);
                  }}
                  // Only an unsent change can be dropped; files on record can only be replaced.
                  onRemove={staged ? () => stageDoc(d.key, null) : undefined}
                />
                {staged ? (
                  <p className="m-0 mt-1 text-xs text-[#8A5A00]">
                    {onFile ? `Replaces ${onFile.name}. ` : ""}Sent when you press Submit changes.
                  </p>
                ) : onFile?.status === "REJECTED" && onFile.note ? (
                  <p className="m-0 mt-1 text-xs text-destructive">{onFile.note}</p>
                ) : onFile ? (
                  <p className="m-0 mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {onFile.uploadedAt && <span>Uploaded {formatLongDate(onFile.uploadedAt)}</span>}
                    {onFile.url && (
                      <a href={onFile.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View file
                      </a>
                    )}
                  </p>
                ) : (
                  !required.has(d.key) && d.when && <p className="m-0 mt-1 text-xs text-muted-foreground">{d.when}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-semibold">Other documents (optional)</div>
          <Muted>Anything else that supports the application, e.g. a trademark certificate.</Muted>
        </div>

        {others.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <div className="font-medium">{o.label}</div>
              <div className="truncate text-[13px] text-muted-foreground">
                {o.name}
                {o.uploadedAt && ` · uploaded ${formatLongDate(o.uploadedAt)}`}
                {o.url && (
                  <>
                    {" · "}
                    <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      View
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone={statusTone[o.status]}>{statusLabel[o.status]}</StatusBadge>
              {o.status !== "APPROVED" && (
                <button
                  type="button"
                  aria-label={`Remove ${o.label}`}
                  disabled={saving}
                  className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                  onClick={async () => notify(await removeOtherKybDoc(o.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {draft.others.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#E8CC8A] bg-[#FFFBF2] p-3">
            <div className="min-w-0">
              <div className="font-medium">{o.label}</div>
              <div className="truncate text-[13px] text-muted-foreground">
                {o.file.name} · {formatBytes(o.file.size)} · sent when you press Submit changes
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotSubmitted />
              <button
                type="button"
                aria-label={`Discard ${o.label}`}
                className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                onClick={() => onChange({ ...draft, others: draft.others.filter((x) => x.id !== o.id) })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {adding ? (
          <div className="grid grid-cols-1 items-start gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
            <Field label="Document name" htmlFor="kyb-other-label" error={errors.label}>
              <input
                id="kyb-other-label"
                className={fieldClass}
                placeholder="Trademark certificate"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
            <div className="min-w-0">
              <div className="mb-1.5 text-[13px] text-muted-foreground">File</div>
              <UploadTile
                file={file}
                ariaLabel="Upload other document"
                invalid={!!errors.file}
                onPick={(f) => {
                  const up = toUploaded(f);
                  if (up) setFile(up);
                }}
                onRemove={() => setFile(null)}
              />
              {errors.file && <p className="m-0 mt-1 text-xs text-destructive">{errors.file}</p>}
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Btn primary onClick={stageOther}>
                Add document
              </Btn>
              <Btn
                onClick={() => {
                  setAdding(false);
                  setErrors({});
                }}
              >
                Cancel
              </Btn>
            </div>
          </div>
        ) : (
          <div>
            <Btn onClick={() => setAdding(true)} disabled={otherTotal >= MAX_OTHER_DOCS}>
              <Plus className="h-4 w-4" /> Add other document
            </Btn>
          </div>
        )}
      </div>
    </Panel>
  );
}
