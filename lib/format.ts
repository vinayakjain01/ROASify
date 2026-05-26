// Indian number formatting utilities

export function formatIndianNumber(num: number): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 10000000) {
    // Crore
    return sign + (absNum / 10000000).toFixed(2).replace(/\.?0+$/, '') + 'Cr';
  } else if (absNum >= 100000) {
    // Lakh
    return sign + (absNum / 100000).toFixed(2).replace(/\.?0+$/, '') + 'L';
  } else if (absNum >= 1000) {
    // Thousand with Indian formatting
    return sign + formatWithIndianCommas(absNum);
  }
  return sign + absNum.toFixed(0);
}

export function formatWithIndianCommas(num: number): string {
  const numStr = Math.floor(num).toString();
  let result = '';
  let count = 0;
  
  for (let i = numStr.length - 1; i >= 0; i--) {
    if (count === 3) {
      result = ',' + result;
      count = 0;
    } else if (count > 3 && (count - 3) % 2 === 0) {
      result = ',' + result;
    }
    result = numStr[i] + result;
    count++;
  }
  
  return result;
}

export function formatCurrency(num: number, showSymbol = true): string {
  const prefix = showSymbol ? '₹' : '';
  return prefix + formatIndianNumber(num);
}

export function formatRoi(roi: number): string {
  return roi.toFixed(1) + 'x';
}

export function formatPercentage(num: number, showSign = true): string {
  const sign = showSign && num > 0 ? '+' : '';
  return sign + num.toFixed(1) + '%';
}

export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function getRoiColor(roi: number): string {
  if (roi >= 8) return 'text-[#047857]'; // success green
  if (roi < 3) return 'text-[#B42318]'; // danger red
  return 'text-[#1A1814]'; // default
}

export function getQuadrantColor(quadrant: string): { 
  bg: string; 
  text: string; 
  border: string;
  dot: string;
} {
  switch (quadrant) {
    case 'champions':
      return { 
        bg: 'bg-[#E7F7F0]', 
        text: 'text-[#10B981]', 
        border: 'border-[#10B981]',
        dot: 'bg-[#10B981]'
      };
    case 'contenders':
      return { 
        bg: 'bg-[#EAF1FE]', 
        text: 'text-[#3B82F6]', 
        border: 'border-[#3B82F6]',
        dot: 'bg-[#3B82F6]'
      };
    case 'cruisers':
      return { 
        bg: 'bg-[#F2F0EC]', 
        text: 'text-[#78716C]', 
        border: 'border-[#78716C]',
        dot: 'bg-[#78716C]'
      };
    case 'casualties':
      return { 
        bg: 'bg-[#FDECEC]', 
        text: 'text-[#EF4444]', 
        border: 'border-[#EF4444]',
        dot: 'bg-[#EF4444]'
      };
    default:
      return { 
        bg: 'bg-[#F2F0EA]', 
        text: 'text-[#57544E]', 
        border: 'border-[#DEDBD2]',
        dot: 'bg-[#57544E]'
      };
  }
}
