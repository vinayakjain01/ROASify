'use client';

import { useState } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FilterChip {
  id: string;
  label: string;
  source: string;
}

const defaultChips: FilterChip[] = [
  { id: '1', label: 'Meta Spend', source: 'Meta' },
  { id: '2', label: 'Google Cost', source: 'Google' },
  { id: '3', label: 'Total Spend', source: 'Derived' },
  { id: '4', label: 'Revenue', source: 'Shopify' },
  { id: '5', label: 'ROI', source: 'Derived' },
  { id: '6', label: 'Items Sold', source: 'Shopify' },
  { id: '7', label: 'CTR', source: 'Meta' },
  { id: '8', label: 'CPM', source: 'Meta' },
  { id: '9', label: 'Variant Title', source: 'Shopify' },
];

interface MetricFilter {
  id: string;
  metric: string;
  operator: string;
  value: string;
  value2?: string;
}

export function ColumnsAndFilters() {
  const [chips, setChips] = useState<FilterChip[]>(defaultChips);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState<MetricFilter[]>([
    { id: '1', metric: 'ROI', operator: '>=', value: '3' }
  ]);

  const removeChip = (id: string) => {
    setChips(chips.filter(c => c.id !== id));
  };

  const addFilter = () => {
    setFilters([...filters, { id: String(Date.now()), metric: '', operator: '>', value: '' }]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, field: keyof MetricFilter, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEECE5]">
        <h3 className="font-medium text-[#1A1814]">Columns & filters</h3>
        <button className="text-sm text-[#4F46E5] hover:text-[#4338CA]">
          Reset to default
        </button>
      </div>

      {/* Chips Section */}
      <div className="px-5 py-4 border-b border-[#EEECE5]">
        <div className="text-xs font-medium text-[#8B8780] uppercase tracking-wider mb-3">
          Columns shown
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
            {filters.length > 0 && (
              <span className="text-xs bg-[#4F46E5] text-white px-2 py-0.5 rounded-full">
                {filters.length}
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
            {filters.map((filter) => (
              <div key={filter.id} className="grid grid-cols-[1fr_120px_1fr_32px] gap-3 items-center">
                <select
                  value={filter.metric}
                  onChange={(e) => updateFilter(filter.id, 'metric', e.target.value)}
                  className="h-9 px-3 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="">Select metric</option>
                  <option value="ROI">ROI</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Spend">Total Spend</option>
                  <option value="CTR">CTR</option>
                  <option value="CPM">CPM</option>
                  <option value="Items">Items Sold</option>
                </select>

                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                  className="h-9 px-3 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value=">">{'>'}</option>
                  <option value="<">{'<'}</option>
                  <option value="=">=</option>
                  <option value=">=">{'>='}</option>
                  <option value="<=">{'<='}</option>
                  <option value="between">Between</option>
                </select>

                {filter.operator === 'between' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Min"
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      className="flex-1 h-9 px-3 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                    <input
                      type="text"
                      placeholder="Max"
                      value={filter.value2 || ''}
                      onChange={(e) => updateFilter(filter.id, 'value2', e.target.value)}
                      className="flex-1 h-9 px-3 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Value"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    className="h-9 px-3 bg-white border border-[#DEDBD2] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                )}

                <button
                  onClick={() => removeFilter(filter.id)}
                  className="h-9 w-9 flex items-center justify-center hover:bg-[#F2F0EA] rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-[#8B8780]" />
                </button>
              </div>
            ))}

            <button
              onClick={addFilter}
              className="flex items-center gap-2 text-sm text-[#4F46E5] hover:text-[#4338CA]"
            >
              <Plus className="w-4 h-4" />
              Add filter
            </button>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEECE5]">
              <Button variant="ghost" size="sm" onClick={() => setFilters([])}>
                Clear filters
              </Button>
              <Button size="sm" className="bg-[#4F46E5] hover:bg-[#4338CA]">
                Apply filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
