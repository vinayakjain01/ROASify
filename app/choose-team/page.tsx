'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { fetchCurrentUser, fetchTeams, chooseTeam, type TeamOption } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ChooseTeamPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/login'); return; }

      try {
        const me = await fetchCurrentUser();
        // Nothing to choose — admins aren't restricted by team, and a
        // member who already has one can't change it here.
        if (me.role === 'admin' || me.teamId) { router.replace('/product-analysis'); return; }
        const list = await fetchTeams();
        if (cancelled) return;
        setTeams(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load teams.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await chooseTeam(selected);
      router.replace('/product-analysis');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to set your team — please try again.');
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#8B8780] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-12 h-12 bg-[#4F46E5] rounded-xl flex items-center justify-center mb-3">
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F59E0B] rounded-full" />
          </div>
          <div className="text-[#1A1814] font-semibold text-[26px] tracking-tight leading-none">
            ROAS<span className="text-[#4F46E5]">ify</span>
          </div>
        </div>

        <div className="bg-white border border-[#EEECE5] rounded-2xl shadow-sm p-8">
          <h1 className="text-lg font-semibold text-[#1A1814] mb-1">Choose your team</h1>
          <p className="text-sm text-[#57544E] mb-6">
            This decides which brands you'll see in Live Sync. Choose carefully — only an admin can change it after this.
          </p>

          <div className="space-y-2 mb-5">
            {teams.map(t => {
              const isSelected = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  disabled={submitting}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
                    isSelected
                      ? 'border-[#4F46E5] bg-[#EEEDFB]'
                      : 'border-[#EEECE5] hover:bg-[#F2F0EA]'
                  )}
                >
                  <Users className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-[#4F46E5]' : 'text-[#8B8780]')} />
                  <span className={cn('text-sm flex-1', isSelected ? 'text-[#1A1814] font-medium' : 'text-[#1A1814]')}>
                    {t.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#4F46E5]" />}
                </button>
              );
            })}
            {teams.length === 0 && (
              <p className="text-sm text-[#8B8780] text-center py-4">No teams have been set up yet — ask your admin.</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] h-10 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              : 'Confirm team'}
          </Button>
        </div>
      </div>
    </div>
  );
}
