"use client";

import { useRef } from "react";
import { fileUrl } from "@/shared/lib/file-url";
import { toast } from "@/hooks/useToast";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FILE_TYPES, formatBytes } from "../seller-profile.helpers";
import type { DocSlot } from "../seller-profile.types";

/** Upload box for one document. Shows the file once picked or on record. */
export function DocTile({
  id,
  slot,
  invalid,
  disabled,
  onPick,
  onRemove,
}: {
  id: string;
  slot: DocSlot | null | undefined;
  invalid?: boolean;
  disabled?: boolean;
  onPick: (f: File) => void;
  onRemove?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  /**
   * Opens the file in a new tab: a picked file locally, a saved one at
   * NEXT_PUBLIC_S3_BASE_URL + "/" + key (same as brand logo and banner).
   */
  const view = () => {
    if (!slot) return;
    const url = slot.file ? URL.createObjectURL(slot.file) : fileUrl(slot.key) ?? slot.url ?? null;
    if (url) window.open(url, "_blank", "noopener");
    else toast({ title: "Could not open the file. Try again.", variant: "destructive" });
  };
  const input = (
    <input
      ref={ref}
      id={id}
      type="file"
      accept={FILE_TYPES.join(",")}
      hidden
      disabled={disabled}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
        e.target.value = "";
      }}
    />
  );

  if (slot) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-[10px] border border-border bg-white px-3 py-2">
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm" title={slot.name}>
          {slot.name}
          {slot.size ? <span className="text-xs text-muted-foreground"> · {formatBytes(slot.size)}</span> : null}
          {slot.key ? (
            <span className="text-xs text-[#1D6B3A]"> · On file</span>
          ) : (
            <span className="text-xs text-muted-foreground"> · Uploads when you save</span>
          )}
        </span>
        <button type="button" className="cursor-pointer text-[13px] text-primary hover:underline" onClick={view}>
          View
        </button>
        {!disabled && (
          <>
            <button type="button" className="cursor-pointer text-[13px] text-primary hover:underline" onClick={() => ref.current?.click()}>
              Replace
            </button>
            {onRemove && (
              <button
                type="button"
                aria-label="Remove file"
                className="cursor-pointer rounded p-1 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        )}
        {input}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className={cn(
          "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] border border-dashed bg-[#FFF6F2] px-3 py-2.5 text-sm text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60",
          invalid ? "border-destructive" : "border-[#D9805B]",
        )}
      >
        <Upload className="h-4 w-4" /> Upload file
      </button>
      {input}
    </>
  );
}
