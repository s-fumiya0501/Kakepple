'use client';

import { memo } from 'react';
import Link from 'next/link';

interface AssetCardProps {
  label: string;
  value: string | number;
  subLabel: string;
  subValue: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  formatCurrency: (value: string | number) => string;
  href?: string;
}

function AssetCardComponent({
  label,
  value,
  subLabel,
  subValue,
  icon: Icon,
  gradient,
  formatCurrency,
  href = '/assets'
}: AssetCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <h4 className="font-semibold text-sm">{label}</h4>
      </div>
      <p className="text-xl font-bold">{formatCurrency(value)}</p>
      <p className="text-xs opacity-75 mt-1">{subLabel} ({subValue})</p>
    </>
  );

  return (
    <Link href={href} className={`block rounded-lg ${gradient} p-4 text-white hover:opacity-90 transition-opacity cursor-pointer`}>
      {content}
    </Link>
  );
}

export const AssetCard = memo(AssetCardComponent);
