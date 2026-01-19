'use client';

import { memo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ExpenseDataItem {
  name: string;
  value: number;
  color: string;
}

interface TrendDataItem {
  month: string;
  income: number;
  expense: number;
}

interface ExpensePieChartProps {
  data: ExpenseDataItem[];
}

interface TrendLineChartProps {
  data: TrendDataItem[];
  formatCurrency: (value: string | number) => string;
}

// Expense Pie Chart Component
const ExpensePieChartComponent = ({ data }: ExpensePieChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.name} (¥${entry.value.toLocaleString()})`}
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
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Trend Line Chart Component
const TrendLineChartComponent = ({ data, formatCurrency }: TrendLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10b981"
          name="収入"
          strokeWidth={2}
          animationDuration={800}
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#ef4444"
          name="支出"
          strokeWidth={2}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const ReportExpensePieChart = memo(ExpensePieChartComponent);
export const ReportTrendLineChart = memo(TrendLineChartComponent);
