import { useState, useEffect } from 'react';
import { DiaryEntry } from '../types';
import { getHistoryService } from '../services/historyService';
import { getDataService } from '../services/dataService';
import { useDiaryStore } from '../stores/diaryStore';
import { ImageModal } from './ImageModal';

interface DiaryDetailProps {
  date: Date;
  onClose?: () => void;
}

function renderMarkdown(line: string): React.ReactNode {
  if (line.includes('<!--')) return null;

  if (line.startsWith('> ') && !line.startsWith('> [!')) {
    let content = line.slice(2);
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return (
      <span 
        className="text-gray-600 italic pl-2 border-l-2 border-green-200" 
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    );
  }

  if (line.startsWith('- ')) {
    const content = line.slice(2);
    const timeMatch = content.match(/\*\*(\d{2}:\d{2})\*\*/);
    const time = timeMatch ? timeMatch[1] : null;
    let textContent = timeMatch ? content.replace(/\*\*\d{2}:\d{2}\*\*/, '').trim() : content;

    const tags = textContent.match(/#\S+/g) || [];
    textContent = textContent.replace(/#\S+/g, '').trim();
    textContent = textContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return (
      <div className="text-sm text-gray-700">
        <div className="flex items-start gap-2">
          {time && (
            <span className="text-indigo-600 font-medium shrink-0">{time}</span>
          )}
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: textContent }} />
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 ml-8">
            {tags.map(tag => (
              <span key={tag} className="text-xs text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (line.includes('![[')) {
    return null;
  }

  let plainText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  if (plainText !== line) {
    return <span className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: plainText }} />;
  }
  return <span className="text-sm text-gray-700">{line}</span>;
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

export function DiaryDetail({ date }: DiaryDetailProps) {
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const loadDiary = async () => {
      setLoading(true);
      setError(null);
      setImages([]);
      
      const remoteMode = useDiaryStore.getState().remoteMode;
      
      try {
        if (remoteMode) {
          const dataService = getDataService();
          const entry = await dataService.getDiary(date);
          setDiary(entry);
          
          if (entry.sections.images && entry.sections.images.length > 0) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const imageUrls: string[] = [];
            
            for (const line of entry.sections.images) {
              if (line.includes('![[')) {
                const match = line.match(/!\[\[(.*?)\]\]/);
                if (match) {
                  const imageName = match[1];
                  const url = await fetchRemoteImage(year, imageName, month);
                  if (url) imageUrls.push(url);
                }
              }
            }
            
            setImages(imageUrls);
          }
        } else {
          const historyService = getHistoryService();
          const entry = await historyService.loadDiary(date);
          
          if (entry) {
            setDiary(entry);
            
            if (entry.sections.images && entry.sections.images.length > 0) {
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              const imageUrls: string[] = [];
              
              for (const line of entry.sections.images) {
                if (line.includes('![[')) {
                  const match = line.match(/!\[\[(.*?)\]\]/);
                  if (match) {
                    const imageName = match[1];
                    const url = await historyService.loadImage(imageName, year, month);
                    if (url) imageUrls.push(url);
                  }
                }
              }
              
              setImages(imageUrls);
            }
          } else {
            setError('日记不存在');
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadDiary();
  }, [date]);

  const quickNotes = diary?.sections.quick_notes.filter(l =>
    l.trim() && !l.includes('<!--') && !l.includes('- **HH:MM** 内容 #标签')
  ) || [];
  const happiness = diary?.sections.happiness.filter(l =>
    l.trim() && 
    !l.includes('[!success]') && 
    !l.includes('[!') && 
    !(l.startsWith('> ') && l.slice(2).trim() === '')
  ) || [];
  const reflection = diary?.sections.reflection.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--')
  ) || [];
  const lizhiSays = diary?.sections.lizhi_says.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--')
  ) || [];

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium text-gray-500">
          📝 {date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </h3>
      </div>

      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">
          加载中...
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">
          加载失败: {error}
        </div>
      )}

      {!loading && !error && diary && (
        <div className="px-4 py-4 space-y-4">
          {quickNotes.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-3">✍️ 随手记</h4>
              <div className="space-y-1.5">
                {quickNotes.map((line, i) => (
                  <div key={i}>{renderMarkdown(line)}</div>
                ))}
              </div>
            </div>
          )}

          {happiness.length > 0 && (
            <div className="bg-green-50 px-3 py-2 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400 mb-2">✨ 每日小确幸</h4>
              <div className="space-y-1">
                {happiness.map((line, i) => (
                  <div key={i}>{renderMarkdown(line)}</div>
                ))}
              </div>
            </div>
          )}

          {reflection.length > 0 && (
            <div className="bg-yellow-50 px-3 py-2 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400 mb-2">💡 觉察与迭代</h4>
              <div className="space-y-1">
                {reflection.map((line, i) => (
                  <div key={i}>{renderMarkdown(line)}</div>
                ))}
              </div>
            </div>
          )}

          {lizhiSays.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400 mb-2">🧠 荔枝喵说</h4>
              <div className="space-y-1">
                {lizhiSays.map((line, i) => (
                  <div key={i} className="text-sm text-gray-700 italic">{renderMarkdown(line)}</div>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-400 mb-3">📸 影像记录 ({images.length}张)</h4>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentImageIndex(i);
                      setShowImageModal(true);
                    }}
                    className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`Image ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {quickNotes.length === 0 && happiness.length === 0 && 
           reflection.length === 0 && lizhiSays.length === 0 && images.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              暂无记录
            </div>
          )}
        </div>
      )}

      {showImageModal && images.length > 0 && (
        <ImageModal
          images={images}
          currentIndex={currentImageIndex}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
}