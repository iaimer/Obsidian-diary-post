interface HabitHeatmapProps {
  data: { date: string; completed: boolean }[];
  title: string;
  icon: string;
  days?: number;
}

export default function HabitHeatmap({ data, title, icon, days = 30 }: HabitHeatmapProps) {
  // 计算完成率
  const completedCount = data.filter(d => d.completed).length;
  const rate = data.length > 0 ? Math.round((completedCount / data.length) * 100) : 0;

  // 计算连续打卡天数（最长连续）
  let maxStreak = 0;
  let currentStreak = 0;
  for (const item of data) {
    if (item.completed) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // 根据连续打卡位置计算颜色深度
  const getGreenLevel = (index: number): string => {
    let streak = 0;
    for (let i = index; i >= 0; i--) {
      if (allCells[i]?.completed) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7) return 'bg-green-700 dark:bg-green-600';
    if (streak >= 5) return 'bg-green-600 dark:bg-green-500';
    if (streak >= 3) return 'bg-green-500 dark:bg-green-400';
    if (streak >= 1) return 'bg-green-400 dark:bg-green-300';
    return 'bg-gray-100 dark:bg-gray-700';
  };

  // 计算第一天需要多少空白方块来对齐周一
  const firstDate = data[0]?.date;
  const firstDayOfWeek = firstDate ? new Date(firstDate).getDay() : 0;
  const offsetDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // 创建完整的格子数组
  const allCells: ({ date: string; completed: boolean } | null)[] = [
    ...Array(offsetDays).fill(null),
    ...data
  ];

  // 根据天数调整方块大小和间距
  // 30天：大方块 (gap-2)
  // 60天：中方块 (gap-1.5)
  // 90天：小方块 (gap-1)
  const gapSize = days >= 90 ? 'gap-1' : days >= 60 ? 'gap-1.5' : 'gap-2';

  return (
    <div>
      {/* 标题和统计 */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {icon} {title}
        </div>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>完成率 {rate}%</span>
          <span>最长连续 {maxStreak}天</span>
        </div>
      </div>

      {/* 星期标签 */}
      <div className={`grid grid-cols-7 ${gapSize} mb-2 text-xs text-gray-400 dark:text-gray-500`}>
        <span>一</span>
        <span>二</span>
        <span>三</span>
        <span>四</span>
        <span>五</span>
        <span className="text-orange-400 dark:text-orange-500">六</span>
        <span className="text-orange-400 dark:text-orange-500">日</span>
      </div>

      {/* 热力图网格 */}
      <div className={`grid grid-cols-7 ${gapSize}`}>
        {allCells.map((item, idx) => (
          <div
            key={idx}
            className={`w-full aspect-square rounded-md transition-colors ${
              item === null
                ? 'bg-transparent'
                : item.completed
                  ? getGreenLevel(idx)
                  : 'bg-gray-100 dark:bg-gray-700'
            }`}
            title={item ? `${item.date}: ${item.completed ? '已完成' : '未完成'}` : ''}
          />
        ))}
      </div>

      {/* 日期范围 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
        {data.length > 0 && `${data[0].date} ~ ${data[data.length - 1].date}`}
      </div>
    </div>
  );
}