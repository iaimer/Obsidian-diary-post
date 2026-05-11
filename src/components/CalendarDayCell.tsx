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

  useEffect(() => {
    if (imageName && hasDiary) {
      const year = date.getFullYear();
      const historyService = getHistoryService();
      
      historyService.loadImage(imageName, year)
        .then(url => {
          if (url) setImageUrl(url);
        })
        .catch(err => {
          console.error('Failed to load image:', err);
        });
    }
  }, [imageName, hasDiary, date]);

  return (
    <button
      onClick={onClick}
      className={`w-full h-full flex flex-col items-center justify-center rounded-lg relative overflow-hidden
        ${isToday && !imageUrl 
          ? 'bg-indigo-600 text-white font-medium' 
          : hasDiary && !imageUrl
            ? 'bg-blue-50 text-gray-700 hover:bg-blue-100'
            : !hasDiary && !imageUrl
              ? 'text-gray-400 hover:bg-gray-100'
              : ''
        }`}
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {imageUrl && (
        <div className="absolute inset-0 bg-black opacity-30" />
      )}
      
      <span className={`text-sm relative z-10 ${
        isToday 
          ? 'font-bold' 
          : imageUrl 
            ? 'text-white font-medium drop-shadow-md' 
            : ''
      }`}>
        {date.getDate()}
      </span>
      
      {!imageUrl && hasDiary && quickNotesCount > 0 && !isToday && (
        <span className="text-xs text-gray-500 absolute bottom-1">
          {quickNotesCount}条
        </span>
      )}
      
      {imageUrl && (
        <span className="absolute top-1 right-1 text-xs text-white drop-shadow-md z-10">📷</span>
      )}
    </button>
  );
}