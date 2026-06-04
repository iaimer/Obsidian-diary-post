import { useDiaryStore } from '../../stores/diaryStore';
import { DarkIcon, LightIcon } from '../Icons';

export function SettingsAppearance() {
  const themePreference = useDiaryStore(state => state.themePreference);
  const setThemePreference = useDiaryStore(state => state.setThemePreference);
  const darkMode = useDiaryStore(state => state.darkMode);

  const options: { value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: '浅色', icon: <LightIcon /> },
    { value: 'dark', label: '深色', icon: <DarkIcon /> },
    { value: 'system', label: '跟随系统', icon: <span className="text-sm font-bold">{darkMode ? '🌙' : '☀️'} A</span> }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">选择你偏好的外观模式，修改立即生效。</p>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => setThemePreference(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors min-h-[44px] ${
                  themePreference === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
