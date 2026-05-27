'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { cn } from '@/lib/utils';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { getStore, setPanelOpen } from '@/lib/store';

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumbs: { label: string; href?: string }[];
  rightPanel?: ReactNode;
  rightPanelTitle?: string;
  className?: string;
}

export function DashboardLayout({ 
  children, 
  breadcrumbs, 
  rightPanel,
  rightPanelTitle = 'Details',
  className 
}: DashboardLayoutProps) {
  const [panelOpen, setPanelOpenLocal] = useState<boolean>(() => {
    return rightPanel ? getStore().panelOpen : false;
  });

  const toggle = () => {
    const next = !panelOpen;
    setPanelOpenLocal(next);
    setPanelOpen(next);
  };

  // Auto-close if no panel content
  useEffect(() => {
    if (!rightPanel && panelOpen) {
      setPanelOpenLocal(false);
    }
    // Open by default when panel content appears (e.g. after merge)
    if (rightPanel && !panelOpen) {
      const stored = getStore().panelOpen;
      setPanelOpenLocal(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!rightPanel]);

  const showPanel = !!rightPanel && panelOpen;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Sidebar />

      <div className="ml-60 flex flex-col min-h-screen">
        <TopBar breadcrumbs={breadcrumbs} />

        <div className="flex flex-1 relative">
          {/* Main content — margin-right animates to match panel */}
          <main
            className={cn(
              'flex-1 p-8 min-w-0 transition-[margin] duration-300 ease-in-out',
              className
            )}
            style={{ marginRight: showPanel ? '20rem' : 0 }}
          >
            {children}
          </main>

          {/* Right panel toggle button — floats at the panel's left edge */}
          {rightPanel && (
            <button
              onClick={toggle}
              className={cn(
                'fixed top-[4.25rem] z-50 flex items-center justify-center',
                'w-7 h-8 bg-white border border-[#EEECE5] border-r-0',
                'rounded-l-lg shadow-sm text-[#8B8780] hover:text-[#1A1814]',
                'hover:bg-[#F2F0EA] transition-all duration-300 ease-in-out'
              )}
              style={{ right: showPanel ? '20rem' : 0 }}
              title={panelOpen ? 'Collapse panel' : 'Open panel'}
            >
              {panelOpen
                ? <PanelRightClose className="w-3.5 h-3.5" />
                : <PanelRightOpen className="w-3.5 h-3.5" />
              }
            </button>
          )}

          {/* Sliding right panel */}
          {rightPanel && (
            <aside
              className={cn(
                'fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-[#EEECE5]',
                'overflow-y-auto z-40 transition-transform duration-300 ease-in-out',
                showPanel ? 'translate-x-0' : 'translate-x-full'
              )}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EEECE5] sticky top-0 bg-white z-10">
                <span className="text-[11px] font-semibold text-[#8B8780] uppercase tracking-widest">
                  {rightPanelTitle}
                </span>
                <button
                  onClick={toggle}
                  className="p-1 rounded hover:bg-[#F2F0EA] transition-colors text-[#8B8780] hover:text-[#1A1814]"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>

              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}