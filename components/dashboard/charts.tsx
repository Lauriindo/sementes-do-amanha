"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface MonthlyPoint {
  mes: string;
  Entradas: number;
  Saídas: number;
}

export interface CategoryPoint {
  name: string;
  value: number;
}

const PIE_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#94a3b8", "#64748b", "#cbd5e1"];

const money = (v: unknown) => formatCurrency(Number(v));

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={(v) => `${Number(v) / 1000}k`} />
          <Tooltip formatter={money} cursor={{ fill: "#f1f5f9" }} />
          <Legend />
          <Bar dataKey="Entradas" fill="#059669" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Saídas" fill="#f87171" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={money} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
