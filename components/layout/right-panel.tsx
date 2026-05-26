'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RightPanelProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
}

export function RightPanel({ children, isOpen, onClose, title }: RightPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-80 bg-white border-l border-[#EEECE5] h-full overflow-y-auto">
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEECE5]">
          <h3 className="font-medium text-[#1A1814]">{title}</h3>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-[#F2F0EA] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#8B8780]" />
            </button>
          )}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </aside>
  );
}

interface PanelSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function PanelSection({ title, children, className }: PanelSectionProps) {
  return (
    <div className={cn("mb-6", className)}>
      <h4 className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

interface PanelRowProps {
  label: string;
  value: string | ReactNode;
  mono?: boolean;
}

export function PanelRow({ label, value, mono }: PanelRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[#57544E]">{label}</span>
      <span className={cn("text-sm text-[#1A1814]", mono && "font-mono text-[13px]")}>
        {value}
      </span>
    </div>
  );
}

interface SourceItemProps {
  name: string;
  rows: number;
  connected?: boolean;
}

export function SourceItem({ name, rows, connected = true }: SourceItemProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className={cn(
        "w-2 h-2 rounded-full",
        connected ? "bg-[#10B981]" : "bg-[#8B8780]"
      )} />
      <span className="text-sm text-[#1A1814]">{name}</span>
      <span className="text-sm text-[#8B8780] ml-auto">{rows} rows</span>
    </div>
  );
}
