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

function renderMarkdown(line: string, section?: string): React.ReactNode {
  const colors: Record<string, { time: string; tag: string }> = {
    notes:      { time: 'text-rose-600 dark:text-rose-400',      tag: 'text-gray-300 dark:text-gray-500' },
    happiness:  { time: 'text-amber-600 dark:text-amber-400',    tag: 'text-gray-300 dark:text-gray-500' },
    anxiety:    { time: 'text-orange-600 dark:text-orange-400',   tag: 'text-gray-300 dark:text-gray-500' },
    reflection: { time: 'text-emerald-600 dark:text-emerald-400', tag: 'text-gray-300 dark:text-gray-500' },
    tomorrow:   { time: 'text-sky-600 dark:text-sky-400',         tag: 'text-gray-300 dark:text-gray-500' },
  };
  const sc = colors[section || ''] || colors.notes;

  if (line.includes('<!--')) return null;

  if (line.startsWith('> ') && !line.startsWith('> [!')) {
    let content = line.slice(2);
    const timeMatch = content.match(/\*\*(\d{2}:\d{2})\*\*/);
    const time = timeMatch ? timeMatch[1] : null;
    let textContent = timeMatch ? content.replace(/\*\*\d{2}:\d{2}\*\*/, '').trim() : content;

    const tags = textContent.match(/#\S+/g) || [];
    textContent = textContent.replace(/#\S+/g, '').trim();
    textContent = textContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const bc = colors[section || ''] || colors.happiness;
    const isAnxiety = section === 'anxiety';

    return (
      <div className={`text-sm ${isAnxiety ? 'text-orange-700 dark:text-orange-300 italic' : 'text-gray-700 dark:text-gray-200'}`}>
        <div className="flex items-start gap-2">
          {time && (
            <span className={`${bc.time} font-medium shrink-0`}>{time}</span>
          )}
          <div className="flex-1 min-w-0 break-words">
            <span dangerouslySetInnerHTML={{ __html: textContent }} />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map(tag => (
                  <span key={tag} className={`text-xs ${bc.tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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

    const isAnxiety = section === 'anxiety';

    return (
      <div className={`text-sm ${isAnxiety ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
        <div className="flex items-start gap-2">
          {time && (
            <span className={`font-medium shrink-0 ${sc.time}`}>{time}</span>
          )}
          <div className="flex-1 min-w-0 break-words">
            <span dangerouslySetInnerHTML={{ __html: textContent }} />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map(tag => (
                  <span key={tag} className={`text-xs ${sc.tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (line.includes('![[')) {
    return null;
  }

  let plainText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  if (plainText !== line) {
    return <span className="text-sm text-gray-700 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: plainText }} />;
  }
  return <span className="text-sm text-gray-700 dark:text-gray-200">{line}</span>;
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
  const anxiety = diary?.sections.anxiety.filter(l =>
    l.trim() && !l.includes('<!--')
  ) || [];

  const hasAnxietyContent = anxiety.some(l =>
    !(l.startsWith('> ') && l.slice(2).trim() === '') &&
    !['- 今天什么时候我感到焦虑/紧张？', '- 当时我在担心什么？（具体到一句话)', '- 我做了什么？', '- 这个应对是帮我面对了，还是帮我躲开了？'].includes(l.trim())
  );
  const reflection = diary?.sections.reflection.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--')
  ) || [];
  const lizhiSays = diary?.sections.lizhi_says.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--')
  ) || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          📝 {date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
        </h3>
      </div>

      {loading && (
        <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
          加载中...
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs">
          加载失败: {error}
        </div>
      )}

      {!loading && !error && diary && (
        <div className="px-4 py-4 space-y-3">
          {quickNotes.length > 0 && (
            <div className="py-3 border-l-2 border-rose-200 dark:border-rose-700 pl-3">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">✍️ 随手记</h4>
              <div className="space-y-1.5">
                {quickNotes.map((line, i) => (
                  <div key={i}>{renderMarkdown(line, 'notes')}</div>
                ))}
              </div>
            </div>
          )}

          {happiness.length > 0 && (
            <div className="py-3 border-l-2 border-amber-200 dark:border-amber-700 pl-3">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">✨ 每日小确幸</h4>
              <div className="space-y-1">
                {happiness.map((line, i) => (
                  <div key={i}>{renderMarkdown(line, 'happiness')}</div>
                ))}
              </div>
            </div>
          )}

          {hasAnxietyContent && (
            <div className="py-3 border-l-2 border-orange-200 dark:border-orange-700 pl-3">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">😰 焦虑时刻</h4>
              <div className="space-y-1">
                {anxiety.map((line, i) => (
                  <div key={i}>{renderMarkdown(line, 'anxiety')}</div>
                ))}
              </div>
            </div>
          )}

          {reflection.length > 0 && (
            <div className="py-3 border-l-2 border-emerald-300 dark:border-emerald-600 pl-3">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">💡 觉察与迭代</h4>
              <div className="space-y-1">
                {reflection.map((line, i) => (
                  <div key={i}>{renderMarkdown(line, 'reflection')}</div>
                ))}
              </div>
            </div>
          )}

          {lizhiSays.length > 0 && (
            <div className="py-3 border-l-2 border-teal-300 dark:border-teal-700 pl-3">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">🧠 人生教练</h4>
              <div className="space-y-1">
                {lizhiSays.map((line, i) => (
                  <div key={i} className="text-sm text-gray-700 dark:text-gray-200 italic">{renderMarkdown(line)}</div>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="py-3 border-l-2 border-violet-300 dark:border-violet-700 pl-3">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">📸 影像记录 ({images.length}张)</h4>
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
           anxiety.length === 0 && reflection.length === 0 &&
           lizhiSays.length === 0 && images.length === 0 && (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
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