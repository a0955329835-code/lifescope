"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { HousingCompareData, formatTWD } from "@/lib/calculator";

export default function CompareChart({ data, loanYears, yearsToCompare }: { data: HousingCompareData[], loanYears?: number, yearsToCompare?: number }) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      displayRentNetWorth: Math.round(d.rentNetWorth / 10000), // 轉成萬
      displayBuyNetWorth: Math.round(d.buyNetWorth / 10000), // 轉成萬
    }));
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `第 ${val} 年`}
            dy={10}
          />
          <YAxis
            width={75}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val} 萬`}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(26, 35, 50, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-card)",
              color: "var(--text-primary)",
            }}
            itemStyle={{ color: "var(--text-primary)" }}
            labelFormatter={(label) => `第 ${label} 年`}
            formatter={(value: any, name: any) => {
              if (name === "displayRentNetWorth") return [formatTWD(Number(value) * 10000), "租屋方案淨資產"];
              if (name === "displayBuyNetWorth") return [formatTWD(Number(value) * 10000), "買房方案淨資產"];
              return [value, name];
            }}
          />
          {loanYears && yearsToCompare && loanYears <= yearsToCompare && (
            <ReferenceLine 
              x={loanYears} 
              stroke="var(--text-muted)" 
              strokeDasharray="3 3" 
              label={{ position: 'insideTopLeft', value: `✨ 第 ${loanYears} 年房貸繳清`, fill: 'var(--text-muted)', fontSize: 12 }} 
            />
          )}
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="displayBuyNetWorth"
            name="買房淨資產"
            stroke="var(--accent-secondary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="displayRentNetWorth"
            name="租屋淨資產"
            stroke="var(--accent-primary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
