'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FourCsSlideoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FourCsSlideover({ isOpen, onClose }: FourCsSlideoverProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1A1814] mb-1">How the 4Cs work</h2>
              <p className="text-sm text-[#8B8780]">
                A 2×2 of revenue against spend to classify products
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#F2F0EA] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#8B8780]" />
            </button>
          </div>

          {/* 2x2 Diagram */}
          <div className="relative mb-8">
            {/* Y-axis label */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-[#8B8780] font-medium tracking-wider">
              REVENUE →
            </div>

            <div className="ml-6">
              <div className="grid grid-cols-2 gap-2">
                {/* Champions - Top Left */}
                <div className="p-4 bg-[#E7F7F0] rounded-lg border border-[#10B981]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#10B981]">Champions</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] rounded">
                      Scale
                    </span>
                  </div>
                  <p className="text-xs text-[#57544E]">
                    High revenue, low spend. Increase budget.
                  </p>
                </div>

                {/* Contenders - Top Right */}
                <div className="p-4 bg-[#EAF1FE] rounded-lg border border-[#3B82F6]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#3B82F6]">Contenders</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded">
                      Protect
                    </span>
                  </div>
                  <p className="text-xs text-[#57544E]">
                    High revenue, high spend. Defend ROI.
                  </p>
                </div>

                {/* Cruisers - Bottom Left */}
                <div className="p-4 bg-[#F2F0EC] rounded-lg border border-[#78716C]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#78716C]">Cruisers</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#78716C]/10 text-[#78716C] rounded">
                      Decide
                    </span>
                  </div>
                  <p className="text-xs text-[#57544E]">
                    Low revenue, low spend. Refresh or retire.
                  </p>
                </div>

                {/* Casualties - Bottom Right */}
                <div className="p-4 bg-[#FDECEC] rounded-lg border border-[#EF4444]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#EF4444]">Casualties</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#EF4444]/10 text-[#EF4444] rounded">
                      Cut
                    </span>
                  </div>
                  <p className="text-xs text-[#57544E]">
                    Low revenue, high spend. Pause immediately.
                  </p>
                </div>
              </div>

              {/* X-axis label */}
              <div className="text-center mt-3 text-xs text-[#8B8780] font-medium tracking-wider">
                SPEND →
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="prose prose-sm text-[#57544E]">
            <p className="leading-relaxed">
              The 4Cs framework classifies products into four quadrants based on two metrics: 
              <strong className="text-[#1A1814]"> Total Spend</strong> (X-axis) and 
              <strong className="text-[#1A1814]"> Revenue</strong> (Y-axis).
            </p>
            <p className="leading-relaxed">
              The cut-off values are set to the median spend and median revenue by default, 
              but you can adjust them using the threshold sliders in the right panel to 
              explore different classification scenarios.
            </p>
            <p className="leading-relaxed">
              Products that fall into the <strong className="text-[#10B981]">Champions</strong> quadrant 
              represent your best opportunities for scaling — they generate high revenue with relatively 
              low investment. <strong className="text-[#EF4444]">Casualties</strong>, on the other hand, 
              are burning budget without adequate return and should be paused or significantly restructured.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
