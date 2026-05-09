import React, { useEffect, useState } from 'react';
import { DiaryEntry } from '../types';
import { useDiaryStore } from '../stores/diaryStore';
import { getFileSyncService } from '../services/fileSync';
import { getCachedDiary } from '../db';

// 简单的Markdown渲染（阅读模式）
function renderMarkdown(line: string): React.ReactNode {
  // 移除HTML注释
  if (line.includes('<!--')) return null;

  // 处理引用块 `> 内容`
  if (line.startsWith('> ') && !line.startsWith('> [!')) {
    let content = line.slice(2);
    // 处理粗体
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return (
      <span className="text-gray-600 italic pl-2 border-l-2 border-green-200" dangerouslySetInnerHTML={{ __html: content }} />
    );
  }

  // 处理列表项 `- **HH:MM** 内容 #标签`
  if (line.startsWith('- ')) {
    const content = line.slice(2);

    // 提取时间戳 **HH:MM**
    const timeMatch = content.match(/\*\*(\d{2}:\d{2})\*\*/);
    const time = timeMatch ? timeMatch[1] : null;
    let textContent = timeMatch ? content.replace(/\*\*\d{2}:\d{2}\*\*/, '').trim() : content;

    // 提取标签 #xxx
    const tags = textContent.match(/#\S+/g) || [];
    textContent = textContent.replace(/#\S+/g, '').trim();

    // 处理剩余的粗体标记
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
    // 提取emoji和内容
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
    // 提取emoji
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

  // 普通文本 - 处理粗体标记
  let plainText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  if (plainText !== line) {
    return <span className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: plainText }} />;
  }
  return <span className="text-sm text-gray-700">{line}</span>;
}

export default function DiaryView() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const refreshKey = useDiaryStore(state => state.refreshKey);
  const setCurrentDiary = useDiaryStore(state => state.setCurrentDiary);
  const updateHabitData = useDiaryStore(state => state.updateHabitData);

  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const fileSync = getFileSyncService();
      const entry = await fileSync.getOrCreateDiary(new Date());
      setDiary(entry);
      setCurrentDiary(entry);
      if (entry.sections.habits) parseHabitData(entry.sections.habits);
    } catch (err) {
      setError((err as Error).message);
      const today = new Date().toISOString().split('T')[0];
      const cached = await getCachedDiary(today);
      if (cached) setDiary(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vaultConnected) loadDiary();
  }, [vaultConnected, refreshKey]); // 监听refreshKey变化

  if (loading && !diary) {
    return (
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="text-center py-6 text-gray-400 text-sm">加载中...</div>
      </section>
    );
  }

  if (!vaultConnected) {
    return (
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3">今日记录</h2>
        <div className="text-center py-6 text-gray-400 text-sm">请先连接Obsidian Vault</div>
      </section>
    );
  }

  // 过滤有效内容（排除空行、HTML注释、分隔线、模板示例）
  const quickNotes = diary?.sections.quick_notes.filter(l =>
    l.trim() && !l.includes('<!--') && l.trim() !== '---' && !l.includes('- **HH:MM** 内容 #标签')
  ) || [];
  const happiness = diary?.sections.happiness.filter(l => l.trim() && l.startsWith('> ') && !l.includes('[!')) || [];
  const reflection = diary?.sections.reflection.filter(l => l.trim() && l !== '- ' && !l.includes('<!--')) || [];
  const lizhiSays = diary?.sections.lizhi_says.filter(l => l.trim() && l !== '- ' && !l.includes('<!--')) || [];

  return (
    <section className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
      {/* 刷新按钮 */}
      <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
        <h2 className="text-sm font-medium text-gray-500">今日日记</h2>
        <button
          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
          onClick={loadDiary}
          disabled={loading}
        >
          {loading ? '同步中...' : '🔄 同步'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs">加载失败: {error}</div>
      )}

      {/* 随手记 */}
      {quickNotes.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-xs font-medium text-gray-400 mb-3">✍️ 随手记</h3>
          <div className="space-y-2">
            {quickNotes.map((line, i) => (
              <div key={i}>{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 小确幸 */}
      {happiness.length > 0 && (
        <div className="p-4 border-b bg-green-50">
          <h3 className="text-xs font-medium text-gray-400 mb-3">✨ 每日小确幸</h3>
          <div className="space-y-2">
            {happiness.map((line, i) => (
              <div key={i}>{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 觉察 */}
      {reflection.length > 0 && (
        <div className="p-4 border-b bg-yellow-50">
          <h3 className="text-xs font-medium text-gray-400 mb-3">💡 觉察与迭代</h3>
          <div className="space-y-2">
            {reflection.map((line, i) => (
              <div key={i}>{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 荔枝喵说 */}
      {lizhiSays.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h3 className="text-xs font-medium text-gray-400 mb-3">🧠 荔枝喵说</h3>
          <div className="space-y-2">
            {lizhiSays.map((line, i) => (
              <div key={i} className="text-sm text-gray-700 italic">{renderMarkdown(line)}</div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {quickNotes.length === 0 && happiness.length === 0 && reflection.length === 0 && (
        <div className="p-4">
          <div className="text-center py-6 text-gray-400 text-sm">
            {error ? '加载失败，点击同步重试' : '暂无记录'}
          </div>
        </div>
      )}
    </section>
  );
}