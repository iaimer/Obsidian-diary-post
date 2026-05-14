import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { DiaryEntry } from '../types';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService, getFileSyncService } from '../services/dataService';
import { getHistoryService } from '../services/historyService';
import { getCachedDiary } from '../db';
import { getDateString } from '../utils/date';

// 简单的Markdown渲染（阅读模式）
function renderMarkdown(line: string): React.ReactNode {
  // 移除HTML注释
  if (line.includes('<!--')) return null;

  // 处理引用块 `> 内容`
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

  // 处理列表项 `- **HH:MM** 内容 #标签`
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

  // 处理复选框 `[x]` 或 `[ ]`
  if (line.includes('[x]') || line.includes('[ ]')) {
    const checked = line.includes('[x]');
    const emojiMatch = line.match(/([🥛🧘📖🇬🇧💊])/);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const rest = line.replace(/\[(x| )\]/, '').replace(emoji, '').trim();

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${checked ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
          {checked ? '✓' : ''}
        </span>
        <span className="text-lg">{emoji}</span>
        <span className="text-gray-700">{rest}</span>
      </div>
    );
  }

  // 处理饮水/运动特殊格式（含🥤）
  if (line.includes('🥤') || line.includes('饮水') || line.includes('步')) {
    const emojiMatch = line.match(/([🥛🧘🥤])/);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const text = line.replace(emoji, '').replace(/[🥛🧘🥤]/g, '').trim();

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">{emoji}</span>
        <span className="text-gray-700">{text}</span>
      </div>
    );
  }

  // 普通文本
  let plainText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  if (plainText !== line) {
    return <span className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: plainText }} />;
  }
  return <span className="text-sm text-gray-700">{line}</span>;
}

interface DiaryViewProps {}

export interface DiaryViewRef {
  reload: () => Promise<void>;
}

const DiaryView = forwardRef<DiaryViewRef, DiaryViewProps>((_, ref) => {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const refreshKey = useDiaryStore(state => state.refreshKey);
  const setCurrentDiary = useDiaryStore(state => state.setCurrentDiary);
  const updateHabitData = useDiaryStore(state => state.updateHabitData);

  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaryExists, setDiaryExists] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // 解析习惯数据
  const parseHabitData = (habits: string[]) => {
    if (!habits || habits.length === 0) return;

    const waterLine = habits.find(h => h.includes('饮水') || h.includes('🥛'));
    const stepsLine = habits.find(h => h.includes('步') && h.includes('运动'));

    const waterValue = waterLine ? parseInt(waterLine.match(/\d+/)?.[0] || '0') : 0;
    const stepsValue = stepsLine ? parseInt(stepsLine.match(/\d+/)?.[0] || '0') : 0;

    const readingLine = habits.find(h => h.includes('📖'));
    const languageLine = habits.find(h => h.includes('🇬🇧') || h.includes('学语言'));
    const supplementsLine = habits.find(h => h.includes('💊') || h.includes('鱼油'));

    updateHabitData({
      water: waterValue,
      steps: stepsValue,
      reading: readingLine?.includes('[x]') || false,
      language: languageLine?.includes('[x]') || false,
      supplements: supplementsLine?.includes('[x]') || false
    });
  };

  // 加载日记
  const loadDiary = async () => {
    setLoading(true);
    setError(null);

    try {
      const dataService = getDataService();
      
      // 先检查文件是否存在
      const exists = await dataService.checkDiaryExists(new Date());
      setDiaryExists(exists);
      
      if (!exists) {
        setLoading(false);
        return;
      }
      
      const remoteMode = useDiaryStore.getState().remoteMode;
      
      const entry = await dataService.getDiary(new Date());
      setDiary(entry);
      setCurrentDiary(entry);
      if (entry.sections.habits) parseHabitData(entry.sections.habits);
      
      // 加载图片（仅本地模式）
      if (!remoteMode && entry.sections.images && entry.sections.images.length > 0) {
        const fileSync = getFileSyncService();
        const historyService = getHistoryService();
        const vaultHandle = fileSync.getVaultHandle();
        if (vaultHandle) {
          historyService.setVaultHandle(vaultHandle);
          
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;
          const urls: string[] = [];
          
          for (const line of entry.sections.images) {
            if (line.includes('![[')) {
              const match = line.match(/!\[\[(.*?)\]\]/);
              if (match) {
                const imageName = match[1];
                const url = await historyService.loadImage(imageName, year, month);
                if (url) urls.push(url);
              }
            }
          }
          
          setImageUrls(urls);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      const today = getDateString(new Date());
      const cached = await getCachedDiary(today);
      if (cached) setDiary(cached);
    } finally {
      setLoading(false);
    }
  };

  // 暴露reload方法给父组件
  useImperativeHandle(ref, () => ({
    reload: loadDiary
  }));

  // 创建新日记
  const handleCreateDiary = async () => {
    setCreating(true);
    setError(null);
    console.log('开始创建日记...');
    try {
      const dataService = getDataService();
      await dataService.createDiary(new Date());
      console.log('日记创建成功');
      setDiaryExists(true);
      // 创建后重新加载
      await loadDiary();
    } catch (err) {
      console.error('创建日记失败:', err);
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (vaultConnected || remoteMode) loadDiary();
  }, [vaultConnected, remoteMode, refreshKey]); // 监听refreshKey变化

  if (loading && !diary) {
    return (
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="text-center py-6 text-gray-400 text-sm">加载中...</div>
      </section>
    );
  }

  if (!vaultConnected && !remoteMode) {
    return (
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3">今日记录</h2>
        <div className="text-center py-6 text-gray-400 text-sm">请先连接Obsidian Vault</div>
      </section>
    );
  }

  // 日记不存在，显示新建按钮
  if (!loading && diaryExists === false) {
    return (
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3">📝 今日日记</h2>
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-4">今天还没有日记</p>
          <button
            onClick={handleCreateDiary}
            disabled={creating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {creating ? '创建中...' : '新建日记'}
          </button>
        </div>
      </section>
    );
  }

  // 过滤有效内容（排除空行、HTML注释、模板示例）
  const quickNotes = diary?.sections.quick_notes.filter(l =>
    l.trim() && !l.includes('<!--') && !l.includes('- **HH:MM** 内容 #标签')
  ) || [];
  
  // 小确幸：过滤引导文字和空引用，保留实际内容
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
  
  // 影像记录：过滤空行
  const images = diary?.sections.images.filter(l =>
    l.trim() && l.includes('![[')
  ) || [];

  return (
    <section className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-medium text-gray-500">📝 今日日记</h2>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">加载失败: {error}</div>
      )}

      {/* 随手记 */}
      {quickNotes.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-gray-400 mb-2">✍️ 随手记</h3>
          <div className="space-y-1.5">
            {quickNotes.map((line, i) => (
              <div key={i}>{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 小确幸 */}
      {happiness.length > 0 && (
        <div className="mx-4 my-3 bg-green-50 px-3 py-2 rounded-lg">
          <h3 className="text-xs font-medium text-gray-400 mb-2">✨ 每日小确幸</h3>
          <div className="space-y-1">
            {happiness.map((line, i) => (
              <div key={i}>{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 觉察 */}
      {reflection.length > 0 && (
        <div className="mx-4 my-3 bg-yellow-50 px-3 py-2 rounded-lg">
          <h3 className="text-xs font-medium text-gray-400 mb-2">💡 觉察与迭代</h3>
          <div className="space-y-1">
            {reflection.map((line, i) => (
              <div key={i}>{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 荔枝喵说 */}
      {lizhiSays.length > 0 && (
        <div className="mx-4 my-3 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 rounded-lg">
          <h3 className="text-xs font-medium text-gray-400 mb-2">🧠 荔枝喵说</h3>
          <div className="space-y-1">
            {lizhiSays.map((line, i) => (
              <div key={i} className="text-sm text-gray-700 italic">{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 影像记录 */}
      {images.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-xs font-medium text-gray-400 mb-2">📸 影像记录 ({images.length}张)</h3>
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={url}
                  alt={`Image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {quickNotes.length === 0 && happiness.length === 0 && reflection.length === 0 && lizhiSays.length === 0 && images.length === 0 && (
        <div className="px-4 py-6">
          <div className="text-center text-gray-400 text-sm">
            {error ? '加载失败' : '暂无记录'}
          </div>
        </div>
      )}
    </section>
  );
});

DiaryView.displayName = 'DiaryView';

export default DiaryView;