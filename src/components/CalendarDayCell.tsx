import { useState, useEffect } from 'react';
import { getHistoryService } from '../services/historyService';

interface CalendarDayCellProps {
  date: Date;
  imageName?: string;
  isToday: boolean;
  hasDiary: boolean;
  quickNotesCount: number;
  onClick: () => void;
}

export function CalendarDayCell({
  date,
  imageName,
  isToday,
  hasDiary,
  quickNotesCount,
  onClick
}: CalendarDayCellProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imageName && hasDiary) {
      setLoading(true);
      setError(false);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 月份从0开始，需要+1
      const historyService = getHistoryService();
      
      historyService.loadImage(imageName, year, month)
        .then(url => {
          if (url) {
            setImageUrl(url);
          } else {
            setError(true);
          }
        })
        .catch(err => {
          console.error('Failed to load image:', err);
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setImageUrl(null);
      setLoading(false);
      setError(false);
    }
  }, [imageName, hasDiary, date]);

  return (
    <button
      onClick={onClick}
      className={`w-full h-full flex flex-col items-center justify-center rounded-lg relative overflow-hidden transition-all duration-200
        ${isToday && !imageUrl && !loading 
          ? 'bg-indigo-600 text-white font-medium shadow-md' 
          : hasDiary && !imageUrl && !loading
            ? 'bg-blue-50 text-gray-700 hover:bg-blue-100'
            : !hasDiary && !imageUrl && !loading
              ? 'text-gray-400 hover:bg-gray-50'
              : imageUrl
                ? 'hover:shadow-lg'
                : loading
                  ? 'bg-gray-100'
                  : ''
        }`}
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* 图片背景遮罩层 */}
      {imageUrl && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/40" />
      )}
      
      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-xs text-gray-400">📷</span>
        </div>
      )}
      
      {/* 错误状态 */}
      {error && imageName && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
          <span className="text-xs text-red-300">📷</span>
        </div>
      )}
      
      {/* 日期数字 */}
      <span className={`text-sm relative z-10 transition-all
        ${isToday 
          ? 'font-bold' 
          : imageUrl 
            ? 'text-white font-semibold drop-shadow-lg' 
            : loading
              ? 'text-gray-400'
              : error
                ? 'text-red-400'
                : ''
        }`}>
        {date.getDate()}
      </span>
      
      {/* 随手记数量 */}
      {!imageUrl && !loading && hasDiary && quickNotesCount > 0 && !isToday && (
        <span className="text-xs text-gray-500 absolute bottom-1 bg-white/80 px-1 rounded">
          {quickNotesCount}条
        </span>
      )}
      
      {/* 图片标记 */}
      {imageUrl && !loading && !error && (
        <span className="absolute top-1 right-1 text-xs text-white drop-shadow-lg z-10 bg-black/40 rounded-full px-1">
          📷
        </span>
      )}
    </button>
  );
}