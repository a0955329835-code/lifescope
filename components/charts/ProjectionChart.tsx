"use client";

import { useMemo } from "react";
import {
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import { YearlyData, formatTWD } from "@/lib/calculator";

export default function ProjectionChart({ data }: { data: YearlyData[] }) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      displayAssets: Math.round(d.assets / 10000), // 轉成萬
      displayRealAssets: Math.round(d.realAssets / 10000), // 轉成萬
      displayInvested: Math.round(d.invested / 10000), // 轉成萬
      displayPortfolio: d.portfolioValue ? Math.round(d.portfolioValue / 10000) : Math.round(d.assets / 10000),
      displayLoan: d.loanBalance ? Math.round(d.loanBalance / 10000) : 0,
    }));
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--text-muted)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--text-muted)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `第 ${val} 年`}
            dy={10}
            minTickGap={30}
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
              if (name === "displayPortfolio") return [formatTWD(Number(value) * 10000), "投資帳戶總市值 (含借款)"];
              if (name === "displayRealAssets") return [formatTWD(Number(value) * 10000), "真實淨資產 (扣除借款/通膨)"];
              if (name === "displayInvested") return [formatTWD(Number(value) * 10000), "累計投入本金"];
              if (name === "displayLoan") return [formatTWD(Number(value) * 10000), "尚未還清貸款"];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          {formattedData.some((d) => d.displayLoan > 0) && (
            <Line
              type="monotone"
              dataKey="displayPortfolio"
              name="投資帳戶總市值"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="displayRealAssets"
            name={formattedData.some((d) => d.displayLoan > 0) ? "真實淨資產" : "實質資產 (通膨後)"}
            stroke="#f59e0b"
            strokeWidth={3}
            strokeDasharray={formattedData.some((d) => d.displayLoan > 0) ? "5 5" : undefined}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="displayInvested"
            name="投入本金"
            stroke="var(--text-muted)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorInvested)"
          />
          <Area
            type="monotone"
            dataKey="displayAssets"
            name="名目總資產"
            stroke="var(--accent-primary)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorAssets)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
