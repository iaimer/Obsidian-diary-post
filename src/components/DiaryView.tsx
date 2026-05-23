import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { DiaryEntry } from '../types';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService, getFileSyncService } from '../services/dataService';
import { getHistoryService } from '../services/historyService';
import { getCachedDiary } from '../db';
import { getDateString } from '../utils/date';
import ImageUploadButton from './ImageUploadButton';
import { ImageModal } from './ImageModal';
import { generateLizhiSays, getAIConfig, isAIConfigured } from '../services/aiPolish';

// 简单的Markdown渲染（阅读模式）
function renderMarkdown(line: string, section?: string): React.ReactNode {
  const colors: Record<string, { time: string; tag: string }> = {
    notes:      { time: 'text-rose-600 dark:text-rose-400',      tag: 'text-gray-300 dark:text-gray-500' },
    happiness:  { time: 'text-amber-600 dark:text-amber-400',    tag: 'text-gray-300 dark:text-gray-500' },
    anxiety:    { time: 'text-orange-600 dark:text-orange-400',   tag: 'text-gray-300 dark:text-gray-500' },
    reflection: { time: 'text-emerald-600 dark:text-emerald-400', tag: 'text-gray-300 dark:text-gray-500' },
    tomorrow:   { time: 'text-sky-600 dark:text-sky-400',         tag: 'text-gray-300 dark:text-gray-500' },
  };
  const sc = colors[section || ''] || colors.notes;
  // 移除HTML注释
  if (line.includes('<!--')) return null;

  // 处理引用块 `> 内容`
  if (line.startsWith('> ') && !line.startsWith('> [!')) {
    let content = line.slice(2);
    const timeMatch = content.match(/\*\*(\d{2}:\d{2})\*\*/);
    const time = timeMatch ? timeMatch[1] : null;
    let textContent = timeMatch ? content.replace(/\*\*\d{2}:\d{2}\*\*/, '').trim() : content;

    const tags = textContent.match(/#\S+/g) || [];
    textContent = textContent.replace(/#\S+/g, '').trim();
    textContent = textContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const bc = colors.happiness || sc;

    return (
      <div className="text-sm text-gray-700 dark:text-gray-200">
        <div className="flex items-start gap-2">
          {time && (
            <span className={`${bc.time} font-medium shrink-0`}>{time}</span>
          )}
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: textContent }} />
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 ml-8">
            {tags.map(tag => (
              <span key={tag} className={`text-xs ${bc.tag}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
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
      <div className="text-sm text-gray-700 dark:text-gray-200">
        <div className="flex items-start gap-2">
          {time && (
            <span className={`font-medium shrink-0 ${sc.time}`}>{time}</span>
          )}
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: textContent }} />
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 ml-8">
            {tags.map(tag => (
              <span key={tag} className={`text-xs ${sc.tag}`}>
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
        <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${checked ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
          {checked ? '✓' : ''}
        </span>
        <span className="text-lg">{emoji}</span>
        <span className="text-gray-700 dark:text-gray-200">{rest}</span>
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [generatingLizhi, setGeneratingLizhi] = useState(false);

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
        // 当天没有日记时，习惯数据回退到默认值
        updateHabitData({ water: 0, steps: 0, reading: false, language: false, supplements: false });
        setLoading(false);
        return;
      }
      
      const remoteMode = useDiaryStore.getState().remoteMode;
      
      const entry = await dataService.getDiary(new Date());
      setDiary(entry);
      setCurrentDiary(entry);
      if (entry.sections.habits) parseHabitData(entry.sections.habits);
      
      // 加载图片
      if (entry.sections.images && entry.sections.images.length > 0) {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        const urls: string[] = [];

        if (remoteMode) {
          const { apiUrl, apiToken } = useDiaryStore.getState();
          for (const line of entry.sections.images) {
            if (line.includes('![[')) {
              const match = line.match(/!\[\[(.*?)\]\]/);
              if (match) {
                const imageName = match[1];
                try {
                  const response = await fetch(
                    `${apiUrl}/api/v1/diary/image/${year}/${imageName}?month=${month}`,
                    { headers: { Authorization: `Token ${apiToken}` } }
                  );
                  if (response.ok) {
                    const data = await response.json();
                    if (data.data) urls.push(data.data);
                  }
                } catch { /* skip failed images */ }
              }
            }
          }
        } else {
          const fileSync = getFileSyncService();
          const historyService = getHistoryService();
          const vaultHandle = fileSync.getVaultHandle();
          if (vaultHandle) {
            historyService.setVaultHandle(vaultHandle);

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
          }
        }

        setImageUrls(urls);
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

  // 生成人生教练
  const handleGenerateLizhiSays = async () => {
    if (!isAIConfigured()) {
      alert('请先在设置页面配置AI API');
      return;
    }
    if (!diary) return;

    // 收集当天日记有内容的所有区块
    const sections: string[] = [];
    const addSection = (title: string, items: string[]) => {
      if (items.length > 0) {
        sections.push(`【${title}】`);
        items.forEach(item => sections.push(item));
      }
    };
    addSection('随手记', quickNotes);
    addSection('小确幸', happiness);
    addSection('焦虑时刻', diary.sections.anxiety.filter(l => l.trim() && !l.includes('<!--')));
    addSection('觉察', reflection);
    addSection('明日寄语', diary.sections.tomorrow.filter(l => l.trim() && !l.includes('<!--')));

    const diaryContext = sections.join('\n') || '今天暂无日记内容';

    setGeneratingLizhi(true);
    try {
      const config = getAIConfig();
      const result = await generateLizhiSays(diaryContext, config);

      // 解析行动建议，从人生教练中抽出写到明日寄语（用标记包裹，便于替换）
      const actionMatch = result.match(/(?:###\s+)?\*{0,2}\s*🎯\s*\*{0,2}\s*行动建议\s*\*{0,2}\s*\n?([\s\S]*?)(?=(?:###\s+)?\*{0,2}\s*💬\s*\*{0,2}\s*暖心鼓励\s*\*{0,2}|$)/);
      if (actionMatch) {
        const actionContent = actionMatch[1].trim();
        if (actionContent) {
          // 直接用AI行动建议完整替换明日寄语
          await getDataService().replaceTomorrowSection(new Date(), actionContent);
        }
      }
      const lizhiSaysContent = actionMatch
        ? result.replace(actionMatch[0], '').replace(/\n{3,}/g, '\n\n').trim()
        : result;

      await getDataService().replaceLizhiSays(new Date(), lizhiSaysContent);
      useDiaryStore.getState().triggerRefresh();
    } catch (err) {
      alert('生成失败: ' + (err as Error).message);
    } finally {
      setGeneratingLizhi(false);
    }
  };

  useEffect(() => {
    if (vaultConnected || remoteMode) loadDiary();
  }, [vaultConnected, remoteMode, refreshKey]); // 监听refreshKey变化

  if (loading && !diary) {
    return (
      <section className="mb-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-700 border-t-amber-600 rounded-full animate-spin-slow" />
          <span className="ml-3 text-sm text-gray-400 dark:text-gray-500">加载中...</span>
        </div>
      </section>
    );
  }

  if (!vaultConnected && !remoteMode) {
    return (
      <section className="mb-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">今日记录</h2>
        <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">请先连接Obsidian Vault</div>
      </section>
    );
  }

  // 日记不存在，显示新建按钮
  if (!loading && diaryExists === false) {
    return (
      <section className="mb-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">📝 今日日记</h2>
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">今天还没有日记</p>
          <button
            onClick={handleCreateDiary}
            disabled={creating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800"
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

  // 焦虑时刻：过滤空行和HTML注释
  const anxiety = diary?.sections.anxiety.filter(l =>
    l.trim() && !l.includes('<!--')
  ) || [];

  const reflection = diary?.sections.reflection.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--') && !l.startsWith('###')
  ) || [];
  
  const lizhiSays = diary?.sections.lizhi_says.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--')
  ) || [];
  
  // 影像记录：过滤空行
  const images = diary?.sections.images.filter(l =>
    l.trim() && l.includes('![[')
  ) || [];

  // 明日寄语：过滤空行和HTML注释
  const tomorrow = diary?.sections.tomorrow.filter(l =>
    l.trim() && l !== '- ' && !l.includes('<!--')
  ) || [];

  return (
    <>
    <section className="mb-8">

      {error && (
        <div className="py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-3 rounded-lg mb-3">加载失败: {error}</div>
      )}

      {/* 随手记 */}
      {quickNotes.length > 0 && (
        <div className="py-3 border-l-2 border-rose-200 dark:border-rose-700 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">✍️ 随手记</h3>
          <div className="space-y-1.5">
            {quickNotes.map((line, i) => (
              <div key={i}>{renderMarkdown(line, 'notes')}</div>
            ))}
          </div>
        </div>
      )}

      {/* 小确幸 */}
      {happiness.length > 0 && (
        <div className="py-3 border-l-2 border-amber-200 dark:border-amber-700 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">✨ 每日小确幸</h3>
          <div className="space-y-1">
            {happiness.map((line, i) => (
              <div key={i}>{renderMarkdown(line, 'happiness')}</div>
            ))}
          </div>
        </div>
      )}

      {/* 觉察 */}
      {reflection.length > 0 && (
        <div className="py-3 border-l-2 border-emerald-300 dark:border-emerald-600 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">💡 觉察与迭代</h3>
          <div className="space-y-1">
            {reflection.map((line, i) => (
              <div key={i}>{renderMarkdown(line, 'reflection')}</div>
            ))}
          </div>
        </div>
      )}

      {/* 人生教练 */}
      <div className="py-3 border-l-2 border-teal-300 dark:border-teal-700 pl-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
          <span>🧠 人生教练</span>
          {lizhiSays.length > 0 && !loading && (
            <button
              onClick={handleGenerateLizhiSays}
              disabled={generatingLizhi}
              className="text-[10px] text-teal-500 dark:text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 disabled:opacity-50"
            >
              {generatingLizhi ? '生成中...' : '🔄 重新生成'}
            </button>
          )}
        </h3>
        {generatingLizhi ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-gray-200 dark:border-gray-700 border-t-amber-600 rounded-full animate-spin-slow" />
            <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
              {diary ? '正在分析今天的日记...' : '生成中...'}
            </span>
          </div>
        ) : lizhiSays.length > 0 ? (
          <div className="space-y-1">
            {lizhiSays.map((line, i) => (
              <div key={i} className="text-sm text-gray-700 dark:text-gray-200">{renderMarkdown(line)}</div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <button
              onClick={handleGenerateLizhiSays}
              disabled={generatingLizhi}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧠 生成今日教练反馈
            </button>
          </div>
        )}
      </div>

      {/* 明日寄语 */}
      {tomorrow.length > 0 && (
        <div className="py-3 border-l-2 border-sky-200 dark:border-sky-700 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">🌙 明日寄语</h3>
          <div className="space-y-1">
            {tomorrow.map((line, i) => (
              <div key={i} className="text-sm text-gray-700 dark:text-gray-200">{renderMarkdown(line, 'tomorrow')}</div>
            ))}
          </div>
        </div>
      )}

      {/* 影像记录 */}
      <div className="py-3 border-l-2 border-violet-300 dark:border-violet-700 pl-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
          <span>📸 影像记录 ({images.length}张)</span>
          <ImageUploadButton onImageUploaded={loadDiary} />
        </h3>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentImageIndex(i);
                  setShowImageModal(true);
                }}
                className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-gray-100 dark:bg-gray-700"
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
        )}
      </div>

      {/* 空状态 */}
      {quickNotes.length === 0 && happiness.length === 0 && anxiety.length === 0 && reflection.length === 0 && tomorrow.length === 0 && images.length === 0 && (
        <div className="py-6">
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm">
            {error ? '加载失败' : '暂无记录'}
          </div>
        </div>
      )}
    </section>
    {showImageModal && imageUrls.length > 0 && (
      <ImageModal
        images={imageUrls}
        currentIndex={currentImageIndex}
        onClose={() => setShowImageModal(false)}
      />
    )}
    </>
  );
});

DiaryView.displayName = 'DiaryView';

export default DiaryView;