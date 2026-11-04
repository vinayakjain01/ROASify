'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Loads only inside the Google sign-in popup opened from /login. Supabase's
// client auto-parses the #access_token fragment Google/Supabase redirected
// here with and writes the session to localStorage — the opener tab (still
// on /login) picks that up on its own via Supabase's cross-tab sync and
// does the actual routing. This page's only job is to close itself once
// that's done.
export default function AuthCallbackPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setDone(true);
        setTimeout(() => window.close(), 400);
      }
    });

    // In case the session was already established before this listener
    // attached (hash parsing can finish very fast).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setDone(true);
        setTimeout(() => window.close(), 400);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {done
          ? <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
          : <Loader2 className="w-6 h-6 text-[#4F46E5] animate-spin" />}
        <p className="text-sm text-[#1A1814] font-medium">
          {done ? 'Signed in — you can close this window.' : 'Finishing sign-in…'}
        </p>
      </div>
    </div>
  );
}
