import { SettingsSection } from '../../types';
import { useSettingGroups } from './useSettingGroups';
import { ChevronRightIcon } from '../Icons';

interface Props {
  onNavigate: (section: SettingsSection) => void;
}

export function SettingsOverview({ onNavigate }: Props) {
  const groups = useSettingGroups();

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <section key={group.title}>
          <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1">
            {group.title}
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {group.items.map((item, idx) => (
              <button
                key={item.section}
                onClick={() => onNavigate(item.section)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors min-h-[44px]"
                style={{ borderTop: idx > 0 ? '0.5px solid #E5E0D8' : undefined }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-indigo-600 dark:text-indigo-400 text-lg w-6 text-center">
                    {item.icon}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {item.summary()}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">
                    <ChevronRightIcon />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
