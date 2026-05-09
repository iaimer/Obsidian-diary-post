interface HabitHeatmapProps {
  data: { date: string; completed: boolean }[];
  title: string;
  icon: string;
}

export default function HabitHeatmap({ data, title, icon }: HabitHeatmapProps) {
  // 计算完成率
  const completedCount = data.filter(d => d.completed).length;
  const rate = data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="flex justify-between items-center mb-1 px-1">
        <div className="text-xs font-medium text-gray-600">
          {icon} {title}
        </div>
        <div className="text-xs text-gray-400">
          {rate}%
        </div>
      </div>

      {/* 热力图网格 - 大方块小间距填满整行 */}
      <div className="grid grid-cols-7 gap-[2px]">
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`w-4 h-4 rounded-sm ${
              item.completed
                ? 'bg-green-500'
                : 'bg-gray-200'
            }`}
            title={`${item.date}: ${item.completed ? '已完成' : '未完成'}`}
          />
        ))}
      </div>
    </div>
  );
}