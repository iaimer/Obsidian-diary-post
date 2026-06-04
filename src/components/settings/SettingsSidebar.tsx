import { SettingsSection } from '../../types';
import { useSettingGroups } from './useSettingGroups';

interface Props {
  currentSection: SettingsSection;
  onNavigate: (section: SettingsSection) => void;
}

export function SettingsSidebar({ currentSection, onNavigate }: Props) {
  const groups = useSettingGroups();

  return (
    <nav className="space-y-4 px-3">
      {groups.map(group => (
        <div key={group.title}>
          <h3 className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-0.5">
            {group.title}
          </h3>
          <div className="space-y-0.5">
            {group.items.map(item => (
              <button
                key={item.section}
                onClick={() => onNavigate(item.section)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-left transition-colors min-h-[36px] ${
                  currentSection === item.section
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
