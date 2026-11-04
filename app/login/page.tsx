'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { fetchCurrentUser } from '@/lib/api';

const GOOGLE_ALLOWED_DOMAIN = 'growify.in';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.27-2.09 3.57-5.17 3.57-8.84z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.9l-3.89-3.02c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.3v3.09C3.28 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.58.39-2.31V6.6H1.3A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.3 5.4l4.01-3.09z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.28 2.7 1.3 6.6l4.01 3.09C6.25 6.87 8.89 4.77 12 4.77z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [googleWaiting, setGoogleWaiting] = useState(false);
  const [googleError, setGoogleError]     = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Fires the moment the popup's Google sign-in completes — its own page
  // writes the new session to localStorage, which this tab's Supabase
  // client picks up automatically and re-emits here as SIGNED_IN.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session) return;

      popupRef.current?.close();
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

      const provider = (session.user.app_metadata as any)?.provider;
      const signInEmail = session.user.email ?? '';
      if (provider === 'google' && !signInEmail.toLowerCase().endsWith(`@${GOOGLE_ALLOWED_DOMAIN}`)) {
        await supabase.auth.signOut();
        setGoogleWaiting(false);
        setGoogleError(`Please log in with your @${GOOGLE_ALLOWED_DOMAIN} Google account.`);
        return;
      }

      setGoogleWaiting(false);
      try {
        const me = await fetchCurrentUser();
        router.replace(me.role === 'member' && !me.teamId ? '/choose-team' : '/product-analysis');
      } catch {
        router.replace('/product-analysis');
      }
    });
    return () => subscription.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleGoogleSignIn = async () => {
    setGoogleError(null);

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data?.url) {
      setGoogleError(error?.message ?? 'Could not start Google sign-in.');
      return;
    }

    const popup = window.open(data.url, 'roasify-google-signin', 'width=480,height=640');
    if (!popup) {
      setGoogleError('Please allow pop-ups for this site and try again.');
      return;
    }
    popupRef.current = popup;
    setGoogleWaiting(true);

    // If they close the popup without finishing, don't leave the UI stuck
    // waiting forever.
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setGoogleWaiting(false);
      }
    }, 500);
  };

  const cancelGoogleSignIn = () => {
    popupRef.current?.close();
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setGoogleWaiting(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#8B8780] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6 relative">
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

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleWaiting}
            className="w-full h-10 flex items-center justify-center gap-2.5 border border-[#DEDBD2] rounded-xl text-sm font-medium text-[#1A1814] hover:bg-[#F2F0EA] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleWaiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            {googleWaiting ? 'Waiting for Google…' : 'Continue with Google'}
          </button>
          {googleError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 mt-3">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{googleError}</p>
            </div>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#EEECE5]" />
            <span className="text-[11px] text-[#8B8780] uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-[#EEECE5]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#57544E] mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8780]" />
                <input
                  type="email"
                  required
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

      {/* Small overlay box while the Google popup is open */}
      {googleWaiting && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-[#EEECE5] p-6 w-full max-w-[280px] flex flex-col items-center text-center gap-3">
            <button
              onClick={cancelGoogleSignIn}
              className="self-end -mt-2 -mr-2 p-1 rounded-md text-[#8B8780] hover:bg-[#F2F0EA] hover:text-[#1A1814]"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
            <Loader2 className="w-6 h-6 text-[#4F46E5] animate-spin -mt-2" />
            <p className="text-sm text-[#1A1814] font-medium">Finish signing in with Google</p>
            <p className="text-xs text-[#8B8780]">Complete sign-in in the popup window — this closes automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}
