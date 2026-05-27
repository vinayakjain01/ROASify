'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Share2, Download, HelpCircle, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
}

const PRESETS = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month',   days: 0, thisMonth: true },
];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TopBar({ breadcrumbs }: TopBarProps) {
  const defaultEnd   = new Date(2026, 4, 21); // May 21, 2026
  const defaultStart = new Date(2026, 3, 22); // Apr 22, 2026

  const [dateOpen, setDateOpen] = useState(false);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate,   setEndDate]   = useState(defaultEnd);
  const [pendingStart, setPendingStart] = useState(defaultStart);
  const [pendingEnd,   setPendingEnd]   = useState(defaultEnd);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const applyPreset = (days: number, thisMonth?: boolean) => {
    const end = new Date();
    let start: Date;
    if (thisMonth) {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else {
      start = new Date();
      start.setDate(start.getDate() - days);
    }
    setPendingStart(start);
    setPendingEnd(end);
  };

  const handleApply = () => {
    setStartDate(pendingStart);
    setEndDate(pendingEnd);
    setDateOpen(false);
  };

  const label = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#EEECE5] flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <span className="text-[#8B8780] mx-1">/</span>}
            <span className={index === breadcrumbs.length - 1 ? 'text-[#1A1814] font-medium' : 'text-[#8B8780]'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Date Picker */}
      <div className="relative" ref={ref}>
        <Button 
          variant="outline" 
          className="h-9 px-4 bg-white border-[#DEDBD2] hover:border-[#8B8780] text-[#1A1814] font-normal"
          onClick={() => {
            setPendingStart(startDate);
            setPendingEnd(endDate);
            setDateOpen(!dateOpen);
          }}
        >
          <Calendar className="w-4 h-4 mr-2 text-[#8B8780]" />
          {label}
          <span className="ml-2 text-[#8B8780]">›</span>
        </Button>

        {dateOpen && (
          <div className="absolute top-11 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl border border-[#EEECE5] shadow-xl p-4 w-80">
            <div className="text-xs font-semibold text-[#8B8780] uppercase tracking-wider mb-3">Quick select</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.days, p.thisMonth)}
                  className="text-sm px-3 py-1.5 rounded-md border border-[#EEECE5] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors text-[#57544E]"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-semibold text-[#8B8780] uppercase tracking-wider mb-3">Custom range</div>
            <div className="space-y-2 mb-4">
              <div>
                <label className="text-xs text-[#8B8780] mb-1 block">Start date</label>
                <input
                  type="date"
                  value={pendingStart.toISOString().slice(0, 10)}
                  onChange={e => setPendingStart(new Date(e.target.value))}
                  className="w-full h-9 px-3 text-sm bg-white border border-[#DEDBD2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8B8780] mb-1 block">End date</label>
                <input
                  type="date"
                  value={pendingEnd.toISOString().slice(0, 10)}
                  onChange={e => setPendingEnd(new Date(e.target.value))}
                  className="w-full h-9 px-3 text-sm bg-white border border-[#DEDBD2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDateOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 px-3 border-[#DEDBD2]">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button variant="outline" size="sm" className="h-8 px-3 border-[#DEDBD2]">
          <Download className="w-4 h-4 mr-2" />
          Export
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