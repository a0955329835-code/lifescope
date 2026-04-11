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
    }));
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
              if (name === "displayAssets") return [formatTWD(Number(value) * 10000), "總資產 (名目)"];
              if (name === "displayRealAssets") return [formatTWD(Number(value) * 10000), "總資產 (通膨調整後/購買力)"];
              if (name === "displayInvested") return [formatTWD(Number(value) * 10000), "累計投入本金"];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="displayRealAssets"
            name="實質資產 (通膨後)"
            stroke="#f59e0b"
            strokeWidth={3}
            strokeDasharray="5 5"
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
