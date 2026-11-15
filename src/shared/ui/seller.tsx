"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Small building blocks that match the Seller portal design
 * (cards, page header, chips, buttons, form fields, tables).
 */

/* ---------------- Buttons ---------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
};

export const btnClass = (primary?: boolean, className?: string) =>
  cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-[11px] text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
    primary ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
    className,
  );

export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ primary, className, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={btnClass(primary, className)} {...props} />
  ),
);
Btn.displayName = "Btn";

/* ---------------- Layout ---------------- */

export function PageHeader({
  title,
  crumb,
  children,
}: {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {crumb && <div className="text-[13px] text-muted-foreground">{crumb}</div>}
        <h1 className="m-0 text-2xl font-semibold">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 rounded-2xl border border-border bg-white p-[18px]", className)}
      {...props}
    />
  );
}

export function PanelTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("m-0 mb-3 text-[15px] font-semibold", className)} {...props} />;
}

export function Muted({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-[13px] text-muted-foreground", className)} {...props} />;
}

/** Label / value row used in summaries ("COD amount ... PKR 5,000"). */
export function SummaryRow({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/* ---------------- Chips (status tabs) ---------------- */

export type ChipOption<T extends string> = { value: T; label: string; count?: number };

export function ChipTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-11 cursor-pointer rounded-[10px] border px-3.5 py-2.5 text-sm font-medium",
              on
                ? "border-foreground bg-foreground text-white"
                : "border-input bg-white text-foreground hover:bg-muted",
            )}
          >
            {o.label}
            {o.count !== undefined && ` · ${o.count}`}
          </button>
        );
      })}
    </div>
  );
}

/** Selectable row in a master list (orders, returns). */
export function ListItem({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "w-full cursor-pointer rounded-[10px] px-3 py-2.5 text-left hover:bg-muted",
        active && "bg-secondary font-semibold hover:bg-secondary",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Form fields ---------------- */

export const fieldClass =
  "w-full min-h-11 rounded-[10px] border border-input bg-white px-3 py-[11px] text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted read-only:bg-muted/60";

export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ---------------- Table ---------------- */

export function DataTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("whitespace-nowrap p-2 text-left text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-t border-border px-2 py-3", className)} {...props} />;
}

/* ---------------- Image placeholder ---------------- */

export function Thumb({
  src,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { src?: string }) {
  return (
    <div
      className={cn(
        "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-dashed border-[#D9805B] bg-secondary",
        src && "border-solid border-border",
        className,
      )}
      {...props}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{children}</div>;
}
