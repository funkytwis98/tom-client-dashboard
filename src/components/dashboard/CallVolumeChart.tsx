'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'

interface CallVolumeChartProps {
  data: { date: string; calls: number }[]
}

export function CallVolumeChart({ data }: CallVolumeChartProps) {
  // Show every ~3rd label to avoid crowding
  const tickInterval = Math.max(1, Math.floor(data.length / 5))

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#111]">Call Volume</h3>
        <span className="text-sm text-[#999]">Last 14 days</span>
      </div>
      {data.every((d) => d.calls === 0) ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-[#999]">
          No calls in the last 14 days
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [value, 'Calls']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => String(label)}
            />
            <Bar dataKey="calls" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.calls > 0 ? '#FFD700' : '#1C1C1F'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
