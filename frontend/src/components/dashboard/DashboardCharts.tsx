'use client';

import { memo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface PieDataItem {
  name: string;
  value: number;
  color: string;
}

interface MonthlyTrendData {
  month: string;
  収入: number;
  支出: number;
}

interface ExpensePieChartProps {
  data: PieDataItem[];
  formatCurrency: (value: number) => string;
}

interface MonthlyTrendsChartProps {
  data: MonthlyTrendData[];
  formatCurrency: (value: number) => string;
}

function ExpensePieChartComponent({ data, formatCurrency }: ExpensePieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
        今月の支出データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }: any) =>
            `${name} (¥${value.toLocaleString()})`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function MonthlyTrendsChartComponent({ data, formatCurrency }: MonthlyTrendsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
        収支データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="収入" fill="#10b981" animationDuration={800} />
        <Bar dataKey="支出" fill="#ef4444" animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const ExpensePieChart = memo(ExpensePieChartComponent);
export const MonthlyTrendsChart = memo(MonthlyTrendsChartComponent);
