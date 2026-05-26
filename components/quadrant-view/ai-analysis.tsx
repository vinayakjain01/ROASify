'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIAnalysisProps {
  onGenerate?: () => void;
  isGenerated?: boolean;
}

export function AIAnalysis({ onGenerate, isGenerated = false }: AIAnalysisProps) {
  return (
    <div className="bg-white rounded-[10px] border border-[#EEECE5] overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium text-[#1A1814] mb-1">Per-quadrant recommendations</h3>
            <div className="flex items-center gap-2 text-xs text-[#8B8780]">
              <div className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full" />
              Powered by Gemini 1.5 Flash · not yet run
            </div>
          </div>
          <Button 
            onClick={onGenerate}
            className="bg-[#4F46E5] hover:bg-[#4338CA]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Analysis
          </Button>
        </div>

        {!isGenerated && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8B8780] max-w-md mx-auto">
              Click Generate AI Analysis to produce specific actions for each quadrant.
              Recommendations will reference exact product IDs and INR figures.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
