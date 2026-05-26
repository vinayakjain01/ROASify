'use client';

import { Calendar, Share2, Download, HelpCircle, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
}

export function TopBar({ breadcrumbs }: TopBarProps) {
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

      {/* Period Selector */}
      <Button 
        variant="outline" 
        className="h-9 px-4 bg-white border-[#DEDBD2] hover:border-[#8B8780] text-[#1A1814] font-normal"
      >
        <Calendar className="w-4 h-4 mr-2 text-[#8B8780]" />
        Apr 22 – May 21, 2026
        <span className="ml-2 text-[#8B8780]">›</span>
      </Button>

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
