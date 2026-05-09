import HabitStats from './HabitStats';

interface StatsPageProps {
  onBack: () => void;
}

export default function StatsPage({ onBack }: StatsPageProps) {
  return (
    <div className="min-h-screen bg-gray-100 pb-4">
      {/* 头部 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="p-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium text-gray-800">📊 习惯统计（近30天）</h1>
            <button
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={onBack}
            >
              返回
            </button>
          </div>
        </div>
      </div>

      {/* 统计内容 */}
      <div className="p-4 max-w-md mx-auto">
        <HabitStats days={30} />
      </div>
    </div>
  );
}