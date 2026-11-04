'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react';
import {
  fetchCurrentUser,
  fetchAdminTeams, createAdminTeam,
  fetchAdminUsers, updateAdminUser, inviteAdminUser, deleteAdminUser,
  fetchAdminBrandNames, createAdminBrandName, deleteAdminBrandName,
  fetchAdminBrandAssignments, setAdminBrandAssignment,
  type AdminTeam, type AdminUser, type AdminBrandName, type AdminBrandAssignment,
} from '@/lib/api';

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-[#EEECE5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]';

function TeamSelect({
  teams, value, onChange, allowNone = false, placeholder = 'Select team',
}: {
  teams: AdminTeam[];
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  placeholder?: string;
}) {
  return (
    <Select value={value ?? '__none__'} onValueChange={v => onChange(v === '__none__' ? null : v)}>
      <SelectTrigger className="w-full h-9 bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none__">No team</SelectItem>}
        {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then(u => {
        if (cancelled) return;
        if (u.role !== 'admin') { router.replace('/product-analysis'); return; }
        setAllowed(true);
      })
      .catch(() => { if (!cancelled) router.replace('/product-analysis'); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [router]);

  const breadcrumbs = [
    { label: 'Workspace' },
    { label: 'Admin' },
    { label: 'Teams & Access' },
  ];

  if (checking || !allowed) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#8B8780] animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-1">Teams &amp; Access</h1>
        <p className="text-[#57544E] text-sm">
          Manage teams, who's on them, and which GrowifyOS brands each team can see in Live Sync.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="assignments">Brand Assignments</TabsTrigger>
          <TabsTrigger value="pending">Pending by Name</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="teams" className="mt-4"><TeamsTab /></TabsContent>
        <TabsContent value="assignments" className="mt-4"><AssignmentsTab /></TabsContent>
        <TabsContent value="pending" className="mt-4"><PendingTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

// ── Teams ────────────────────────────────────────────────────────────────

function TeamsTab() {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAdminTeams().then(setTeams).catch(e => setError(e?.message ?? 'Failed to load teams.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await createAdminTeam(name);
      setNewName('');
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#EEECE5] p-5 space-y-4">
      <div className="flex items-end gap-2 max-w-md">
        <div className="flex-1">
          <label className="text-xs font-medium text-[#57544E] mb-1.5 block">New team name</label>
          <input
            className={inputClass}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Team 5"
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />
        </div>
        <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="bg-[#4F46E5] hover:bg-[#4338CA] h-9">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#57544E]"><Spinner className="w-4 h-4" /> Loading teams…</div>
      ) : (
        <div className="divide-y divide-[#EEECE5]">
          {teams.map(t => (
            <div key={t.id} className="py-2.5 text-sm text-[#1A1814]">{t.name}</div>
          ))}
          {teams.length === 0 && <p className="text-sm text-[#8B8780] py-2.5">No teams yet.</p>}
        </div>
      )}
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownId, setOwnId] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchAdminUsers(), fetchAdminTeams()])
      .then(([u, t]) => { setUsers(u); setTeams(t); })
      .catch(e => setError(e?.message ?? 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchCurrentUser().then(u => setOwnId(u.id)).catch(() => {}); }, []);

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Delete ${user.email}? They'll immediately lose access and have to be re-invited.`)) return;
    setDeletingId(user.id);
    setError(null);
    try {
      await deleteAdminUser(user.id);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await inviteAdminUser(email);
      setInviteSuccess(`Invited ${email} — they'll get an email to set their password.`);
      setInviteEmail('');
      load();
    } catch (e: any) {
      setInviteError(e?.message ?? 'Failed to invite user.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (user: AdminUser, role: string) => {
    setSavingId(user.id);
    setError(null);
    try {
      await updateAdminUser(user.id, { role });
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update role.');
    } finally {
      setSavingId(null);
    }
  };

  const handleTeamChange = async (user: AdminUser, teamId: string | null) => {
    setSavingId(user.id);
    setError(null);
    try {
      await updateAdminUser(user.id, { teamId });
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update team.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-[#EEECE5] p-5">
        <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Invite a new user</label>
        <div className="flex items-end gap-2 max-w-md">
          <input
            className={inputClass}
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
          />
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-[#4F46E5] hover:bg-[#4338CA] h-9 flex-shrink-0">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
          </Button>
        </div>
        <p className="text-xs text-[#8B8780] mt-2">
          They'll get an email with a link to set their own password, then appear below — assign their role and team here.
        </p>
        {inviteError && <p className="text-xs text-red-600 mt-2">{inviteError}</p>}
        {inviteSuccess && <p className="text-xs text-[#047857] mt-2">{inviteSuccess}</p>}
      </div>

      <div className="bg-white rounded-xl border border-[#EEECE5] overflow-hidden">
      {error && <p className="text-xs text-red-600 px-5 pt-4">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#57544E] p-5"><Spinner className="w-4 h-4" /> Loading users…</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#EEECE5] text-left text-xs text-[#8B8780] uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium w-40">Role</th>
              <th className="px-5 py-3 font-medium w-56">Team</th>
              <th className="px-5 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[#EEECE5] last:border-0">
                <td className="px-5 py-3 text-[#1A1814]">{u.email}</td>
                <td className="px-5 py-3">
                  <Select value={u.role} onValueChange={v => handleRoleChange(u, v)} disabled={savingId === u.id}>
                    <SelectTrigger className="w-full h-9 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-5 py-3">
                  <TeamSelect
                    teams={teams}
                    value={u.teamId}
                    onChange={v => handleTeamChange(u, v)}
                    allowNone
                    placeholder="No team"
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  {u.id !== ownId && (
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={deletingId === u.id}
                      className="p-1.5 rounded-md text-[#8B8780] hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete user"
                    >
                      {deletingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#8B8780]">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}

// ── Brand Assignments (live GrowifyOS brands) ────────────────────────────

function AssignmentsTab() {
  const [brands, setBrands] = useState<AdminBrandAssignment[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchAdminBrandAssignments(), fetchAdminTeams()])
      .then(([b, t]) => { setBrands(b); setTeams(t); })
      .catch(e => setError(e?.message ?? 'Failed to load brands.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = async (brandId: string, teamId: string | null) => {
    setSavingId(brandId);
    setError(null);
    try {
      await setAdminBrandAssignment(brandId, teamId);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update assignment.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8B8780]">
        These are the brands currently connected on GrowifyOS. A brand whose name matches an entry in{' '}
        <span className="font-medium text-[#57544E]">Pending by Name</span> gets assigned here automatically —
        you only need to use this tab for exceptions or brands with no pending match.
      </p>
      <div className="bg-white rounded-xl border border-[#EEECE5] overflow-hidden">
        {error && <p className="text-xs text-red-600 px-5 pt-4">{error}</p>}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#57544E] p-5"><Spinner className="w-4 h-4" /> Loading brands…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EEECE5] text-left text-xs text-[#8B8780] uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Brand</th>
                <th className="px-5 py-3 font-medium">Brand ID</th>
                <th className="px-5 py-3 font-medium w-56">Team</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.brandId} className="border-b border-[#EEECE5] last:border-0">
                  <td className="px-5 py-3 text-[#1A1814]">{b.name}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[#8B8780]">{b.brandId}</td>
                  <td className="px-5 py-3">
                    <TeamSelect
                      teams={teams}
                      value={b.teamId}
                      onChange={v => handleChange(b.brandId, v)}
                      allowNone
                      placeholder="Unassigned"
                    />
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-[#8B8780]">No brands connected yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Pending by Name ───────────────────────────────────────────────────────

function PendingTab() {
  const [names, setNames] = useState<AdminBrandName[]>([]);
  const [liveBrandNames, setLiveBrandNames] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newBrandName, setNewBrandName] = useState('');
  const [newTeamId, setNewTeamId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchAdminBrandNames(), fetchAdminTeams(), fetchAdminBrandAssignments()])
      .then(([n, t, live]) => {
        setNames(n);
        setTeams(t);
        setLiveBrandNames(new Set(live.map(b => b.name.trim().toLowerCase())));
      })
      .catch(e => setError(e?.message ?? 'Failed to load pending brand names.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const brandName = newBrandName.trim();
    if (!brandName || !newTeamId) return;
    setAdding(true);
    setError(null);
    try {
      await createAdminBrandName(brandName, newTeamId);
      setNewBrandName('');
      setNewTeamId(null);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add brand name.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAdminBrandName(id);
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to remove entry.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8B8780]">
        Plan a brand's team before it's even connected on GrowifyOS — e.g. from a spreadsheet your teammate sends
        you. The moment a brand with a matching name goes live, it's automatically assigned to this team, with
        no further action needed here.
      </p>

      <div className="bg-white rounded-xl border border-[#EEECE5] p-5">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Brand name</label>
            <input
              className={inputClass}
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              placeholder="e.g. Angad Singh Official"
            />
          </div>
          <div className="w-48">
            <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Team</label>
            <TeamSelect teams={teams} value={newTeamId} onChange={setNewTeamId} />
          </div>
          <Button
            onClick={handleAdd}
            disabled={adding || !newBrandName.trim() || !newTeamId}
            className="bg-[#4F46E5] hover:bg-[#4338CA] h-9"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EEECE5] overflow-hidden">
        {error && <p className="text-xs text-red-600 px-5 pt-4">{error}</p>}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#57544E] p-5"><Spinner className="w-4 h-4" /> Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EEECE5] text-left text-xs text-[#8B8780] uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Brand name</th>
                <th className="px-5 py-3 font-medium">Team</th>
                <th className="px-5 py-3 font-medium w-32">Status</th>
                <th className="px-5 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {names.map(n => {
                const resolved = liveBrandNames.has(n.brandName.trim().toLowerCase());
                return (
                  <tr key={n.id} className="border-b border-[#EEECE5] last:border-0">
                    <td className="px-5 py-3 text-[#1A1814]">{n.brandName}</td>
                    <td className="px-5 py-3 text-[#57544E]">{n.teamName}</td>
                    <td className="px-5 py-3">
                      {resolved ? (
                        <span className="inline-flex items-center gap-1.5 text-[#047857] text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#8B8780] text-xs">
                          <Clock className="w-3.5 h-3.5" /> Waiting
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={deletingId === n.id}
                        className="p-1.5 rounded-md text-[#8B8780] hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        {deletingId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {names.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-[#8B8780]">No pending brand names yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
