'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Upload, LayoutGrid, Tag, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/product-analysis', label: 'Product Analysis', icon: Upload },
  { href: '/quadrant-view',    label: 'Quadrant View',    icon: LayoutGrid },
  { href: '/discount-analysis',label: 'Discount Analysis',icon: Tag },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#17150F] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2A2620]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center flex-shrink-0">
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
            <span className="text-white text-[10px] font-black tracking-tighter">R</span>
          </div>
          <div>
            <div className="text-white font-semibold text-[15px] tracking-tight leading-none">
              ROAS<span className="text-[#4F46E5]">ify</span>
            </div>
            <div className="text-[#6B6760] text-[10px] mt-0.5">PPM Analytics</div>
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
            const isActive = pathname === item.href || 
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
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#2A2620] space-y-3">
        <Link
          href="/product-analysis"
          className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
        >
          <Play className="w-3.5 h-3.5" />
          Run Product Analysis
        </Link>
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
            PR
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[#E8E5E0] truncate">Pranav R.</div>
            <div className="text-[11px] text-[#6B6760] truncate">Growify · Aanya Studio</div>
          </div>
        </div>
      </div>
    </aside>
  );
}