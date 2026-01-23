'use client';

import { memo } from 'react';
import Link from 'next/link';

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  formatCurrency: (value: number) => string;
  href?: string;
}

function SummaryCardComponent({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  formatCurrency,
  href
}: SummaryCardProps) {
  const content = (
    <div className="flex flex-col items-center text-center">
      <div className={`rounded-full p-2 ${bgClass} mb-2`}>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-sm md:text-lg font-bold ${colorClass} break-all`}>
        {formatCurrency(value)}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-lg bg-white p-3 md:p-4 shadow dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer">
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg bg-white p-3 md:p-4 shadow dark:bg-gray-800">
      {content}
    </div>
  );
}

export const SummaryCard = memo(SummaryCardComponent);
