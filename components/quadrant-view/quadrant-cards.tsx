'use client';

import { useState } from 'react';
import { ChevronDown, Star, Diamond, Circle, Triangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getQuadrantData, type Quadrant, type Product } from '@/lib/data';
import { formatCurrency, formatRoi, getQuadrantColor, getRoiColor } from '@/lib/formatters';
import { DataTable } from '@/components/ui/data-table';

interface QuadrantCardProps {
  quadrant: Quadrant;
  spendThreshold: number;
  revenueThreshold: number;
}

const quadrantConfig = {
  champions: { 
    icon: Star, 
    label: 'Champions', 
    tag: 'Scale',
    description: 'High revenue · Low spend'
  },
  contenders: { 
    icon: Diamond, 
    label: 'Contenders', 
    tag: 'Protect',
    description: 'High revenue · High spend'
  },
  cruisers: { 
    icon: Circle, 
    label: 'Cruisers', 
    tag: 'Decide',
    description: 'Low revenue · Low spend'
  },
  casualties: { 
    icon: Triangle, 
    label: 'Casualties', 
    tag: 'Cut',
    description: 'Low revenue · High spend'
  },
};

export function QuadrantCard({ quadrant, spendThreshold, revenueThreshold }: QuadrantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const data = getQuadrantData(quadrant);
  const config = quadrantConfig[quadrant];
  const colors = getQuadrantColor(quadrant);
  const Icon = config.icon;

  return (
    <div className={cn(
      "bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden",
      "border-l-[3px]",
      colors.border
    )}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className={cn("w-5 h-5", colors.text)} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#1A1814]">{config.label}</span>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  colors.bg, colors.text
                )}>
                  {config.tag}
                </span>
              </div>
              <div className="text-xs text-[#8B8780] mt-0.5">{config.description}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">Products</div>
            <div className="text-xl font-semibold text-[#1A1814] tabular-nums">{data.count}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">Spend</div>
            <div className="text-xl font-semibold text-[#1A1814] tabular-nums">{formatCurrency(data.spend)}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">Revenue</div>
            <div className="text-xl font-semibold text-[#1A1814] tabular-nums">{formatCurrency(data.revenue)}</div>
          </div>
          <div>
            <div className="text-xs text-[#8B8780] uppercase tracking-wider">ROI</div>
            <div className={cn("text-xl font-semibold tabular-nums", getRoiColor(data.roi))}>
              {formatRoi(data.roi)}
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-sm text-[#4F46E5] hover:text-[#4338CA]"
        >
          View all {data.count} products
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            expanded && "rotate-180"
          )} />
        </button>
      </div>

      {/* Expanded Table */}
      {expanded && (
        <div className="border-t border-[#EEECE5]">
          <DataTable 
            products={data.products} 
            columns={['id', 'title', 'totalSpend', 'revenue', 'roi']}
            maxHeight="300px"
          />
        </div>
      )}
    </div>
  );
}

interface QuadrantGridProps {
  spendThreshold: number;
  revenueThreshold: number;
}

export function QuadrantGrid({ spendThreshold, revenueThreshold }: QuadrantGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <QuadrantCard quadrant="champions" spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
      <QuadrantCard quadrant="contenders" spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
      <QuadrantCard quadrant="cruisers" spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
      <QuadrantCard quadrant="casualties" spendThreshold={spendThreshold} revenueThreshold={revenueThreshold} />
    </div>
  );
}
