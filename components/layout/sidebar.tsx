'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, LayoutGrid, Tag, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { fetchCurrentUser } from '@/lib/api';

const navItems = [
  { href: '/product-analysis',  label: 'Product Analysis',  icon: Upload     },
  { href: '/quadrant-view',     label: 'Quadrant View',     icon: LayoutGrid },
  { href: '/discount-analysis', label: 'Discount Analysis', icon: Tag        },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    fetchCurrentUser().then(u => setIsAdmin(u.role === 'admin')).catch(() => setIsAdmin(false));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#17150F] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2A2620]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center flex-shrink-0">
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
          </div>
          <div className="text-white font-semibold text-[23px] tracking-tight leading-none">
            ROAS<span className="text-[#4F46E5]">ify</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="text-[10px] font-semibold text-[#6B6760] uppercase tracking-widest px-3 mb-2">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/product-analysis' && pathname === '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                    isActive
                      ? 'bg-[#4F46E5]/15 text-white border border-[#4F46E5]/30'
                      : 'text-[#A8A5A0] hover:bg-[#221F18] hover:text-[#E8E5E0]'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#4F46E5]' : '')} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <>
            <div className="text-[10px] font-semibold text-[#6B6760] uppercase tracking-widest px-3 mt-5 mb-2">
              Admin
            </div>
            <ul className="space-y-0.5">
              {(() => {
                const isActive = pathname === '/admin';
                return (
                  <li>
                    <Link
                      href="/admin"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        isActive
                          ? 'bg-[#4F46E5]/15 text-white border border-[#4F46E5]/30'
                          : 'text-[#A8A5A0] hover:bg-[#221F18] hover:text-[#E8E5E0]'
                      )}
                    >
                      <ShieldCheck className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-[#4F46E5]' : '')} />
                      Teams &amp; Access
                    </Link>
                  </li>
                );
              })()}
            </ul>
          </>
        )}
      </nav>

      {/* Account */}
      <div className="px-3 py-3 border-t border-[#2A2620]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg">
          <span className="text-xs text-[#A8A5A0] truncate" title={email ?? undefined}>
            {email ?? ' '}
          </span>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="flex-shrink-0 p-1.5 rounded-md text-[#A8A5A0] hover:bg-[#221F18] hover:text-[#E8E5E0] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}