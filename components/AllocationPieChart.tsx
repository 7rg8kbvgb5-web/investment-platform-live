"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type Allocation = {
  asset_class: string
  target_weight: number
}

const COLORS = [
  "#93c5fd", // soft blue
  "#86efac", // soft green
  "#fde68a", // pastel yellow
  "#fdba74", // pastel orange
  "#c4b5fd", // pastel purple
  "#f9a8d4", // pastel pink
  "#67e8f9", // pastel cyan
]

export default function AllocationPieChart({
  allocations,
}: {
  allocations: Allocation[]
}) {
  const chartData = allocations.map((item) => ({
    name: item.asset_class,
    value: Number(item.target_weight),
  }))

  return (
    <div style={{ width: "100%", height: "340px", minHeight: "340px" }}>
  <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="48%"
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
  stroke="#04142b"
  strokeWidth={3}
/>
            ))}
          </Pie>

          <Tooltip
            formatter={(value) => [`${value}%`, "Target Weight"]}
            contentStyle={{
              background: "#0b2342",
              border: "1px solid #2d4a6b",
              borderRadius: "10px",
              color: "white",
            }}
          />

          <Legend
            verticalAlign="bottom"
            height={40}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}