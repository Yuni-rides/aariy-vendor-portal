export type TeamRole = "OWNER" | "MANAGER" | "CATALOGUE" | "ORDERS";

/** Roles the owner can give when inviting (there is only one owner). */
export type InviteRole = Exclude<TeamRole, "OWNER">;

export type MemberStatus = "ACTIVE" | "INVITED";

export type TeamMember = {
  id: string;
  /** Empty until the invited person accepts and sets up their account. */
  name: string | null;
  email: string;
  role: TeamRole;
  status: MemberStatus;
  lastLoginAt: string | null;
  invitedAt?: string | null;
};

export type TeamResult = { success: boolean; message: string };
