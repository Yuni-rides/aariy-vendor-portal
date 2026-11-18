import { create } from "zustand";
import { TEAM_MOCK } from "./team.mock";
import { InviteRole, TeamMember, TeamResult } from "./team.types";
import { isValidEmail } from "./team.helpers";

type TeamStore = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
  members: TeamMember[];

  fetchTeam: () => Promise<void>;
  invite: (email: string, role: InviteRole) => Promise<TeamResult>;
  resendInvite: (id: string) => Promise<TeamResult>;
  removeMember: (id: string) => Promise<TeamResult>;
};

const fail = (e: any, fallback: string): TeamResult => ({
  success: false,
  message: e?.response?.data?.message ?? fallback,
});

export const useTeamStore = create<TeamStore>((set, get) => ({
  loading: false,
  saving: false,
  error: null,
  loaded: false,
  members: [],

  fetchTeam: async () => {
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      // TODO(api): const res = await teamApi.list();
      set({ members: TEAM_MOCK, loading: false, loaded: true });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
    }
  },

  invite: async (rawEmail, role) => {
    const email = rawEmail.trim().toLowerCase();
    if (!isValidEmail(email)) return { success: false, message: "Enter a valid email address." };
    if (get().members.some((m) => m.email.toLowerCase() === email)) {
      return { success: false, message: "This person is already on your team." };
    }
    set({ saving: true });
    try {
      // TODO(api): await teamApi.invite({ email, role }); the backend emails the invite link.
      const now = new Date().toISOString();
      set({
        members: [
          ...get().members,
          { id: `tm-${Date.now()}`, name: null, email, role, status: "INVITED", lastLoginAt: null, invitedAt: now },
        ],
        saving: false,
      });
      return { success: true, message: `Invite sent to ${email}.` };
    } catch (e: any) {
      set({ saving: false });
      return fail(e, "Could not send invite");
    }
  },

  resendInvite: async (id) => {
    const m = get().members.find((x) => x.id === id);
    if (!m || m.status !== "INVITED") return { success: false, message: "This invite is no longer pending." };
    set({ saving: true });
    try {
      // TODO(api): await teamApi.resendInvite(id);
      set({
        members: get().members.map((x) => (x.id === id ? { ...x, invitedAt: new Date().toISOString() } : x)),
        saving: false,
      });
      return { success: true, message: `Invite sent again to ${m.email}.` };
    } catch (e: any) {
      set({ saving: false });
      return fail(e, "Could not resend invite");
    }
  },

  removeMember: async (id) => {
    const m = get().members.find((x) => x.id === id);
    if (!m) return { success: false, message: "Member not found" };
    if (m.role === "OWNER") return { success: false, message: "The owner cannot be removed." };
    set({ saving: true });
    try {
      // TODO(api): await teamApi.remove(id); this also signs them out.
      set({ members: get().members.filter((x) => x.id !== id), saving: false });
      return { success: true, message: `${m.name ?? m.email} removed from your team.` };
    } catch (e: any) {
      set({ saving: false });
      return fail(e, "Could not remove member");
    }
  },
}));
