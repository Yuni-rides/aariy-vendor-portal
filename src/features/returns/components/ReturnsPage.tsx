"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatLongDate, formatShortDate } from "@/features/orders/orders.helpers";
import {
  Btn,
  ChipTabs,
  EmptyState,
  Field,
  ListItem,
  Muted,
  PageHeader,
  Panel,
  PanelTitle,
  Thumb,
  fieldClass,
} from "@/shared/ui/seller";
import { useReturnsStore } from "../returns.store";
import { ReturnRequest, ReturnTab } from "../returns.types";
import {
  MAX_EVIDENCE,
  RETURN_TABS,
  decisionLabelMap,
  decisionToneMap,
  returnStatusLabelMap,
  returnStatusToneMap,
} from "../returns.helpers";

export default function ReturnsPage() {
  const { returns, loading, error, fetchReturns } = useReturnsStore();
  const [tab, setTab] = useState<ReturnTab>("NEEDS_RESPONSE");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const counts = useMemo(() => {
    const c = { NEEDS_RESPONSE: 0, RESPONDED: 0, CLOSED: 0 } as Record<ReturnTab, number>;
    returns.forEach((r) => (c[r.status] += 1));
    return c;
  }, [returns]);

  const list = returns.filter((r) => r.status === tab);
  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;
  const tabInfo = RETURN_TABS.find((t) => t.value === tab)!;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Returns" />

      <ChipTabs
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSelectedId(null);
        }}
        options={RETURN_TABS.map((t) => ({
          value: t.value,
          label: t.label,
          count: t.showCount ? counts[t.value] : undefined,
        }))}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col gap-3 self-start">
          <PanelTitle className="mb-0">{tabInfo.listTitle}</PanelTitle>
          {loading && <EmptyState>Loading...</EmptyState>}
          {!loading && list.length === 0 && <EmptyState>No returns here</EmptyState>}
          {list.map((r) => (
            <ListItem key={r.id} active={selected?.id === r.id} onClick={() => setSelectedId(r.id)}>
              <div className="flex items-center justify-between gap-3">
                <span>{r.returnNumber}</span>
                <StatusBadge tone={returnStatusToneMap[r.status]}>{returnStatusLabelMap[r.status]}</StatusBadge>
              </div>
              <div className="text-[13px] font-normal text-muted-foreground">{r.parcelNumber}</div>
            </ListItem>
          ))}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {selected ? (
            <ReturnDetail key={selected.id} ret={selected} />
          ) : (
            !loading && (
              <Panel>
                <EmptyState>Select a return to see its details</EmptyState>
              </Panel>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Detail ---------------- */

function ReturnDetail({ ret }: { ret: ReturnRequest }) {
  const { saving, respond } = useReturnsStore();
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [noteError, setNoteError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    // TODO(api): upload to storage and keep the returned URLs instead of local previews.
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    setEvidence((e) => [...e, ...urls].slice(0, MAX_EVIDENCE));
  };

  const handleSend = async () => {
    if (!notes.trim()) {
      setNoteError("Add a note for Aariy operations.");
      return;
    }
    setNoteError(undefined);
    const res = await respond(ret.id, notes, evidence);
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
  };

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelTitle className="mb-0">
            {ret.returnNumber} · {ret.itemName} × {ret.qty}
          </PanelTitle>
          <StatusBadge tone={returnStatusToneMap[ret.status]}>{returnStatusLabelMap[ret.status]}</StatusBadge>
        </div>
        <p className="my-3 text-[13px] text-muted-foreground">
          Buyer reason: {ret.buyerReason} Delivered {formatShortDate(ret.deliveredAt)}, return window ends{" "}
          {formatLongDate(ret.windowEndsAt)}. Parcel {ret.parcelNumber}.
        </p>
        <div className="flex flex-wrap gap-3">
          {ret.buyerPhotos.length ? ret.buyerPhotos.map((src) => <Thumb key={src} src={src} />) : <Thumb />}
        </div>
      </Panel>

      {ret.status === "NEEDS_RESPONSE" ? (
        <Panel className="flex flex-col gap-3">
          <PanelTitle className="mb-0">Your response</PanelTitle>
          <Field label="Notes" htmlFor="n" error={noteError}>
            <textarea
              id="n"
              rows={3}
              className={fieldClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you checked, and what you'd like Aariy to do"
            />
          </Field>
          <div className="flex flex-col gap-3">
            {evidence.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {evidence.map((src) => (
                  <Thumb key={src} src={src}>
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setEvidence((e) => e.filter((x) => x !== src))}
                      className="absolute right-1 top-1 cursor-pointer rounded-full bg-white/90 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Thumb>
                ))}
              </div>
            )}
            <div>
              <Btn onClick={() => fileRef.current?.click()} disabled={evidence.length >= MAX_EVIDENCE}>
                Upload evidence (photos)
              </Btn>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Btn primary onClick={handleSend} disabled={saving}>
              Send response
            </Btn>
          </div>
          <Muted>Aariy operations decides after your response: accept, partial refund or reject.</Muted>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-3">
          <PanelTitle className="mb-0">Your response</PanelTitle>
          {ret.response ? (
            <>
              <p className="m-0 whitespace-pre-wrap text-sm">{ret.response.notes}</p>
              {ret.response.evidence.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {ret.response.evidence.map((src) => (
                    <Thumb key={src} src={src} />
                  ))}
                </div>
              )}
              <Muted>Sent {formatLongDate(ret.response.respondedAt)}</Muted>
            </>
          ) : (
            <Muted>No response was sent.</Muted>
          )}
        </Panel>
      )}

      {ret.status !== "NEEDS_RESPONSE" && (
        <Panel className="flex flex-col gap-2">
          <PanelTitle className="mb-0">Aariy decision</PanelTitle>
          {ret.decision ? (
            <>
              <div>
                <StatusBadge tone={decisionToneMap[ret.decision]}>{decisionLabelMap[ret.decision]}</StatusBadge>
              </div>
              {ret.decisionNote && <Muted>{ret.decisionNote}</Muted>}
            </>
          ) : (
            <Muted>Waiting for Aariy operations: accept, partial refund or reject.</Muted>
          )}
        </Panel>
      )}
    </>
  );
}
