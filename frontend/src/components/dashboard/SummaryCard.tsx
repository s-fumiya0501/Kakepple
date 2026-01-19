'use client';

import { memo } from 'react';

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  formatCurrency: (value: number) => string;
}

function SummaryCardComponent({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  formatCurrency
}: SummaryCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`mt-1 text-lg font-bold ${colorClass}`}>
            {formatCurrency(value)}
          </p>
        </div>
        <div className={`rounded-full p-2 ${bgClass}`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </div>
    </div>
  );
}

export const SummaryCard = memo(SummaryCardComponent);
