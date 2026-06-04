import { useState, useEffect } from 'react';
import { useDiaryStore } from '../../stores/diaryStore';

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
}

export function SettingsImages({ onDirtyChange }: Props) {
  const imageConfig = useDiaryStore(state => state.imageConfig);
  const setImageConfig = useDiaryStore(state => state.setImageConfig);

  const [draft, setDraft] = useState(imageConfig);
  const [saving, setSaving] = useState(false);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(imageConfig);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      setImageConfig(draft);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = { maxLongSide: 2000, maxSizeMB: 2, quality: 0.7, nameFormat: 'Image-{date}-{seq}' };
    setDraft(defaults);
  };

  const preview = draft.nameFormat
    .replace('{date}', '20260515')
    .replace('{seq}', '001') + '.jpg';
  const inputClass = 'w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <FormRow label="最大长边 (px)">
          <input
            type="number" min={800} max={4000} step={100}
            value={draft.maxLongSide}
            onChange={e => setDraft({ ...draft, maxLongSide: parseInt(e.target.value) || 2000 })}
            className={inputClass}
          />
        </FormRow>
        <FormRow label="最大文件大小 (MB)" divider>
          <input
            type="number" min={0.5} max={5} step={0.5}
            value={draft.maxSizeMB}
            onChange={e => setDraft({ ...draft, maxSizeMB: parseFloat(e.target.value) || 2 })}
            className={inputClass}
          />
        </FormRow>
        <FormRow label="JPEG 质量 (0.3-1.0)" divider>
          <input
            type="number" min={0.3} max={1.0} step={0.05}
            value={draft.quality}
            onChange={e => setDraft({ ...draft, quality: parseFloat(e.target.value) || 0.7 })}
            className={inputClass}
          />
        </FormRow>
        <FormRow label="文件名格式" divider>
          <input
            type="text"
            value={draft.nameFormat}
            onChange={e => setDraft({ ...draft, nameFormat: e.target.value })}
            className={`${inputClass} font-mono`}
            placeholder="Image-{date}-{seq}"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            占位符: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{date}'}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{seq}'}</code>
          </p>
        </FormRow>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            预览: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{preview}</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}

function FormRow({ label, children, divider }: { label: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <>
      <div className="px-4 py-3">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
        {children}
      </div>
      {divider && <div className="border-t border-gray-100 dark:border-gray-700" style={{ borderTopWidth: '0.5px' }} />}
    </>
  );
}
