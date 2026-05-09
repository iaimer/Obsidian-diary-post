import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: { date: string; value: number }[];
  title: string;
  unit: string;
  goal: number;
  color: string;
  icon: string;
}

export default function TrendChart({ data, title, unit, goal, color, icon }: TrendChartProps) {
  // 计算达标率
  const goalMetCount = data.filter(d => d.value >= goal).length;
  const goalRate = data.length > 0 ? Math.round((goalMetCount / data.length) * 100) : 0;

  // 计算平均值
  const avgValue = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)
    : 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {icon} {title}
        </h3>
      </div>

      <div className="h-40 -mx-2 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              width={40}
            />
            <ReferenceLine
              y={goal}
              stroke="#22c55e"
              strokeDasharray="3 3"
              label={{
                value: '目标',
                position: 'right',
                fill: '#22c55e',
                fontSize: 10
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>平均: {avgValue} {unit}</span>
        <span>达标率: {goalRate}%</span>
      </div>
    </div>
  );
}