'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, Check, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/context';

interface SourceConfig {
  id: 'meta' | 'shopify' | 'google';
  name: string;
  required: boolean;
  description: string;
  iconBg: string;
}

const sources: SourceConfig[] = [
  {
    id: 'meta',
    name: 'Meta Ads',
    required: true,
    description: 'Product ID · Month · Amount Spent · Landing Page Views · CTR · CPM',
    iconBg: 'bg-[#E7F0FF]',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    required: true,
    description: 'Product Variant ID · Product Title · Month · Net Sales · Net Items Sold',
    iconBg: 'bg-[#E7F7E7]',
  },
  {
    id: 'google',
    name: 'Google Ads',
    required: false,
    description: 'Item ID · Product Title · Month · Cost · Conversions',
    iconBg: 'bg-[#FEF3E7]',
  },
];

function SourceIcon({ name }: { name: string }) {
  if (name === 'Meta Ads') return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1877F2"/>
      <path d="M15.5 8.5C15.5 8.5 14.5 8 13 8C10.5 8 9 10 9 12C9 14 10.5 16 13 16C14.5 16 15.5 15.5 15.5 15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  if (name === 'Shopify') return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M17.5 6L12 4L6.5 6V14L12 20L17.5 14V6Z" fill="#96BF48" stroke="#96BF48" strokeWidth="0.5"/>
      <path d="M12 8V16M9 10L12 8L15 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="17" r="3" fill="#FBBC04"/>
      <circle cx="17" cy="7" r="3" fill="#EA4335"/>
      <rect x="6" y="8" width="12" height="4" rx="2" fill="#4285F4" transform="rotate(30 12 12)"/>
    </svg>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface UploadCardProps {
  source: SourceConfig;
  file: File | null;
  onFile: (file: File | null) => void;
}

function UploadCard({ source, file, onFile }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }, [onFile]);

  return (
    <div className={cn(
      'bg-white rounded-xl border transition-all duration-200',
      file ? 'border-[#10B981] shadow-sm' : 'border-[#EEECE5]',
      dragging && 'border-[#4F46E5] bg-[#FAFAFF]'
    )}>
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', source.iconBg)}>
            <SourceIcon name={source.name} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1A1814] text-sm">{source.name}</span>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide',
                source.required ? 'bg-amber-50 text-amber-700' : 'bg-[#F2F0EA] text-[#8B8780]'
              )}>
                {source.required ? 'Required' : 'Optional'}
              </span>
            </div>
            <p className="text-[11px] text-[#8B8780] mt-0.5 leading-relaxed">{source.description}</p>
          </div>
        </div>
        {file && (
          <button
            onClick={() => onFile(null)}
            className="p-1 rounded hover:bg-[#F2F0EA] text-[#8B8780] hover:text-[#1A1814] transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-4 pb-4">
        {file ? (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[#E7F7F0] rounded-lg">
            <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1814] truncate">{file.name}</p>
              <p className="text-xs text-[#57544E]">{formatBytes(file.size)} — stored, no re-upload needed</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="p-1 rounded hover:bg-[#C7EED9] text-[#10B981] transition-colors flex-shrink-0"
              title="Replace file"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors',
              dragging
                ? 'border-[#4F46E5] bg-[#FAFAFF]'
                : 'border-[#DEDBD2] hover:border-[#4F46E5] hover:bg-[#FAFAFF]'
            )}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-[#8B8780]" />
            <p className="text-sm text-[#57544E]">Drop CSV or Excel here</p>
            <p className="text-xs text-[#8B8780] mt-0.5">or click to browse · max 50 MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function UploadGrid() {
  const { metaFile, shopifyFile, googleFile, setMetaFile, setShopifyFile, setGoogleFile, clearMergedData } = useApp();

  const handleFile = (key: 'meta' | 'shopify' | 'google', file: File | null) => {
    if (key === 'meta') setMetaFile(file);
    else if (key === 'shopify') setShopifyFile(file);
    else setGoogleFile(file);
    // If a required file is removed, clear merged results
    if (!file && (key === 'meta' || key === 'shopify')) clearMergedData();
  };

  const metaF  = metaFile?.file    ?? null;
  const shopF  = shopifyFile?.file  ?? null;
  const gooF   = googleFile?.file   ?? null;

  return (
    <div className="grid grid-cols-3 gap-4">
      <UploadCard source={sources[0]} file={metaF}  onFile={(f) => handleFile('meta', f)} />
      <UploadCard source={sources[1]} file={shopF}  onFile={(f) => handleFile('shopify', f)} />
      <UploadCard source={sources[2]} file={gooF}   onFile={(f) => handleFile('google', f)} />
    </div>
  );
}