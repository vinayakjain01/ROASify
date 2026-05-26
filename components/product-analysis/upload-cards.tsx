'use client';

import { useState } from 'react';
import { Upload, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  iconBg: string;
  required: boolean;
  description: string;
  file?: {
    name: string;
    size: string;
    rows: number;
  };
  error?: string;
}

interface UploadCardProps {
  source: UploadSource;
  state: 'empty' | 'uploaded' | 'error';
  onClear?: () => void;
}

function SourceIcon({ name, className }: { name: string; className?: string }) {
  if (name === 'Meta Ads') {
    return (
      <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1877F2"/>
        <path d="M15.5 8.5C15.5 8.5 14.5 8 13 8C10.5 8 9 10 9 12C9 14 10.5 16 13 16C14.5 16 15.5 15.5 15.5 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }
  if (name === 'Shopify') {
    return (
      <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none">
        <path d="M17.5 6L12 4L6.5 6V14L12 20L17.5 14V6Z" fill="#96BF48" stroke="#96BF48" strokeWidth="0.5"/>
        <path d="M12 8V16M9 10L12 8L15 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (name === 'Google Ads') {
    return (
      <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none">
        <circle cx="7" cy="17" r="3" fill="#FBBC04"/>
        <circle cx="17" cy="7" r="3" fill="#EA4335"/>
        <rect x="6" y="8" width="12" height="4" rx="2" fill="#4285F4" transform="rotate(30 12 12)"/>
      </svg>
    );
  }
  return <Upload className={cn("w-6 h-6", className)} />;
}

export function UploadCard({ source, state, onClear }: UploadCardProps) {
  const isUploaded = state === 'uploaded' && source.file;
  const isError = state === 'error' && source.error;

  return (
    <div className={cn(
      "bg-white rounded-[10px] border p-5 transition-colors",
      isUploaded ? "border-[#10B981]" : isError ? "border-[#EF4444]" : "border-[#EEECE5]"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", source.iconBg)}>
            <SourceIcon name={source.name} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1A1814]">{source.name}</span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded",
                source.required 
                  ? "bg-[#FEF3CD] text-[#B45309]" 
                  : "bg-[#F2F0EA] text-[#8B8780]"
              )}>
                {source.required ? 'Required' : 'Optional'}
              </span>
            </div>
            <div className="text-xs text-[#8B8780] mt-0.5">{source.description}</div>
          </div>
        </div>
        {isUploaded && onClear && (
          <button 
            onClick={onClear}
            className="p-1 hover:bg-[#F2F0EA] rounded transition-colors"
          >
            <X className="w-4 h-4 text-[#8B8780]" />
          </button>
        )}
      </div>

      {/* Upload Zone or Status */}
      {isUploaded && source.file ? (
        <div className="flex items-center gap-3 p-4 bg-[#E7F7F0] rounded-lg">
          <Check className="w-5 h-5 text-[#10B981]" />
          <div className="flex-1">
            <div className="text-sm font-medium text-[#1A1814]">{source.file.name}</div>
            <div className="text-xs text-[#57544E]">
              {source.file.size} · {source.file.rows} rows
            </div>
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 p-4 bg-[#FDECEC] rounded-lg">
          <AlertCircle className="w-5 h-5 text-[#EF4444]" />
          <div className="flex-1">
            <div className="text-sm font-medium text-[#B42318]">Upload failed</div>
            <div className="text-xs text-[#57544E]">{source.error}</div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#DEDBD2] rounded-lg p-6 text-center hover:border-[#4F46E5] hover:bg-[#FAFAF8] transition-colors cursor-pointer">
          <Upload className="w-8 h-8 mx-auto mb-2 text-[#8B8780]" />
          <div className="text-sm text-[#57544E]">Drop your CSV, or click to browse</div>
          <div className="text-xs text-[#8B8780] mt-1">UTF-8, max 25 MB</div>
        </div>
      )}
    </div>
  );
}

interface UploadGridProps {
  onMetaFile: (f: File) => void
  onShopifyFile: (f: File) => void
  onGoogleFile: (f: File | null) => void
}

export function UploadGrid({
  onMetaFile,
  onShopifyFile,
  onGoogleFile
}: UploadGridProps) {

  return (
    <div className="grid grid-cols-3 gap-4">

      {/* Meta Ads */}
      <div className="bg-white rounded-[10px] border p-5">
        <h3 className="font-medium mb-3">Meta Ads</h3>

        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onMetaFile(e.target.files[0])
            }
          }}
        />
      </div>

      {/* Shopify */}
      <div className="bg-white rounded-[10px] border p-5">
        <h3 className="font-medium mb-3">Shopify</h3>

        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              onShopifyFile(e.target.files[0])
            }
          }}
        />
      </div>

      {/* Google */}
      <div className="bg-white rounded-[10px] border p-5">
        <h3 className="font-medium mb-3">Google Ads</h3>

        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            onGoogleFile(e.target.files?.[0] || null)
          }}
        />
      </div>

    </div>
  )
}