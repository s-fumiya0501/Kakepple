'use client';

import { memo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  count?: number;
  percentage?: number;
}

interface PieChartProps {
  data: ChartDataItem[];
}

interface BarChartProps {
  data: ChartDataItem[];
  formatCurrency: (value: string | number) => string;
}

// Income Pie Chart Component
const IncomePieChartComponent = ({ data }: PieChartProps) => {
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

// Expense Pie Chart Component
const ExpensePieChartComponent = ({ data }: PieChartProps) => {
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

// Top Expense Bar Chart Component
const TopExpenseBarChartComponent = ({ data, formatCurrency }: BarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="value" fill="#ec4899" name="支出額" animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const IncomePieChart = memo(IncomePieChartComponent);
export const ExpensePieChart = memo(ExpensePieChartComponent);
export const TopExpenseBarChart = memo(TopExpenseBarChartComponent);
