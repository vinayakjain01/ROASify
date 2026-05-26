'use client';

import { Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function DownloadBand() {
  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
        {/* Filename input */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8B8780]">filename:</span>
          <input
            type="text"
            defaultValue="roasify_overall_apr22_may21_2026.csv"
            className="flex-1 h-9 px-3 font-mono text-sm bg-white border border-[#DEDBD2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        {/* Download button */}
        <Button className="bg-[#4F46E5] hover:bg-[#4338CA] h-9 px-6">
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>

        {/* Handoff card */}
        <Link href="/quadrant-view" className="block">
          <div className="p-4 bg-[#FAFAF8] rounded-lg border border-[#EEECE5] hover:border-[#4F46E5] transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-[#1A1814]">Continue to Quadrant View</span>
              <ArrowRight className="w-4 h-4 text-[#4F46E5]" />
            </div>
            <p className="text-sm text-[#8B8780]">
              Classify these 26 products into Champions, Contenders, Cruisers, Casualties.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
