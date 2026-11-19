/** Seller API v1 scopes (SOW 6.3 to 6.6). */
export type ApiScope = "products:read" | "products:write" | "inventory:write" | "orders:read" | "orders:write";

export type ApiKeyStatus = "ACTIVE" | "REVOKED";

export type ApiKey = {
  id: string;
  name: string;
  /** First characters of the key, safe to show. The full secret is shown only once. */
  prefix: string;
  scopes: ApiScope[];
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt?: string | null;
};

/** Returned once on create or rotate; never stored by the portal. */
export type NewSecret = { keyId: string; name: string; secret: string };

export type ApiKeyResult = { success: boolean; message: string; secret?: NewSecret };
