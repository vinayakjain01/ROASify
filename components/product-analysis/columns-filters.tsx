'use client';

import { useState } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FilterChip {
  id: string;
  label: string;
  source: string;
  key: string;
}

export const ALL_CHIPS: FilterChip[] = [
  { id: '1',  label: 'Meta Spend',    source: 'Meta',    key: 'metaSpend'  },
  { id: '2',  label: 'Google Cost',   source: 'Google',  key: 'googleCost' },
  { id: '3',  label: 'Total Spend',   source: 'Derived', key: 'totalSpend' },
  { id: '4',  label: 'Revenue',       source: 'Shopify', key: 'revenue'    },
  { id: '5',  label: 'ROI',           source: 'Derived', key: 'roi'        },
  { id: '6',  label: 'Items Sold',    source: 'Shopify', key: 'itemsSold'  },
  { id: '7',  label: 'CTR',           source: 'Meta',    key: 'ctr'        },
  { id: '8',  label: 'CPM',           source: 'Meta',    key: 'cpm'        },
  { id: '9',  label: 'Variant',       source: 'Shopify', key: 'variant'    },
];

interface MetricFilter {
  id: string;
  metric: string;
  operator: string;
  value: string;
  value2?: string;
}

export interface ActiveFilter {
  metric: string;
  operator: string;
  value: number;
  value2?: number;
}

interface ColumnsAndFiltersProps {
  onFiltersChange?: (filters: ActiveFilter[]) => void;
  onColumnsChange?: (columns: string[]) => void;
}

export function ColumnsAndFilters({ onFiltersChange, onColumnsChange }: ColumnsAndFiltersProps) {
  const [chips, setChips]                     = useState<FilterChip[]>(ALL_CHIPS);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [addColOpen, setAddColOpen]           = useState(false);
  const [filters, setFilters]                 = useState<MetricFilter[]>([]);
  const [activeFilterBadge, setActiveFilterBadge] = useState(0);

  // Chips not yet shown
  const hiddenChips = ALL_CHIPS.filter(c => !chips.find(s => s.id === c.id));

  const removeChip = (id: string) => {
    const updated = chips.filter(c => c.id !== id);
    setChips(updated);
    // Always include id + title in columns regardless of chip state
    const cols = ['id', 'title', ...updated.map(c => c.key)];
    onColumnsChange?.(cols);
  };

  const addChip = (chip: FilterChip) => {
    const updated = [...chips, chip];
    setChips(updated);
    const cols = ['id', 'title', ...updated.map(c => c.key)];
    onColumnsChange?.(cols);
    setAddColOpen(false);
  };

  const addFilter = () => {
    setFilters([...filters, { id: String(Date.now()), metric: '', operator: '>', value: '' }]);
    setFiltersExpanded(true);
  };

  const removeFilter = (id: string) => setFilters(filters.filter(f => f.id !== id));

  const updateFilter = (id: string, field: keyof MetricFilter, value: string) =>
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));

  const handleApply = () => {
    const active: ActiveFilter[] = filters
      .filter(f => f.metric && f.value !== '')
      .map(f => ({
        metric:   f.metric,
        operator: f.operator,
        value:    parseFloat(f.value) || 0,
        value2:   f.value2 ? parseFloat(f.value2) : undefined,
      }));
    setActiveFilterBadge(active.length);
    onFiltersChange?.(active);
    setFiltersExpanded(false);
  };

  const handleClear = () => {
    setFilters([]);
    setActiveFilterBadge(0);
    onFiltersChange?.([]);
  };

  const handleReset = () => {
    setChips(ALL_CHIPS);
    setFilters([]);
    setActiveFilterBadge(0);
    onFiltersChange?.([]);
    onColumnsChange?.(['id', 'title', ...ALL_CHIPS.map(c => c.key)]);
  };

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEECE5]">
        <h3 className="font-medium text-[#1A1814]">Columns & filters</h3>
        <button className="text-sm text-[#4F46E5] hover:text-[#4338CA]" onClick={handleReset}>
          Reset to default
        </button>
      </div>

      {/* Chips Section */}
      <div className="px-5 py-4 border-b border-[#EEECE5]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider">Columns shown</div>
          {/* Add column button */}
          {hiddenChips.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setAddColOpen(!addColOpen)}
                className="flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add column
              </button>
              {addColOpen && (
                <div className="absolute right-0 top-6 z-20 bg-white border border-[#EEECE5] rounded-lg shadow-lg py-1 min-w-[160px]">
                  {hiddenChips.map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => addChip(chip)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#F2F0EA] transition-colors"
                    >
                      <span className="text-[#1A1814]">{chip.label}</span>
                      <span className="text-[10px] text-[#8B8780] bg-[#F2F0EA] px-1.5 py-0.5 rounded ml-2">{chip.source}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <div
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F0EA] rounded-md text-sm"
            >
              <span className="text-[#1A1814]">{chip.label}</span>
              <span className="text-[10px] text-[#8B8780] bg-[#FFFFFF] px-1.5 py-0.5 rounded">
                {chip.source}
              </span>
              <button
                onClick={() => removeChip(chip.id)}
                className="ml-1 p-0.5 hover:bg-[#DEDBD2] rounded transition-colors"
              >
                <X className="w-3 h-3 text-[#8B8780]" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Accordion */}
      <div>
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FAFAF8] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1A1814]">Metric filters</span>
            {activeFilterBadge > 0 && (
              <span className="text-xs bg-[#4F46E5] text-white px-2 py-0.5 rounded-full">
                {activeFilterBadge} active
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-[#8B8780] transition-transform",
            filtersExpanded && "rotate-180"
          )} />
        </button>

        {filtersExpanded && (
          <div className="px-5 pb-4 space-y-3">
            {filters.length === 0 && (
              <p className="text-sm text-[#8B8780] py-2">No filters yet. Click "Add filter" below.</p>
            )}
            {filters.map((filter) => (
              <div key={filter.id} className="grid grid-cols-[1fr_110px_1fr_32px] gap-2 items-center">
                <select
                  value={filter.metric}
                  onChange={(e) => updateFilter(filter.id, 'metric', e.target.value)}
                  className="h-9 px-2 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="">Select metric</option>
                  <option value="roi">ROI</option>
                  <option value="revenue">Revenue</option>
                  <option value="totalSpend">Total Spend</option>
                  <option value="metaSpend">Meta Spend</option>
                  <option value="ctr">CTR</option>
                  <option value="cpm">CPM</option>
                  <option value="itemsSold">Items Sold</option>
                </select>

                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                  className="h-9 px-2 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value=">">{'>'}</option>
                  <option value="<">{'<'}</option>
                  <option value="=">=</option>
                  <option value=">=">{'>='}</option>
                  <option value="<=">{'<='}</option>
                  <option value="between">Between</option>
                </select>

                {filter.operator === 'between' ? (
                  <div className="flex items-center gap-1">
                    <input type="number" placeholder="Min" value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      className="flex-1 h-9 px-2 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                    <input type="number" placeholder="Max" value={filter.value2 || ''}
                      onChange={(e) => updateFilter(filter.id, 'value2', e.target.value)}
                      className="flex-1 h-9 px-2 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                  </div>
                ) : (
                  <input type="number" placeholder="Value" value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    className="h-9 px-2 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                )}

                <button onClick={() => removeFilter(filter.id)}
                  className="h-9 w-8 flex items-center justify-center hover:bg-[#F2F0EA] rounded-md transition-colors">
                  <X className="w-4 h-4 text-[#8B8780]" />
                </button>
              </div>
            ))}

            <button onClick={addFilter}
              className="flex items-center gap-2 text-sm text-[#4F46E5] hover:text-[#4338CA]">
              <Plus className="w-4 h-4" />
              Add filter
            </button>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEECE5]">
              <Button variant="ghost" size="sm" onClick={handleClear}>Clear filters</Button>
              <Button size="sm" className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={handleApply}>
                Apply filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}