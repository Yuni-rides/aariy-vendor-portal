import { TeamMember } from "./team.types";

// TODO(api): replace with GET /seller/team
export const TEAM_MOCK: TeamMember[] = [
  {
    id: "tm-owner",
    name: "Maria B",
    email: "owner@brand.pk",
    role: "OWNER",
    status: "ACTIVE",
    lastLoginAt: "2026-11-17T08:30:00Z",
  },
  {
    id: "tm-cat",
    name: "Sara Khan",
    email: "cat@brand.pk",
    role: "CATALOGUE",
    status: "ACTIVE",
    lastLoginAt: "2026-11-05T12:10:00Z",
  },
  {
    id: "tm-ops",
    name: null,
    email: "ops@brand.pk",
    role: "ORDERS",
    status: "INVITED",
    lastLoginAt: null,
    invitedAt: "2026-11-12T09:00:00Z",
  },
];
