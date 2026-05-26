'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function DesignSpecPage() {
  const breadcrumbs = [
    { label: 'Reference' },
    { label: 'Design Spec' },
  ];

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-[#1A1814] mb-6">Design Specification</h1>
        
        <div className="space-y-8">
          {/* Colors Section */}
          <section className="bg-white rounded-[10px] border border-[#EEECE5] p-6">
            <h2 className="text-lg font-medium text-[#1A1814] mb-4">Colors</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[#57544E] mb-2">Surface</h3>
                <div className="flex gap-3">
                  <ColorSwatch color="#FAFAF8" label="Page BG" />
                  <ColorSwatch color="#FFFFFF" label="Card" />
                  <ColorSwatch color="#F2F0EA" label="Sunken" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[#57544E] mb-2">Rail</h3>
                <div className="flex gap-3">
                  <ColorSwatch color="#17150F" label="BG" dark />
                  <ColorSwatch color="#221F18" label="Hover" dark />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[#57544E] mb-2">Brand</h3>
                <div className="flex gap-3">
                  <ColorSwatch color="#4F46E5" label="Primary" dark />
                  <ColorSwatch color="#4338CA" label="Hover" dark />
                  <ColorSwatch color="#EEEDFB" label="Subtle" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[#57544E] mb-2">Quadrants</h3>
                <div className="flex gap-3">
                  <ColorSwatch color="#10B981" label="Champions" dark />
                  <ColorSwatch color="#3B82F6" label="Contenders" dark />
                  <ColorSwatch color="#78716C" label="Cruisers" dark />
                  <ColorSwatch color="#EF4444" label="Casualties" dark />
                </div>
              </div>
            </div>
          </section>

          {/* Typography Section */}
          <section className="bg-white rounded-[10px] border border-[#EEECE5] p-6">
            <h2 className="text-lg font-medium text-[#1A1814] mb-4">Typography</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#8B8780] mb-1">Body Font</p>
                <p className="text-lg">General Sans / Geist</p>
              </div>
              <div>
                <p className="text-sm text-[#8B8780] mb-1">Monospace (IDs, Numbers)</p>
                <p className="text-lg font-mono">JetBrains Mono</p>
              </div>
              <div>
                <p className="text-sm text-[#8B8780] mb-1">Number Formatting</p>
                <p className="text-lg tabular-nums">Tabular + Lining: ₹12,34,567</p>
              </div>
            </div>
          </section>

          {/* Layout Section */}
          <section className="bg-white rounded-[10px] border border-[#EEECE5] p-6">
            <h2 className="text-lg font-medium text-[#1A1814] mb-4">Layout</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#EEECE5]">
                <span className="text-[#57544E]">Left Rail Width</span>
                <span className="font-mono text-[#1A1814]">240px</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#EEECE5]">
                <span className="text-[#57544E]">Top Bar Height</span>
                <span className="font-mono text-[#1A1814]">56px</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#EEECE5]">
                <span className="text-[#57544E]">Right Panel Width</span>
                <span className="font-mono text-[#1A1814]">320px</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#EEECE5]">
                <span className="text-[#57544E]">Max Content Width</span>
                <span className="font-mono text-[#1A1814]">1400px</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#57544E]">Gutter</span>
                <span className="font-mono text-[#1A1814]">32px</span>
              </div>
            </div>
          </section>

          {/* Radius Section */}
          <section className="bg-white rounded-[10px] border border-[#EEECE5] p-6">
            <h2 className="text-lg font-medium text-[#1A1814] mb-4">Border Radius</h2>
            
            <div className="flex gap-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#4F46E5] rounded-[6px] mb-2" />
                <span className="text-xs text-[#8B8780]">SM: 6px</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#4F46E5] rounded-[10px] mb-2" />
                <span className="text-xs text-[#8B8780]">MD: 10px</span>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#4F46E5] rounded-[16px] mb-2" />
                <span className="text-xs text-[#8B8780]">LG: 16px</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ColorSwatch({ color, label, dark }: { color: string; label: string; dark?: boolean }) {
  return (
    <div className="text-center">
      <div 
        className="w-12 h-12 rounded-lg border border-[#EEECE5] mb-1"
        style={{ backgroundColor: color }}
      />
      <div className="text-xs text-[#8B8780]">{label}</div>
      <div className="text-[10px] font-mono text-[#8B8780]">{color}</div>
    </div>
  );
}
