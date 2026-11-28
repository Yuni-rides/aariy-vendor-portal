"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { Btn, fieldClass } from "@/shared/ui/seller";
import { useProductsStore } from "../products.store";
import type { SizeChart } from "../products.types";

const cell = cn(fieldClass, "min-h-10 min-w-[72px] px-2.5 py-2");

const START = {
  name: "",
  unit: "CM" as SizeChart["unit"],
  columns: ["Size", "Chest", "Length"],
  rows: [["", "", ""]],
};

/**
 * New brand size chart (POST /seller/size-charts). Saved charts can be reused on the brand's other products.
 * At least 2 columns and 1 row; every row needs one value per column.
 */
export function SizeChartDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (chart: SizeChart) => void;
}) {
  const { saving, createSizeChart } = useProductsStore();
  const [draft, setDraft] = useState(START);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDraft(START);
    setError(null);
  };

  const setColumn = (c: number, v: string) => setDraft((d) => ({ ...d, columns: d.columns.map((x, i) => (i === c ? v : x)) }));
  const setCell = (r: number, c: number, v: string) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) }));
  const addRow = () => setDraft((d) => ({ ...d, rows: [...d.rows, d.columns.map(() => "")] }));
  const removeRow = (r: number) => setDraft((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== r) }));
  const addColumn = () => setDraft((d) => ({ ...d, columns: [...d.columns, ""], rows: d.rows.map((row) => [...row, ""]) }));
  const removeColumn = (c: number) =>
    setDraft((d) => ({ ...d, columns: d.columns.filter((_, i) => i !== c), rows: d.rows.map((row) => row.filter((_, i) => i !== c)) }));

  const save = async () => {
    const name = draft.name.trim();
    const columns = draft.columns.map((c) => c.trim());
    const rows = draft.rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some(Boolean));
    if (!name) return setError("Give the chart a name.");
    if (columns.length < 2 || columns.some((c) => !c)) return setError("Name every column; at least 2 columns.");
    if (rows.length < 1) return setError("Add at least one row.");
    if (rows.some((r) => r.some((x) => !x))) return setError("Every row needs one value per column.");
    setError(null);
    const res = await createSizeChart({ name, unit: draft.unit, columns, rows });
    if (!res.success || !res.chart) {
      toast({ title: res.message, variant: "destructive" });
      return;
    }
    toast({ title: res.message });
    onSaved(res.chart);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New size chart</DialogTitle>
          <DialogDescription>For your brand. You can reuse it on your other products.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="sc-name" className="mb-1.5 block text-[13px] font-medium">
              Chart name
            </label>
            <input
              id="sc-name"
              className={fieldClass}
              maxLength={80}
              placeholder="e.g. Kurta regular"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="sc-unit" className="mb-1.5 block text-[13px] font-medium">
              Unit
            </label>
            <select
              id="sc-unit"
              className={fieldClass}
              value={draft.unit}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value as SizeChart["unit"] }))}
            >
              <option value="CM">CM</option>
              <option value="IN">Inch</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">Table</span>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {draft.columns.map((c, ci) => (
                    <th key={ci} className="pb-1.5 pr-1.5 align-top">
                      <div className="flex items-center gap-1">
                        <input
                          aria-label={`Column ${ci + 1} name`}
                          className={cn(cell, "bg-[#FBF8F6] font-semibold")}
                          value={c}
                          readOnly={ci === 0}
                          onChange={(e) => setColumn(ci, e.target.value)}
                        />
                        {ci > 0 && draft.columns.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Remove column ${c || ci + 1}`}
                            className="cursor-pointer rounded p-1 text-muted-foreground hover:text-destructive"
                            onClick={() => removeColumn(ci)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((x, ci) => (
                      <td key={ci} className="pb-1.5 pr-1.5">
                        <input
                          aria-label={`Row ${ri + 1} ${draft.columns[ci] || `column ${ci + 1}`}`}
                          className={cell}
                          inputMode={ci === 0 ? undefined : "decimal"}
                          value={x}
                          onChange={(e) => setCell(ri, ci, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="pb-1.5">
                      {draft.rows.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove row ${ri + 1}`}
                          className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                          onClick={() => removeRow(ri)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn className="min-h-10 py-2" onClick={addRow}>
              + Add row
            </Btn>
            <Btn className="min-h-10 border border-input bg-white py-2" onClick={addColumn}>
              + Add column
            </Btn>
          </div>
          <p className="m-0 text-xs text-muted-foreground">At least 2 columns and 1 row. Every row needs one value per column.</p>
          {error && <p className="m-0 text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Btn className="border border-input bg-white" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Btn>
          <Btn primary onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save chart"}
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
