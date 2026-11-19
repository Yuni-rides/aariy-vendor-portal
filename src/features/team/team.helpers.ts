import { format, isToday, parseISO } from "date-fns";
import type { StatusTone } from "@/components/ui/StatusBadge";
import { InviteRole, MemberStatus, TeamRole } from "./team.types";

export const roleLabelMap: Record<TeamRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CATALOGUE: "Catalogue",
  ORDERS: "Orders",
};

export const INVITE_ROLES: InviteRole[] = ["MANAGER", "CATALOGUE", "ORDERS"];

export const memberStatusLabelMap: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
};

export const memberStatusToneMap: Record<MemberStatus, StatusTone> = {
  ACTIVE: "success",
  INVITED: "warning",
};

/** Route access per role lives in features/auth/seller-access.ts. */

export const ROLE_DESCRIPTIONS = "Manager: everything except Team. Catalogue: Products and Stock. Orders: Orders and Returns.";

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

/** "Today" or "05 Nov" */
export const formatLastLogin = (iso: string | null) => {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isToday(d) ? "Today" : format(d, "dd MMM");
};
