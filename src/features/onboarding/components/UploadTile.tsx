"use client";

import { useRef } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedDoc } from "../onboarding.types";
import { DOC_TYPES, formatBytes } from "../onboarding.helpers";

/** Dashed upload box from the admin "Add seller" form; shows the file once picked. */
export function UploadTile({
  file,
  ariaLabel,
  invalid,
  onPick,
  onRemove,
}: {
  file: UploadedDoc | null;
  ariaLabel: string;
  invalid?: boolean;
  onPick: (f: File | undefined) => void;
  /** Omit to hide the remove button (e.g. KYB files on record can only be replaced). */
  onRemove?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={DOC_TYPES.join(",")}
      hidden
      onChange={(e) => {
        onPick(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (file) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-[10px] border border-border bg-white px-3 py-2">
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm" title={file.name}>
          {file.name}
          <span className="text-xs text-muted-foreground"> · {formatBytes(file.size)}</span>
        </span>
        <button type="button" className="cursor-pointer text-[13px] text-primary hover:underline" onClick={() => ref.current?.click()}>
          Replace
        </button>
        {onRemove && (
          <button type="button" aria-label="Remove file" className="cursor-pointer rounded p-1 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <X className="h-4 w-4" />
          </button>
        )}
        {input}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => ref.current?.click()}
        className={cn(
          "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[10px] border border-dashed bg-[#FFF6F2] px-3 py-2.5 text-sm text-foreground hover:bg-secondary",
          invalid ? "border-destructive" : "border-[#D9805B]",
        )}
      >
        <Upload className="h-4 w-4" /> Upload file
      </button>
      {input}
    </>
  );
}
