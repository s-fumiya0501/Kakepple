'use client';

import { memo } from 'react';
import { Target } from 'lucide-react';

interface BudgetInfo {
  total: number;
  used: number;
  remaining: number;
  dailyBudget: number;
  remainingDays: number;
  percentUsed: number;
}

interface BudgetCardProps {
  budgetInfo: BudgetInfo;
  gradient: string;
  formatCurrency: (value: number) => string;
}

function BudgetCardComponent({ budgetInfo, gradient, formatCurrency }: BudgetCardProps) {
  return (
    <div className={`rounded-lg ${gradient} p-4 text-white`}>
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4" />
        <h4 className="font-semibold text-sm">月次支出目標</h4>
      </div>
      <p className="text-2xl font-bold">{formatCurrency(budgetInfo.remaining)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="opacity-75">1日あたり</p>
          <p className="font-semibold">{formatCurrency(Math.floor(budgetInfo.dailyBudget))}</p>
        </div>
        <div>
          <p className="opacity-75">残り日数</p>
          <p className="font-semibold">{budgetInfo.remainingDays}日</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.min(budgetInfo.percentUsed, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs opacity-75">
          {formatCurrency(budgetInfo.used)} / {formatCurrency(budgetInfo.total)}
        </p>
      </div>
    </div>
  );
}

export const BudgetCard = memo(BudgetCardComponent);
