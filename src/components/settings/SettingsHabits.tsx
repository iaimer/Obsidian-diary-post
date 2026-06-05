import { useState } from 'react';
import { useDiaryStore } from '../../stores/diaryStore';
import { HabitConfig } from '../../types';
import { HabitConfigEditModal } from '../HabitConfigEditModal';
import { SettingsToggle } from './SettingsToggle';
import { ConfirmDialog } from '../ConfirmDialog';

export function SettingsHabits() {
  const habitConfigs = useDiaryStore(state => state.habitConfigs);
  const addHabitConfig = useDiaryStore(state => state.addHabitConfig);
  const updateHabitConfig = useDiaryStore(state => state.updateHabitConfig);
  const removeHabitConfig = useDiaryStore(state => state.removeHabitConfig);
  const resetHabitConfigs = useDiaryStore(state => state.resetHabitConfigs);

  const [editingHabit, setEditingHabit] = useState<HabitConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; confirmLabel?: string; destructive?: boolean; cb: () => void } | null>(null);

  const sorted = [...habitConfigs].sort((a, b) => a.order - b.order);

  const handleToggle = (id: string, enabled: boolean) => {
    updateHabitConfig(id, { enabled });
  };

  const handleSave = (config: HabitConfig) => {
    if (editingHabit) {
      updateHabitConfig(config.id, config);
    } else {
      const maxOrder = habitConfigs.reduce((max, c) => Math.max(max, c.order), 0);
      addHabitConfig({ ...config, order: maxOrder + 1 });
    }
    setShowModal(false);
    setEditingHabit(null);
  };

  const handleDelete = (id: string) => {
    setConfirmDlg({
      title: '确定要删除这个习惯吗？',
      destructive: true,
      confirmLabel: '删除',
      cb: () => removeHabitConfig(id)
    });
  };

  const handleReset = () => {
    setConfirmDlg({
      title: '确定要恢复默认习惯配置吗？',
      destructive: true,
      confirmLabel: '恢复默认',
      cb: () => resetHabitConfigs()
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">暂无习惯，点击下方添加</div>
        ) : (
          sorted.map((config, idx) => (
            <div
              key={config.id}
              className="flex items-center justify-between px-4 py-3 min-h-[44px]"
              style={{ borderTop: idx > 0 ? '0.5px solid #E5E0D8' : undefined }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg">{config.emoji}</span>
                <div className="min-w-0">
                  <div className="text-sm text-gray-700 dark:text-gray-200 truncate">{config.name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {config.type === 'number' ? `数值型 · ${config.goal}${config.unit || ''}` : '勾选型'}
                    {!config.enabled && ' · 已禁用'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <SettingsToggle
                  checked={config.enabled}
                  onChange={checked => handleToggle(config.id, checked)}
                  label={`${config.enabled ? '禁用' : '启用'}${config.name}`}
                />
                <IconButton
                  onClick={() => { setEditingHabit(config); setShowModal(true); }}
                  title="编辑"
                >
                  <EditSvg />
                </IconButton>
                <IconButton
                  onClick={() => handleDelete(config.id)}
                  title="删除"
                  className="hover:text-red-600 dark:hover:text-red-400"
                >
                  <DeleteSvg />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setEditingHabit(null); setShowModal(true); }}
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 min-h-[44px]"
        >
          + 添加新习惯
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
        >
          恢复默认
        </button>
      </div>

      {showModal && (
        <HabitConfigEditModal
          config={editingHabit}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}
      {confirmDlg && (
        <ConfirmDialog
          title={confirmDlg.title}
          confirmLabel={confirmDlg.confirmLabel}
          destructive={confirmDlg.destructive}
          onConfirm={() => { confirmDlg.cb(); setConfirmDlg(null); }}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </div>
  );
}

function IconButton({ onClick, title, children, className = '' }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
    >
      {children}
    </button>
  );
}

function EditSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.4745 5.40801L18.5917 7.52524M17.8358 3.54289L12.1086 9.27005C11.8131 9.56562 11.6116 9.94206 11.5296 10.3519L11 13L13.6481 12.4704C14.0579 12.3884 14.4344 12.1869 14.7299 11.8914L20.4571 6.16423C21.181 5.44037 21.181 4.26676 20.4571 3.5429C19.7332 2.81904 18.5596 2.81903 17.8358 3.54289Z" />
      <path d="M19 15V18C19 19.1046 18.1046 20 17 20H6C4.89543 20 4 19.1046 4 18V7C4 5.89543 4.89543 5 6 5H9" />
    </svg>
  );
}

function DeleteSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" />
      <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" />
      <path d="M2 6H22" />
      <path d="M10 11V16" />
      <path d="M14 11V16" />
    </svg>
  );
}
