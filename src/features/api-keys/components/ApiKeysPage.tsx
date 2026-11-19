"use client";

import { FormEvent, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatDateTime, formatLongDate } from "@/features/orders/orders.helpers";
import { Btn, DataTable, EmptyState, Field, Muted, PageHeader, Panel, PanelTitle, Td, Th, fieldClass } from "@/shared/ui/seller";
import { MAX_ACTIVE_KEYS, useApiKeysStore } from "../api-keys.store";
import { ApiKey, ApiKeyResult, ApiScope, NewSecret } from "../api-keys.types";

const SCOPES: { value: ApiScope; label: string; hint: string }[] = [
  { value: "products:read", label: "Read products", hint: "List products and variants" },
  { value: "products:write", label: "Edit products", hint: "Create and update products (changes go to review)" },
  { value: "inventory:write", label: "Update stock", hint: "Set stock per variant" },
  { value: "orders:read", label: "Read orders", hint: "List your parcels" },
  { value: "orders:write", label: "Manage orders", hint: "Accept and record dispatch" },
];

const scopeLabel = (s: ApiScope) => SCOPES.find((x) => x.value === s)?.label ?? s;

export default function ApiKeysPage() {
  const { keys, loading, saving, error, fetchKeys, rotateKey, revokeKey } = useApiKeysStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<NewSecret | null>(null);
  const [confirm, setConfirm] = useState<{ key: ApiKey; action: "rotate" | "revoke" } | null>(null);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleResult = (res: ApiKeyResult) => {
    if (res.secret) setSecret(res.secret);
    else toast({ title: res.message, variant: res.success ? "default" : "destructive" });
  };

  const active = keys.filter((k) => k.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="API keys">
        <Btn primary onClick={() => setCreateOpen(true)} disabled={active >= MAX_ACTIVE_KEYS}>
          Create key
        </Btn>
      </PageHeader>

      <Panel>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <DataTable>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Key</Th>
              <Th>Permissions</Th>
              <Th>Created</Th>
              <Th>Last used</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className={k.status === "REVOKED" ? "text-muted-foreground" : undefined}>
                <Td className="font-medium">{k.name}</Td>
                <Td className="whitespace-nowrap font-mono text-xs">{k.prefix}…</Td>
                <Td className="text-[13px]">{k.scopes.map(scopeLabel).join(", ")}</Td>
                <Td className="whitespace-nowrap">{formatLongDate(k.createdAt)}</Td>
                <Td className="whitespace-nowrap">{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "Never"}</Td>
                <Td>
                  <StatusBadge tone={k.status === "ACTIVE" ? "success" : "neutral"}>
                    {k.status === "ACTIVE" ? "Active" : "Revoked"}
                  </StatusBadge>
                </Td>
                <Td className="text-right">
                  {k.status === "ACTIVE" ? (
                    <div className="flex justify-end gap-2">
                      <Btn disabled={saving} onClick={() => setConfirm({ key: k, action: "rotate" })}>
                        Rotate
                      </Btn>
                      <Btn disabled={saving} onClick={() => setConfirm({ key: k, action: "revoke" })}>
                        Revoke
                      </Btn>
                    </div>
                  ) : (
                    <span className="text-[13px]">{k.revokedAt ? `Revoked ${formatLongDate(k.revokedAt)}` : "—"}</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {loading && <EmptyState>Loading...</EmptyState>}
        {!loading && keys.length === 0 && <EmptyState>No API keys yet</EmptyState>}
      </Panel>

      <Panel>
        <PanelTitle>About the Seller API</PanelTitle>
        <p className="m-0 text-[13px] text-muted-foreground">
          Use a key to connect your own system to Aariy: list and update products, update stock, list orders, accept them
          and record dispatch. Each key only does what its permissions allow. Requests are rate limited per key, and write
          requests take an idempotency key so a retry never applies twice. Keep keys secret: anyone with a key can act for
          your brand. You can have up to {MAX_ACTIVE_KEYS} active keys.
        </p>
        {/* TODO: link the OpenAPI docs and quick-start guide once published (SOW 6.8). */}
      </Panel>

      <CreateKeyModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleResult} />
      <SecretModal secret={secret} onClose={() => setSecret(null)} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === "rotate" ? `Rotate "${confirm?.key.name}"?` : `Revoke "${confirm?.key.name}"?`}
        description={
          confirm?.action === "rotate"
            ? "You get a new secret and the current one stops working. Update your app with the new secret straight away."
            : "Apps using this key stop working within a minute. This cannot be undone."
        }
        confirmLabel={confirm?.action === "rotate" ? "Rotate key" : "Revoke key"}
        destructive
        loading={saving}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const res = confirm.action === "rotate" ? await rotateKey(confirm.key.id) : await revokeKey(confirm.key.id);
          setConfirm(null);
          handleResult(res);
        }}
      />
    </div>
  );
}

function CreateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (res: ApiKeyResult) => void;
}) {
  const { saving, createKey } = useApiKeysStore();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["products:read", "orders:read"]);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await createKey(name, scopes);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setName("");
    setError(undefined);
    onClose();
    onCreated(res);
  };

  return (
    <Modal open={open} onClose={onClose} className="h-auto max-h-[90vh] max-w-lg overflow-y-auto">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="m-0 text-lg font-semibold">Create API key</h2>
        <Field label="Name" htmlFor="kn">
          <input id="kn" className={fieldClass} placeholder="e.g. Warehouse ERP sync" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-[13px] text-muted-foreground">Permissions</legend>
          {SCOPES.map((s) => (
            <label key={s.value} className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#B8532F]"
                checked={scopes.includes(s.value)}
                onChange={(e) =>
                  setScopes((cur) => (e.target.checked ? [...cur, s.value] : cur.filter((x) => x !== s.value)))
                }
              />
              <span>
                {s.label}
                <span className="block text-xs text-muted-foreground">{s.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <p className="m-0 text-xs text-destructive">{error}</p>}
        <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary type="submit" disabled={saving}>
            Create key
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function SecretModal({ secret, onClose }: { secret: NewSecret | null; onClose: () => void }) {
  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.secret);
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Could not copy. Select the key and copy it.", variant: "destructive" });
    }
  };

  return (
    <Modal open={!!secret} onClose={onClose} className="h-auto max-w-lg">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="m-0 text-lg font-semibold">Copy your key now</h2>
        <Muted>
          This is the only time the secret for “{secret?.name}” is shown. Store it somewhere safe, such as your server’s
          secret manager.
        </Muted>
        <div className="flex items-center gap-2 rounded-[10px] border border-input bg-muted/60 p-3">
          <code className="min-w-0 flex-1 break-all text-xs">{secret?.secret}</code>
          <button type="button" aria-label="Copy key" onClick={copy} className="cursor-pointer rounded-lg p-2 hover:bg-white">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end">
          <Btn primary onClick={onClose}>
            I have stored it
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
