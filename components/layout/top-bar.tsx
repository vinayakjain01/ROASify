'use client';

import { useRef, useEffect, useState } from 'react';
import { CalendarDays, Share2, Download, HelpCircle, MoreVertical, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/lib/context';
import { cn } from '@/lib/utils';

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
}

export function TopBar({ breadcrumbs }: TopBarProps) {
  const { allMonths, selectedMonths, toggleMonth, selectAllMonths } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const allSelected = allMonths.length > 0 && selectedMonths.size === allMonths.length;
  const hasMonths   = allMonths.length > 0;

  const label = !hasMonths
    ? 'All data'
    : allSelected
      ? `All ${allMonths.length} months`
      : selectedMonths.size === 1
        ? Array.from(selectedMonths)[0]
        : `${selectedMonths.size} of ${allMonths.length} months`;

  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#EEECE5] flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#8B8780] mx-1">/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'text-[#1A1814] font-medium' : 'text-[#8B8780]'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Month picker */}
      <div className="relative" ref={ref}>
        <Button
          variant="outline"
          className={cn(
            'h-9 px-4 bg-white border-[#DEDBD2] hover:border-[#8B8780] font-normal gap-2',
            !allSelected && hasMonths
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'text-[#1A1814]'
          )}
          onClick={() => setOpen(o => !o)}
          disabled={!hasMonths}
          title={hasMonths ? 'Filter by month' : 'Merge data first to enable month filter'}
        >
          <CalendarDays className="w-4 h-4 text-[#8B8780]" />
          <span className="max-w-[200px] truncate">{label}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-[#8B8780] transition-transform', open && 'rotate-180')} />
        </Button>

        {open && hasMonths && (
          <div className="absolute top-11 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl border border-[#EEECE5] shadow-xl py-2 min-w-[230px]">
            {/* All months row */}
            <button
              onClick={selectAllMonths}
              className={cn(
                'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                allSelected ? 'bg-[#EEF2FF] text-[#4F46E5] font-medium' : 'hover:bg-[#F2F0EA] text-[#1A1814]'
              )}
            >
              <span>All months</span>
              {allSelected && <Check className="w-4 h-4 text-[#4F46E5]" />}
            </button>

            <div className="h-px bg-[#EEECE5] my-1" />

            {/* Individual month rows */}
            {allMonths.map(m => {
              const active = selectedMonths.has(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMonth(m)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    active ? 'text-[#4F46E5]' : 'text-[#1A1814] hover:bg-[#F2F0EA]'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                    active ? 'bg-[#4F46E5] border-[#4F46E5]' : 'border-[#DEDBD2]'
                  )}>
                    {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <span className="font-medium">{m}</span>
                </button>
              );
            })}

            <div className="h-px bg-[#EEECE5] mt-1 mb-2" />
            <p className="text-[11px] text-[#8B8780] px-4 pb-1">
              {selectedMonths.size} of {allMonths.length} selected · data aggregates across months
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 px-3 border-[#DEDBD2]">
          <Share2 className="w-4 h-4 mr-2" />Share
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-3 border-[#DEDBD2]">
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8B8780] hover:text-[#1A1814]">
          <HelpCircle className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8B8780] hover:text-[#1A1814]">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}