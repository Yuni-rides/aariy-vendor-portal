"use client";

import { FormEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import {
  Btn,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  PanelTitle,
  Td,
  Th,
  fieldClass,
} from "@/shared/ui/seller";
import { useTeamStore } from "../team.store";
import { InviteRole, TeamMember, TeamResult } from "../team.types";
import {
  INVITE_ROLES,
  ROLE_DESCRIPTIONS,
  formatLastLogin,
  isValidEmail,
  memberStatusLabelMap,
  memberStatusToneMap,
  roleLabelMap,
} from "../team.helpers";

export default function TeamPage() {
  const { members, loading, saving, error, fetchTeam, invite, resendInvite, removeMember } = useTeamStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("MANAGER");
  const [emailError, setEmailError] = useState<string>();
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const notify = (res: TeamResult) => toast({ title: res.message, variant: res.success ? "default" : "destructive" });

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    const res = await invite(email, role);
    if (res.success) {
      setEmail("");
      setEmailError(undefined);
      notify(res);
    } else {
      setEmailError(res.message);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Team" />

      <Panel>
        <form className="flex flex-wrap gap-3" onSubmit={handleInvite} noValidate>
          <Field label="Email" htmlFor="e" error={emailError} className="min-w-[180px] flex-1">
            <input
              id="e"
              type="email"
              autoComplete="off"
              className={fieldClass}
              placeholder="name@brand.pk"
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
                if (emailError) setEmailError(undefined);
              }}
            />
          </Field>
          <Field label="Role" htmlFor="r" className="min-w-[180px] flex-1">
            <select id="r" className={fieldClass} value={role} onChange={(ev) => setRole(ev.target.value as InviteRole)}>
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabelMap[r]}
                </option>
              ))}
            </select>
          </Field>
          <div className="self-end pb-px">
            <Btn primary type="submit" disabled={saving}>
              Send invite
            </Btn>
          </div>
        </form>
      </Panel>

      <Panel>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <DataTable>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last login</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <Td>
                  {m.name ?? <span className="text-muted-foreground">Invite pending</span>}
                  <br />
                  <span className="text-[13px] text-muted-foreground">{m.email}</span>
                </Td>
                <Td>{roleLabelMap[m.role]}</Td>
                <Td>
                  <StatusBadge tone={memberStatusToneMap[m.status]}>{memberStatusLabelMap[m.status]}</StatusBadge>
                </Td>
                <Td>{formatLastLogin(m.lastLoginAt)}</Td>
                <Td className="text-right">
                  {m.role === "OWNER" ? (
                    "—"
                  ) : (
                    <div className="flex flex-wrap justify-end gap-2">
                      {m.status === "INVITED" && (
                        <Btn disabled={saving} onClick={async () => notify(await resendInvite(m.id))}>
                          Resend
                        </Btn>
                      )}
                      <Btn disabled={saving} onClick={() => setToRemove(m)}>
                        {m.status === "INVITED" ? "Cancel invite" : "Remove"}
                      </Btn>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {loading && <EmptyState>Loading...</EmptyState>}
      </Panel>

      <Panel>
        <PanelTitle>What each role sees</PanelTitle>
        <p className="m-0 text-[13px] text-muted-foreground">{ROLE_DESCRIPTIONS}</p>
      </Panel>

      <ConfirmDialog
        open={!!toRemove}
        title={toRemove?.status === "INVITED" ? "Cancel this invite?" : `Remove ${toRemove?.name ?? toRemove?.email}?`}
        description={
          toRemove?.status === "INVITED"
            ? `The invite link sent to ${toRemove?.email} will stop working.`
            : `${toRemove?.email} will lose access to the seller portal straight away. You can invite them again later.`
        }
        confirmLabel={toRemove?.status === "INVITED" ? "Cancel invite" : "Remove"}
        destructive
        loading={saving}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          const res = await removeMember(toRemove.id);
          setToRemove(null);
          notify(res);
        }}
      />
    </div>
  );
}
