import { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DiaryEntry, DiarySection } from '../types';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService, getFileSyncService } from '../services/dataService';
import { getHistoryService } from '../services/historyService';
import { CheckmarkIcon } from './Icons';
import { getCachedDiary } from '../db';
import { getShanghaiCalendarDate, getShanghaiDateString } from '../utils/date';
import { ImageModal } from './ImageModal';
import { generateLizhiSays, getAIConfig, isAIConfigured, polishContent } from '../services/aiPolish';
import { parseTagsFromPolished } from '../utils/polishResult';
import { ConfirmDialog } from './ConfirmDialog';

function renderInlineMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function groupDiaryLines(lines: string[]): string[] {
  const groups: string[] = [];
  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('> ')) {
      groups.push(line);
    } else if (groups.length > 0) {
      groups[groups.length - 1] += `\n\n${line}`;
    } else {
      groups.push(line);
    }
  }
  return groups;
}

function extractEditableContent(line: string): string {
  let content = line.replace(/^[-<>]\s+/, '');
  content = content.replace(/\*\*\d{2}:\d{2}\*\*\s*/, '');
  content = content.replace(/(\s*#\S+)+$/, '');
  return content.trim();
}

function extractTags(line: string): string {
  const tags = line.match(/(\s*#\S+(?:\s+#\S+)*)\s*$/);
  return tags ? tags[1].trim() : '';
}

function rebuildLine(original: string, newContent: string, newTags?: string): string {
  const tagStr = newTags ? ' ' + newTags.trim() : '';
  let prefix = '';
  if (original.startsWith('> **') || original.startsWith('- **')) {
    prefix = original.substring(0, original.indexOf('**') + 9);
  } else if (original.startsWith('> ')) {
    prefix = '> ';
  } else if (original.startsWith('- ')) {
    prefix = '- ';
  }
  return prefix + newContent + tagStr;
}

function getSectionForLine(section: string): DiarySection {
  switch (section) {
    case 'notes': return DiarySection.QUICK_NOTES;
    case 'happiness': return DiarySection.HAPPINESS;
    case 'reflection': return DiarySection.REFLECTION;
    case 'anxiety': return DiarySection.ANXIETY;
    case 'tomorrow': return DiarySection.TOMORROW;
    case 'images': return DiarySection.IMAGES;
    default: return DiarySection.QUICK_NOTES;
  }
}

function getFirstLine(grouped: string): string {
  return grouped.split('\n\n')[0];
}

function isNonEditableEntry(line: string): boolean {
  const trimmed = line.trim();
  return !trimmed || /^- \[[ x]\]/.test(trimmed) || trimmed.includes('🥤') || trimmed.includes('🥛') || trimmed.includes('🧘');
}

function EntryRow({ children, line, section, onEdit, onDelete, menuId, isOpen, onToggle }: {
  children: React.ReactNode;
  line: string;
  section: string;
  onEdit: (line: string, section: string, firstLine: string) => void;
  onDelete: (line: string, section: string, firstLine: string) => void;
  menuId: string;
  isOpen: boolean;
  onToggle: (id: string | null) => void;
}) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isSkippable = isNonEditableEntry(line);

  if (isSkippable) return <>{children}</>;

  const target = getFirstLine(line);

  const handleMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    setMenuPos({ x: rect ? rect.right + 4 : e.clientX, y: rect ? rect.bottom + 4 : e.clientY });
    onToggle(isOpen ? null : menuId);
  };

  const menuContent = (
    <>
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
        onClick={() => { onToggle(null); onEdit(line, section, target); }}
      >
        <span className="w-5 text-center">✎</span> 编辑
      </button>
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
        onClick={() => { onToggle(null); onDelete(line, section, target); }}
      >
        <span className="w-5 text-center">✕</span> 删除
      </button>
    </>
  );

  return (
    <div className="relative">
      <div className="min-w-0">{children}</div>
      {!isOpen && (
        <button
          ref={btnRef}
          onClick={handleMore}
          aria-label="更多操作"
          className="absolute right-0 bottom-[-0.5rem] w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ⋯
        </button>
      )}
      {isOpen && menuPos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => onToggle(null)} />
          <div className="entry-action-sheet sm:hidden fixed left-0 right-0 z-[100] animate-modal-in">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-t-2xl border-t border-gray-100/70 dark:border-gray-700/70 py-1 w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              {menuContent}
            </div>
          </div>
          <div
            className="hidden sm:block fixed z-[100] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden animate-modal-in"
            style={{ left: Math.min(menuPos.x, window.innerWidth - 140), top: Math.min(menuPos.y, window.innerHeight - 100) }}
          >
            {menuContent}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function ImageEntryRow({ children, line, section, onDelete }: {
  children: React.ReactNode;
  line: string;
  section: string;
  onDelete: (line: string, section: string) => void;
}) {
  return (
    <div className="relative">
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(line, section); }}
        aria-label="删除图片"
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-xs bg-white/80 dark:bg-gray-800/80 rounded-full text-gray-500 shadow-sm hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

// 简单清理内容——与 Markdown 渲染链一致
function renderMarkdown(line: string, section?: string): React.ReactNode {
  const colors: Record<string, { time: string; tag: string }> = {
    notes:      { time: 'text-rose-600 dark:text-rose-400',      tag: 'text-rose-400 dark:text-rose-400/70' },
    happiness:  { time: 'text-amber-600 dark:text-amber-400',    tag: 'text-amber-400 dark:text-amber-400/70' },
    anxiety:    { time: 'text-orange-600 dark:text-orange-400',   tag: 'text-orange-400 dark:text-orange-400/70' },
    reflection: { time: 'text-emerald-600 dark:text-emerald-400', tag: 'text-emerald-400 dark:text-emerald-400/70' },
    tomorrow:   { time: 'text-sky-600 dark:text-sky-400',         tag: 'text-sky-400 dark:text-sky-400/70' },
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
    textContent = renderInlineMarkdown(textContent);

    const bc = colors[section || ''] || colors.happiness;
    const isAnxiety = section === 'anxiety';

    return (
      <div className={`text-sm ${isAnxiety ? 'text-orange-700 dark:text-orange-300 italic' : 'text-gray-700 dark:text-gray-200'}`}>
        <div className="flex items-start gap-2">
          {time && (
            <span className={`${bc.time} font-medium shrink-0`}>{time}</span>
          )}
          <div className="flex-1 min-w-0 break-words">
            <div className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: textContent }} />
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

  // 处理列表项 `- **HH:MM** 内容 #标签`
  if (line.startsWith('- ')) {
    const content = line.slice(2);
    const timeMatch = content.match(/\*\*(\d{2}:\d{2})\*\*/);
    const time = timeMatch ? timeMatch[1] : null;
    let textContent = timeMatch ? content.replace(/\*\*\d{2}:\d{2}\*\*/, '').trim() : content;

    const tags = textContent.match(/#\S+/g) || [];
    textContent = textContent.replace(/#\S+/g, '').trim();
    textContent = renderInlineMarkdown(textContent);

    const isAnxiety = section === 'anxiety';

    return (
      <div className={`text-sm ${isAnxiety ? 'text-gray-800 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-2">
          {time && (
            <span className={`font-medium ${sc.time}`}>{time}</span>
          )}
          <div className={`${time ? '' : 'col-span-2'} min-w-0 break-words`}>
            <div className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: textContent }} />
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

  // 处理复选框 `[x]` 或 `[ ]`
  if (line.includes('[x]') || line.includes('[ ]')) {
    const checked = line.includes('[x]');
    const emojiMatch = line.match(/([🥛🧘📖🇬🇧💊])/);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const rest = line.replace(/\[(x| )\]/, '').replace(emoji, '').trim();

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-4 h-4 rounded flex items-center justify-center ${checked ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
          {checked ? <CheckmarkIcon /> : ''}
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
        <span className="text-gray-700 dark:text-gray-200">{text}</span>
      </div>
    );
  }

  // 普通文本
  const plainText = renderInlineMarkdown(line);
  if (line.includes('**')) {
    return <span className="text-sm text-gray-700 dark:text-gray-200 break-words whitespace-pre-line" dangerouslySetInnerHTML={{ __html: plainText }} />;
  }
  return <span className="text-sm text-gray-700 dark:text-gray-200 break-words whitespace-pre-line">{line}</span>;
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
  const tagConfig = useDiaryStore(state => state.tagConfig);

  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaryExists, setDiaryExists] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [generatingLizhi, setGeneratingLizhi] = useState(false);
  const [editEntry, setEditEntry] = useState<{ line: string; section: string; target: string } | null>(null);
  const [editText, setEditText] = useState('');
  const [editTags, setEditTags] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<{ line: string; section: string; label: string; target: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editPolishing, setEditPolishing] = useState(false);
  const [editPolishResult, setEditPolishResult] = useState('');
  const [editTagPickerOpen, setEditTagPickerOpen] = useState(false);
  const [editTagDomain, setEditTagDomain] = useState<string | null>(null);
  const [editTagTopic, setEditTagTopic] = useState<string | null>(null);
  const [editTagMethod, setEditTagMethod] = useState<string | null>(null);

  const closeEdit = () => {
    setEditEntry(null);
    setEditPolishResult('');
    setEditTagPickerOpen(false);
    setEditTagDomain(null);
    setEditTagTopic(null);
    setEditTagMethod(null);
  };

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
      const today = getShanghaiCalendarDate();
      const exists = await dataService.checkDiaryExists(today);
      setDiaryExists(exists);
      
      if (!exists) {
        // 当天没有日记时，习惯数据回退到默认值
        updateHabitData({ water: 0, steps: 0, reading: false, language: false, supplements: false });
        setLoading(false);
        return;
      }
      
      const remoteMode = useDiaryStore.getState().remoteMode;
      
      const entry = await dataService.getDiary(today);
      setDiary(entry);
      setCurrentDiary(entry);
      if (entry.sections.habits) parseHabitData(entry.sections.habits);
      
      // 加载图片
      if (entry.sections.images && entry.sections.images.length > 0) {
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
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
      const today = getShanghaiDateString();
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
      await dataService.createDiary(getShanghaiCalendarDate());
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
          await getDataService().replaceTomorrowSection(getShanghaiCalendarDate(), actionContent);
        }
      }
      const lizhiSaysContent = actionMatch
        ? result.replace(actionMatch[0], '').replace(/\n{3,}/g, '\n\n').trim()
        : result;

      await getDataService().replaceLizhiSays(getShanghaiCalendarDate(), lizhiSaysContent);
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

  const hasAnxietyContent = anxiety.some(l =>
    !(l.startsWith('> ') && l.slice(2).trim() === '') &&
    !['- 今天什么时候我感到焦虑/紧张？', '- 当时我在担心什么？（具体到一句话)', '- 我做了什么？', '- 这个应对是帮我面对了，还是帮我躲开了？'].includes(l.trim())
  );

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
            {groupDiaryLines(quickNotes).map((line, i) => (
              <EntryRow key={i} line={line} section="notes" menuId={`notes-${i}`} isOpen={openMenuId === `notes-${i}`} onToggle={setOpenMenuId}
                onEdit={(l,s,firstLine) => { setEditEntry({ line: l, section: s, target: firstLine }); setEditText(extractEditableContent(l)); setEditTags(extractTags(l)); }}
                onDelete={(l,s,firstLine) => setDeleteEntry({ line: l, section: s, label: '随手记', target: firstLine })}
              >
                {renderMarkdown(line, 'notes')}
              </EntryRow>
            ))}
          </div>
        </div>
      )}

      {/* 小确幸 */}
      {happiness.length > 0 && (
        <div className="py-3 border-l-2 border-amber-200 dark:border-amber-700 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">✨ 每日小确幸</h3>
          <div className="space-y-1">
            {groupDiaryLines(happiness).map((line, i) => (
              <EntryRow key={i} line={line} section="happiness" menuId={`happiness-${i}`} isOpen={openMenuId === `happiness-${i}`} onToggle={setOpenMenuId}
              onEdit={(l,s,firstLine) => { setEditEntry({ line: l, section: s, target: firstLine }); setEditText(extractEditableContent(l)); setEditTags(extractTags(l)); }}
              onDelete={(l,s,firstLine) => setDeleteEntry({ line: l, section: s, label: '小确幸', target: firstLine })}
              >
                {renderMarkdown(line, 'happiness')}
              </EntryRow>
            ))}
          </div>
        </div>
      )}

      {/* 焦虑时刻 */}
      {hasAnxietyContent && (
        <div className="py-3 border-l-2 border-orange-200 dark:border-orange-700 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">😰 焦虑时刻</h3>
          <div className="space-y-1">
            {groupDiaryLines(anxiety).map((line, i) => (
              <EntryRow key={i} line={line} section="anxiety" menuId={`anxiety-${i}`} isOpen={openMenuId === `anxiety-${i}`} onToggle={setOpenMenuId}
              onEdit={(l,s,firstLine) => { setEditEntry({ line: l, section: s, target: firstLine }); setEditText(extractEditableContent(l)); setEditTags(extractTags(l)); }}
              onDelete={(l,s,firstLine) => setDeleteEntry({ line: l, section: s, label: '焦虑记录', target: firstLine })}
              >
                {renderMarkdown(line, 'anxiety')}
              </EntryRow>
            ))}
          </div>
        </div>
      )}

      {/* 觉察 */}
      {reflection.length > 0 && (
        <div className="py-3 border-l-2 border-emerald-300 dark:border-emerald-600 pl-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">💡 觉察与迭代</h3>
          <div className="space-y-1">
            {groupDiaryLines(reflection).map((line, i) => (
              <EntryRow key={i} line={line} section="reflection" menuId={`reflection-${i}`} isOpen={openMenuId === `reflection-${i}`} onToggle={setOpenMenuId}
              onEdit={(l,s,firstLine) => { setEditEntry({ line: l, section: s, target: firstLine }); setEditText(extractEditableContent(l)); setEditTags(extractTags(l)); }}
              onDelete={(l,s,firstLine) => setDeleteEntry({ line: l, section: s, label: '觉察', target: firstLine })}
              >
                {renderMarkdown(line, 'reflection')}
              </EntryRow>
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
            {groupDiaryLines(lizhiSays).map((line, i) => (
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
            {groupDiaryLines(tomorrow).map((line, i) => (
              <EntryRow key={i} line={line} section="tomorrow" menuId={`tomorrow-${i}`} isOpen={openMenuId === `tomorrow-${i}`} onToggle={setOpenMenuId}
              onEdit={(l,s,firstLine) => { setEditEntry({ line: l, section: s, target: firstLine }); setEditText(extractEditableContent(l)); setEditTags(extractTags(l)); }}
              onDelete={(l,s,firstLine) => setDeleteEntry({ line: l, section: s, label: '明日寄语', target: firstLine })}
              >
                {renderMarkdown(line, 'tomorrow')}
              </EntryRow>
            ))}
          </div>
        </div>
      )}

      {/* 影像记录 */}
      <div className="py-3 border-l-2 border-violet-300 dark:border-violet-700 pl-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
          <span>📸 影像记录 ({images.length}张)</span>
        </h3>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((line, i) => (
              <ImageEntryRow key={i} line={line} section="images"
                onDelete={(l,s) => setDeleteEntry({ line: l, section: s, label: '图片', target: l })}
              >
                {imageUrls[i] && (
                  <button
                    onClick={() => { setCurrentImageIndex(i); setShowImageModal(true); }}
                    className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-gray-100 dark:bg-gray-700"
                  >
                    <img src={imageUrls[i]} alt={`Image ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
                  </button>
                )}
              </ImageEntryRow>
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
    {editEntry && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-overlay-in" onClick={closeEdit}>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md shadow-xl animate-modal-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">编辑</h3>

          {/* Polish result preview */}
          {editPolishResult && (
            <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">✨ 润色结果：</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                {parseTagsFromPolished(editPolishResult, tagConfig).content}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    const { content, tags } = parseTagsFromPolished(editPolishResult, tagConfig);
                    setEditText(content || editText);
                    if (tags.length > 0) setEditTags(tags.map(t => `#${t}`).join(' '));
                    setEditPolishResult('');
                  }}
                  className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg"
                >采用润色</button>
                <button
                  onClick={() => setEditPolishResult('')}
                  className="text-xs px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg"
                >继续编辑</button>
              </div>
            </div>
          )}

          {/* Content */}
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">正文</label>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={5}
            className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="输入修改后的正文..."
          />

          {/* Tags */}
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 mt-2">标签</label>
          <input
            type="text"
            value={editTags}
            onChange={e => setEditTags(e.target.value)}
            placeholder="#标签1 #标签2（可选）"
            className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />

          {/* Action buttons row */}
          <div className="flex gap-2 mt-2">
            {isAIConfigured() && (
              <button
                onClick={async () => {
                  if (!editText.trim()) return;
                  setEditPolishing(true);
                  try {
                    const config = getAIConfig();
                    const result = await polishContent(editText.trim(), config);
                    setEditPolishResult(result);
                    const { tags } = parseTagsFromPolished(result, tagConfig);
                    if (tags.length > 0) setEditTags(tags.map(t => `#${t}`).join(' '));
                  } catch (err) { alert('润色失败: ' + (err as Error).message); }
                  finally { setEditPolishing(false); }
                }}
                disabled={editPolishing || !editText.trim()}
                className="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-50"
              >
                {editPolishing ? '润色中...' : '✨ 润色'}
              </button>
            )}
            <button
              onClick={() => setEditTagPickerOpen(!editTagPickerOpen)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              🏷️ 标签
            </button>
          </div>

          {/* Tag picker */}
          {editTagPickerOpen && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">领域</div>
                <div className="flex flex-wrap gap-1">
                  {tagConfig.domains.filter(d => d.topics.length > 0).map(d => (
                    <button key={d.id}
                      onClick={() => { setEditTagDomain(d.name); setEditTagTopic(null); }}
                      className={`px-2 py-0.5 rounded-full text-xs ${editTagDomain === d.name ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'}`}
                    >#{d.name}</button>
                  ))}
                </div>
              </div>
              {editTagDomain && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">主题</div>
                  <div className="flex flex-wrap gap-1">
                    {(tagConfig.domains.find(d => d.name === editTagDomain)?.topics || []).map(t => (
                      <button key={t.id}
                        onClick={() => { setEditTagTopic(t.name); setEditTags(prev => { const base = prev.replace(/(\s*#\S+)+$/, ''); return `${base} #${editTagDomain} #${t.name}`.trim(); }); }}
                        className={`px-2 py-0.5 rounded-full text-xs ${editTagTopic === t.name ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'}`}
                      >#{t.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">方法</div>
                <div className="flex flex-wrap gap-1">
                  {tagConfig.methods.map(m => (
                    <button key={m.id}
                      onClick={() => { setEditTagMethod(m.name); setEditTags(prev => `${prev} #${m.name}`.replace(/(#\S+)\s+\1/, '$1').trim()); }}
                      className={`px-2 py-0.5 rounded-full text-xs ${editTagMethod === m.name ? 'bg-gray-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'}`}
                    >#{m.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-2 mt-3">
            <button onClick={closeEdit} className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg min-h-[44px]">取消</button>
            <button onClick={async () => {
              if (!editEntry || !editText.trim()) return;
              try {
                const ds = getDataService();
                const newLine = rebuildLine(editEntry.line, editText.trim(), editTags);
                await ds.editEntry(getSectionForLine(editEntry.section), editEntry.target, newLine);
                closeEdit();
                useDiaryStore.getState().triggerRefresh();
              } catch (err) { alert('编辑失败: ' + (err as Error).message); }
            }} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium min-h-[44px]">保存</button>
          </div>
        </div>
      </div>
    )}
    {deleteEntry && (
      <ConfirmDialog
        title={`确定要删除这条${deleteEntry.label}吗？`}
        message="此操作不可恢复。"
        destructive
        confirmLabel="删除"
        onConfirm={async () => {
          try {
            const ds = getDataService();
            await ds.deleteEntry(getSectionForLine(deleteEntry.section), deleteEntry.target);
            setDeleteEntry(null);
            useDiaryStore.getState().triggerRefresh();
          } catch (err) { alert('删除失败: ' + (err as Error).message); }
        }}
        onCancel={() => setDeleteEntry(null)}
      />
    )}
    </>
  );
});

DiaryView.displayName = 'DiaryView';

export default DiaryView;
