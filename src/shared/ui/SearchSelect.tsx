"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/shared/ui/seller";

export type SearchOption = { id: string; label: string; sub?: string; /** Extra value the caller needs back, e.g. a country code. */ code?: string };
export type SearchPage = { items: SearchOption[]; hasMore: boolean };

/**
 * Dropdown that loads its options from the API, page by page, with a search box.
 * Typing waits a moment before searching so each key press does not send a request.
 */
export function SearchSelect({
  id,
  value,
  valueLabel,
  placeholder = "Choose",
  searchPlaceholder = "Search",
  disabled,
  invalid,
  load,
  onChange,
  emptyText = "Nothing found",
}: {
  id: string;
  value: string;
  /** Label of the current value, so it shows before the list is loaded. */
  valueLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  load: (search: string, page: number) => Promise<SearchPage>;
  onChange: (option: SearchOption | null) => void;
  emptyText?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SearchOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  // Ignore answers to older searches that arrive late.
  const requestRef = useRef(0);

  const fetchPage = useCallback(
    async (q: string, p: number) => {
      const req = ++requestRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = await load(q, p);
        if (req !== requestRef.current) return;
        setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items.filter((x) => !prev.some((y) => y.id === x.id))]));
        setHasMore(res.hasMore);
        setPage(p);
        if (p === 1) setActive(0);
      } catch (e: any) {
        if (req !== requestRef.current) return;
        setError(e?.response?.data?.message ?? "Could not load the list.");
      } finally {
        if (req === requestRef.current) setLoading(false);
      }
    },
    [load],
  );

  // Search when the box opens and after typing stops for 300 ms.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchPage(search, 1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [open, search, fetchPage]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setSearch("");
  }, [open]);

  const choose = (o: SearchOption) => {
    onChange(o);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) choose(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    if (hasMore && !loading && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) fetchPage(search, page + 1);
  };

  const label = value ? valueLabel || items.find((i) => i.id === value)?.label || "Selected" : "";

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          fieldClass,
          "flex cursor-pointer items-center justify-between gap-2 text-left read-only:bg-white disabled:bg-muted",
          invalid && "border-destructive",
        )}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>{label || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-[10px] border border-border bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-label={searchPlaceholder}
              className="min-h-10 w-full bg-transparent text-sm outline-none"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {search && (
              <button type="button" aria-label="Clear search" className="cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul id={listId} role="listbox" className="m-0 max-h-60 list-none overflow-y-auto p-1" onScroll={onScroll}>
            {items.map((o, i) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                  i === active && "bg-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                </span>
                {o.id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </li>
            ))}
            {loading && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </li>
            )}
            {!loading && error && (
              <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-destructive">
                {error}
                <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => fetchPage(search, page)}>
                  Retry
                </button>
              </li>
            )}
            {!loading && !error && items.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
