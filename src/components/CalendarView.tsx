import { useState } from 'react';
import { DiaryMeta } from '../types/history';
import { CalendarDayCell } from './CalendarDayCell';

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (year: number, month: number) => void;
  diaryMetas?: DiaryMeta[];
  loading?: boolean;
}

export function CalendarView({ onDateSelect, onMonthChange, diaryMetas = [], loading }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: (Date | null)[] = [];
    
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const goToPrevMonth = () => {
    const newMonth = new Date(year, month - 2, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth() + 1);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(year, month, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth() + 1);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const getDiaryMeta = (date: Date): DiaryMeta | undefined => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return diaryMetas.find(meta => meta.date === dateStr);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* 月份标题和切换 */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          📅 {year}年{month}月
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          ›
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-center text-xs text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return (
              <div key={index} className="aspect-square flex items-center justify-center">
                <div className="text-gray-300">-</div>
              </div>
            );
          }

          const meta = getDiaryMeta(date);
          const hasDiary = meta?.exists || false;
          const imageName = meta?.firstImage;

          return (
            <div key={index} className="aspect-square">
              <CalendarDayCell
                date={date}
                imageName={imageName}
                isToday={isToday(date)}
                hasDiary={hasDiary}
                onClick={() => onDateSelect?.(date)}
              />
            </div>
          );
        })}
      </div>
      
      {loading && (
        <div className="text-center text-xs text-gray-400 py-2">
          加载中...
        </div>
      )}
    </div>
  );
}