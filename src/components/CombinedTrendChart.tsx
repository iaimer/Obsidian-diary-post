import { LineChart, Line, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface CombinedTrendChartProps {
  waterData: { date: string; value: number }[];
  stepsData: { date: string; value: number }[];
  avgWater?: number;
  avgSteps?: number;
  waterGoalRate?: number;
  stepsGoalRate?: number;
}

export default function CombinedTrendChart({
  waterData,
  stepsData,
  avgWater = 0,
  avgSteps = 0,
  waterGoalRate = 0,
  stepsGoalRate = 0
}: CombinedTrendChartProps) {
  // 合并数据
  const combinedData = waterData.map((item, idx) => ({
    date: item.date,
    water: item.value,
    steps: stepsData[idx]?.value || 0
  }));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          📈 习惯趋势
        </h3>
      </div>

      <div className="h-40 -mx-2 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combinedData}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            {/* 左边Y轴 - 饮水 */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#3b82f6' }}
              axisLine={{ stroke: '#3b82f6' }}
              tickLine={false}
              width={45}
            />
            {/* 右边Y轴 - 步数 */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#f97316' }}
              axisLine={{ stroke: '#f97316' }}
              tickLine={false}
              width={45}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'water') return [`${value} mL`, '饮水'];
                if (name === 'steps') return [`${value} 步`, '运动'];
                return [String(value), String(name)];
              }}
              labelFormatter={(label) => `日期: ${label}`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 5 }}
              formatter={(value) => value === 'water' ? '💧 饮水(mL)' : '🏃 运动(步)'}
            />
            {/* 饮水曲线 - 使用左边Y轴 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="water"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#3b82f6' }}
            />
            {/* 运动曲线 - 使用右边Y轴 */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="steps"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#f97316' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 统计汇总 */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="text-center">
          <div className="text-blue-500 font-medium">💧 饮水</div>
          <div className="text-gray-500">平均 {avgWater} mL</div>
          <div className="text-gray-400">达标率 {waterGoalRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-orange-500 font-medium">🏃 运动</div>
          <div className="text-gray-500">平均 {avgSteps} 步</div>
          <div className="text-gray-400">达标率 {stepsGoalRate}%</div>
        </div>
      </div>
    </div>
  );
}