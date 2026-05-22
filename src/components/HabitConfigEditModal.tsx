import { useState, useEffect } from 'react';
import { HabitConfig } from '../types';

interface HabitConfigEditModalProps {
  config: HabitConfig | null;  // null for new habit
  onSave: (config: HabitConfig) => void;
  onClose: () => void;
}

// Emoji 分组
const EMOJI_GROUPS = [
  { name: '常用', emojis: ['✅', '📝', '🎯', '⭐', '🔥', '💪', '💡', '❤️'] },
  { name: '生活', emojis: ['💧', '🥛', '☕', '🧘', '🏃', '🚶', '💤', '☀️', '🌙', '🧹', '💊', '🧴'] },
  { name: '食物', emojis: ['🍎', '🥗', '🥑', '🥦', '🥕', '🍋', '🍌', '🍇', '🥩', '🍗'] },
  { name: '学习', emojis: ['📖', '📚', '🇬🇧', '🇯🇵', '🇺🇸', '🇨🇳', '✏️', '🖊️', '🎓', '🧠'] },
  { name: '活动', emojis: ['🎵', '🎸', '🎮', '🖥️', '📱', '🎬', '🎨', '📷', '🎤', '🎹'] },
  { name: '表情', emojis: ['😊', '😄', '🥰', '😍', '🤗', '🙌', '👏', '🎉', '🏆', '💯'] },
];

// 颜色选项（扩展到10种）
const COLOR_OPTIONS = [
  { value: 'blue', label: '蓝色', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'sky', label: '天蓝', bg: 'bg-sky-100 dark:bg-sky-900/30' },
  { value: 'green', label: '绿色', bg: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'emerald', label: '翠绿', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { value: 'orange', label: '橙色', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { value: 'amber', label: '琥珀', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { value: 'purple', label: '紫色', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { value: 'violet', label: '紫罗兰', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  { value: 'pink', label: '粉色', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  { value: 'rose', label: '玫瑰', bg: 'bg-rose-100 dark:bg-rose-900/30' },
];

export function HabitConfigEditModal({ config, onSave, onClose }: HabitConfigEditModalProps) {
  const [name, setName] = useState(config?.name || '');
  const [emoji, setEmoji] = useState(config?.emoji || '✅');
  const [type, setType] = useState<'number' | 'boolean'>(config?.type || 'boolean');
  const [goal, setGoal] = useState(config?.goal || 100);
  const [unit, setUnit] = useState(config?.unit || '');
  const [description, setDescription] = useState(config?.description || '');
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [color, setColor] = useState(config?.color || 'purple');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 当 config 改变时同步所有状态（修复编辑不同习惯时状态不更新的问题）
  useEffect(() => {
    if (config) {
      setName(config.name || '');
      setEmoji(config.emoji || '✅');
      setType(config.type || 'boolean');
      setGoal(config.goal || 100);
      setUnit(config.unit || '');
      setDescription(config.description || '');
      setEnabled(config.enabled ?? true);
      setColor(config.color || 'purple');
    }
  }, [config]);

  // 初始化时设置类型相关字段
  useEffect(() => {
    if (!config && type === 'number') {
      setGoal(100);
      setUnit('');
    }
  }, [type, config]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入习惯名称');
      return;
    }

    const newConfig: HabitConfig = {
      id: config?.id || `habit-${Date.now()}`,
      name: name.trim(),
      emoji,
      type,
      enabled,
      order: config?.order || 999,
      color,
      ...(type === 'number' ? { goal, unit } : {}),
      ...(description.trim() ? { description: description.trim() } : {})
    };

    onSave(newConfig);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            {config ? '编辑习惯' : '添加新习惯'}
          </h2>
          <button
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">习惯名称 *</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              placeholder="如：饮水、运动..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Emoji 图标</label>
            <div className="flex items-center gap-2">
              <button
                className="w-10 h-10 text-2xl border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {emoji}
              </button>
              <input
                type="text"
                className="w-20 h-10 px-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                value={emoji}
                onChange={e => setEmoji(e.target.value.slice(-2) || '✅')}
                maxLength={2}
                placeholder="直接输入"
              />
            </div>
            {showEmojiPicker && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 p-2">
                {EMOJI_GROUPS.map(group => (
                  <div key={group.name} className="mb-2">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{group.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {group.emojis.map(e => (
                        <button
                          key={e}
                          className={`w-7 h-7 text-base hover:bg-gray-200 dark:hover:bg-gray-600 rounded ${
                            emoji === e ? 'bg-indigo-100 dark:bg-indigo-900/50' : ''
                          }`}
                          onClick={() => {
                            setEmoji(e);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 颜色 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">背景颜色</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  className={`w-8 h-8 rounded-lg ${c.bg} border-2 ${
                    color === c.value
                      ? 'border-indigo-600 dark:border-indigo-400'
                      : 'border-transparent'
                  }`}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* 类型 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">展现方式</label>
            <div className="flex gap-2">
              <button
                className={`px-3 py-2 rounded-lg text-sm ${
                  type === 'boolean'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setType('boolean')}
              >
                勾选型（完成/未完成）
              </button>
              <button
                className={`px-3 py-2 rounded-lg text-sm ${
                  type === 'number'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                onClick={() => setType('number')}
              >
                数值型（有目标值）
              </button>
            </div>
          </div>

          {/* 数值型配置 */}
          {type === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">目标值</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  value={goal}
                  onChange={e => setGoal(parseInt(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">单位</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  placeholder="mL、步、分钟..."
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 描述 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">描述文字（可选）</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              placeholder="如：阅读/亲子共读、鱼油/植物甾醇..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* 启用 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">启用该习惯</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            onClick={handleSave}
          >
            保存
          </button>
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}