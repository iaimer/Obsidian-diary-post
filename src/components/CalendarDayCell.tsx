import { useState, useEffect } from 'react';
import { getHistoryService } from '../services/historyService';
import { useDiaryStore } from '../stores/diaryStore';

interface CalendarDayCellProps {
  date: Date;
  imageName?: string;
  isToday: boolean;
  hasDiary: boolean;
  onClick: () => void;
}

async function fetchRemoteImage(year: number, imageName: string, month?: number): Promise<string | null> {
  const { apiUrl, apiToken } = useDiaryStore.getState();
  
  const monthParam = month ? `&month=${month}` : '';
  const url = `${apiUrl}/api/v1/diary/image/${year}/${encodeURIComponent(imageName)}?${monthParam}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  return data.data;
}

export function CalendarDayCell({
  date,
  imageName,
  isToday,
  hasDiary,
  onClick
}: CalendarDayCellProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const remoteMode = useDiaryStore(state => state.remoteMode);

  useEffect(() => {
    if (imageName && hasDiary) {
      setLoading(true);
      setError(false);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      if (remoteMode) {
        fetchRemoteImage(year, imageName, month)
          .then(url => {
            if (url) {
              setImageUrl(url);
            } else {
              setError(true);
            }
          })
          .catch(err => {
            console.error('Failed to load remote image:', err);
            setError(true);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
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
      }
    } else {
      setImageUrl(null);
      setLoading(false);
      setError(false);
    }
  }, [imageName, hasDiary, date, remoteMode]);

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
        ${isToday && imageUrl
          ? 'text-white font-bold drop-shadow-lg'
          : isToday 
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
      
      {/* 有记录指示点 */}
      {!imageUrl && !loading && hasDiary && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5" />
      )}
    </button>
  );
}