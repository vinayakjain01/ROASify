'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type Status = 'checking' | 'ready' | 'invalid';

export default function AcceptInvitePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Supabase's JS client auto-parses the #access_token=... fragment from the
  // invite link and establishes a session before this ever runs. We just
  // wait for that to land (or for it to tell us the link was bad).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('error')) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) setStatus('ready');
    });

    // In case the session was already established before this listener
    // attached (hash parsing can finish very fast).
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setStatus('ready');
    });

    const timeout = setTimeout(() => {
      if (!cancelled) setStatus(s => (s === 'checking' ? 'invalid' : s));
    }, 8000);

    return () => { cancelled = true; subscription.subscription.unsubscribe(); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message || 'Could not set your password — please try again.');
      setSubmitting(false);
      return;
    }
    router.replace('/product-analysis');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-12 h-12 bg-[#4F46E5] rounded-xl flex items-center justify-center mb-3">
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F59E0B] rounded-full" />
          </div>
          <div className="text-[#1A1814] font-semibold text-[26px] tracking-tight leading-none">
            ROAS<span className="text-[#4F46E5]">ify</span>
          </div>
          <p className="text-[#8B8780] text-xs mt-2">Product ROAS Analytics for D2C Brands</p>
        </div>

        <div className="bg-white border border-[#EEECE5] rounded-2xl shadow-sm p-8">
          {status === 'checking' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="w-5 h-5 text-[#8B8780] animate-spin" />
              <p className="text-sm text-[#57544E]">Checking your invite link…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center py-4 gap-3 text-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-[#1A1814] font-medium">This invite link is invalid or has expired.</p>
              <p className="text-xs text-[#8B8780]">Ask your admin to send you a new invite from Teams &amp; Access.</p>
            </div>
          )}

          {status === 'ready' && (
            <>
              <h1 className="text-lg font-semibold text-[#1A1814] mb-1">Set your password</h1>
              <p className="text-sm text-[#57544E] mb-6">Choose a password to finish setting up your ROASify account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#57544E] mb-1.5 block">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8780]" />
                    <input
                      type="password"
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EEECE5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8780]" />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EEECE5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#4F46E5] hover:bg-[#4338CA] h-10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting password…</>
                    : 'Set password & continue'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
