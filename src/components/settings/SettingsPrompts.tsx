import { useEffect, useState } from 'react';
import {
  AI_CONFIG_KEY,
  AIConfig,
  DEFAULT_COACH_PROMPT,
  DEFAULT_POLISH_PROMPT,
  loadAIConfig
} from './SettingsAI';

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
}

export function SettingsPrompts({ onDirtyChange }: Props) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig);
  const [saved, setSaved] = useState<AIConfig>(loadAIConfig);
  const [promptTab, setPromptTab] = useState<'polish' | 'coach'>('polish');
  const [saving, setSaving] = useState(false);

  const hasChanges = config.polishPrompt !== saved.polishPrompt
    || config.coachPrompt !== saved.coachPrompt;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
      setSaved({ ...config });
    } finally {
      setSaving(false);
    }
  };

  const isPolish = promptTab === 'polish';

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <PromptTab active={isPolish} onClick={() => setPromptTab('polish')}>润色规则</PromptTab>
          <PromptTab active={!isPolish} onClick={() => setPromptTab('coach')}>教练提示词</PromptTab>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            修改后点击保存生效。
          </p>
          <textarea
            value={isPolish ? config.polishPrompt : config.coachPrompt}
            onChange={event => setConfig({
              ...config,
              ...(isPolish
                ? { polishPrompt: event.target.value }
                : { coachPrompt: event.target.value })
            })}
            rows={18}
            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono resize-y focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={() => setConfig({
              ...config,
              ...(isPolish
                ? { polishPrompt: DEFAULT_POLISH_PROMPT }
                : { coachPrompt: DEFAULT_COACH_PROMPT })
            })}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mt-2"
          >
            重置为默认
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
      >
        {saving ? '保存中...' : '保存提示词'}
      </button>
    </div>
  );
}

function PromptTab({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
        active
          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
