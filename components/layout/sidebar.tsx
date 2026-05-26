'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Upload, 
  LayoutGrid, 
  Tag, 
  FileText,
  Play,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    section: 'WORKSPACE',
    items: [
      { href: '/product-analysis', label: 'Product Analysis', icon: Upload },
      { href: '/quadrant-view', label: 'Quadrant View', icon: LayoutGrid },
      { href: '/discount-analysis', label: 'Discount Analysis', icon: Tag },
    ]
  },
  {
    section: 'REFERENCE',
    items: [
      { href: '/design-spec', label: 'Design Spec', icon: FileText },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#17150F] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#F59E0B] rounded-full" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            ROAS<span className="text-[#4F46E5]">ify</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="px-3 mb-2 text-[11px] font-medium text-[#8B8780] tracking-wider">
              {section.section}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === '/product-analysis' && pathname === '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-[#221F18] text-white border-l-2 border-[#4F46E5] -ml-[2px] pl-[14px]'
                          : 'text-[#A8A5A0] hover:bg-[#221F18] hover:text-white'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 space-y-3">
        {/* Run Analysis CTA */}
        <button className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
          <Play className="w-4 h-4" />
          Run Product Analysis
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-xs font-medium">
            PR
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">Pranav R.</div>
            <div className="text-xs text-[#8B8780] truncate">Growify · Aanya Studio</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
