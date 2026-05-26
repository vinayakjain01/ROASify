'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { TweaksPanel } from '@/components/tweaks-panel';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumbs: { label: string; href?: string }[];
  rightPanel?: ReactNode;
  className?: string;
}

export function DashboardLayout({ 
  children, 
  breadcrumbs, 
  rightPanel,
  className 
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Sidebar />
      <div className="ml-60">
        <TopBar breadcrumbs={breadcrumbs} />
        <div className="flex">
          <main className={cn(
            "flex-1 p-8 max-w-[1400px]",
            rightPanel ? "mr-80" : "",
            className
          )}>
            {children}
          </main>
          {rightPanel && (
            <aside className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-[#EEECE5] overflow-y-auto">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
      <TweaksPanel />
    </div>
  );
}
