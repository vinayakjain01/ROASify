'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Already signed in? Skip straight past the login form.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        router.replace('/product-analysis');
      } else {
        setCheckingSession(false);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message || 'Could not sign in — please try again.');
      setSubmitting(false);
      return;
    }
    router.replace('/product-analysis');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#8B8780] animate-spin" />
      </div>
    );
  }

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

        {/* Card */}
        <div className="bg-white border border-[#EEECE5] rounded-2xl shadow-sm p-8">
          <h1 className="text-lg font-semibold text-[#1A1814] mb-1">Sign in</h1>
          <p className="text-sm text-[#57544E] mb-6">Use your ROASify account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8780]" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EEECE5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8780]" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
                : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-xs text-[#8B8780] text-center mt-5">
          Don&apos;t have an account? Contact your workspace admin.
        </p>
      </div>
    </div>
  );
}
