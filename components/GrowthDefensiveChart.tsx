"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type Props = {
  growthTotal: number
  defensiveTotal: number
}

const COLORS = ["#93c5fd", "#86efac"]

export default function GrowthDefensiveChart({
  growthTotal,
  defensiveTotal,
}: Props) {
  const chartData = [
    { name: "Growth", value: growthTotal },
    { name: "Defensive", value: defensiveTotal },
  ]

  return (
    <div style={{ width: "100%", height: "340px", minHeight: "340px" }}>
  <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={45}
outerRadius={115}
paddingAngle={2}
cornerRadius={2}
            label={false}
labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#0b2342"
                strokeWidth={3}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value) => [`${value}%`, "Allocation"]}
            contentStyle={{
              background: "#0b2342",
              border: "1px solid #2d4a6b",
              borderRadius: "10px",
              color: "white",
            }}
          />

          <Legend verticalAlign="bottom" height={40} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}