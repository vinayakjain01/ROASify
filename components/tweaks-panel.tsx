'use client';

import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TweakSettings {
  accentColor: 'indigo' | 'cyan' | 'violet' | 'teal' | 'black';
  dimCanvas: boolean;
  compactDensity: boolean;
  showSidePanel: boolean;
  indianNumbers: boolean;
}

const defaultSettings: TweakSettings = {
  accentColor: 'indigo',
  dimCanvas: false,
  compactDensity: false,
  showSidePanel: true,
  indianNumbers: true,
};

const accentColors = {
  indigo: '#4F46E5',
  cyan: '#0891B2',
  violet: '#7C3AED',
  teal: '#0D9488',
  black: '#171717',
};

export function TweaksPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<TweakSettings>(defaultSettings);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('roasify-tweaks');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('roasify-tweaks', JSON.stringify(settings));
    
    // Apply accent color
    document.documentElement.style.setProperty('--brand-primary', accentColors[settings.accentColor]);
    document.documentElement.style.setProperty('--primary', accentColors[settings.accentColor]);
    
    // Apply dim canvas
    if (settings.dimCanvas) {
      document.documentElement.style.setProperty('--surface-page', '#F2F0EA');
      document.documentElement.style.setProperty('--background', '#F2F0EA');
    } else {
      document.documentElement.style.setProperty('--surface-page', '#FAFAF8');
      document.documentElement.style.setProperty('--background', '#FAFAF8');
    }
  }, [settings]);

  const updateSetting = <K extends keyof TweakSettings>(key: K, value: TweakSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg border border-[#EEECE5] hover:border-[#DEDBD2] transition-colors"
      >
        <Settings className="w-4 h-4 text-[#8B8780]" />
        <span className="text-sm text-[#1A1814]">Tweaks</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="fixed bottom-6 right-6 w-72 bg-white rounded-xl shadow-xl border border-[#EEECE5] z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEECE5]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#8B8780]" />
                <span className="font-medium text-[#1A1814]">Tweaks</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#F2F0EA] rounded transition-colors"
              >
                <X className="w-4 h-4 text-[#8B8780]" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Accent Color */}
              <div>
                <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-3">
                  Accent color
                </div>
                <div className="flex gap-2">
                  {(Object.keys(accentColors) as Array<keyof typeof accentColors>).map((color) => (
                    <button
                      key={color}
                      onClick={() => updateSetting('accentColor', color)}
                      className={cn(
                        "w-8 h-8 rounded-lg transition-all",
                        settings.accentColor === color 
                          ? "ring-2 ring-offset-2 ring-[#1A1814]" 
                          : "hover:scale-110"
                      )}
                      style={{ backgroundColor: accentColors[color] }}
                    />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <ToggleRow
                  label="Dim canvas"
                  checked={settings.dimCanvas}
                  onChange={(v) => updateSetting('dimCanvas', v)}
                />
                <ToggleRow
                  label="Compact density"
                  checked={settings.compactDensity}
                  onChange={(v) => updateSetting('compactDensity', v)}
                />
                <ToggleRow
                  label="Show side panel"
                  checked={settings.showSidePanel}
                  onChange={(v) => updateSetting('showSidePanel', v)}
                />
                <ToggleRow
                  label="Indian numbers (L/Cr)"
                  checked={settings.indianNumbers}
                  onChange={(v) => updateSetting('indianNumbers', v)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ToggleRow({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (v: boolean) => void; 
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#57544E]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-10 h-6 rounded-full transition-colors relative",
          checked ? "bg-[#4F46E5]" : "bg-[#DEDBD2]"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
          checked ? "left-5" : "left-1"
        )} />
      </button>
    </div>
  );
}
