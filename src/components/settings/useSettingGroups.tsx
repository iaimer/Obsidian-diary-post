import { useDiaryStore } from '../../stores/diaryStore';
import { SettingsSection } from '../../types';
import {
  PaletteIcon,
  CheckListIcon,
  CloudIcon,
  SparklesIcon,
  PromptIcon,
  ImageIcon,
  InfoIcon
} from '../Icons';

export interface SettingItemDef {
  section: SettingsSection;
  icon: React.ReactNode;
  label: string;
  summary: () => string;
}

export interface SettingGroupDef {
  title: string;
  items: SettingItemDef[];
}

export function useSettingGroups(): SettingGroupDef[] {
  const themePreference = useDiaryStore(state => state.themePreference);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const habitConfigs = useDiaryStore(state => state.habitConfigs);
  const imageConfig = useDiaryStore(state => state.imageConfig);

  const enabledHabitCount = habitConfigs.filter(c => c.enabled).length;

  const aiConfig = (() => {
    try {
      const raw = localStorage.getItem('diary-ai-config');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const themeLabels: Record<string, string> = {
    dark: '深色模式',
    light: '浅色模式',
    system: '跟随系统'
  };

  return [
    {
      title: '常用',
      items: [
        {
          section: 'appearance',
          icon: <PaletteIcon />,
          label: '外观',
          summary: () => themeLabels[themePreference] || themePreference
        },
        {
          section: 'habits',
          icon: <CheckListIcon />,
          label: '习惯管理',
          summary: () => `已启用 ${enabledHabitCount} 项`
        }
      ]
    },
    {
      title: '连接与智能',
      items: [
        {
          section: 'remote',
          icon: <CloudIcon />,
          label: '远程 API',
          summary: () => remoteMode ? '已配置' : '未启用'
        },
        {
          section: 'ai',
          icon: <SparklesIcon />,
          label: 'AI 服务配置',
          summary: () => aiConfig?.enabled ? (aiConfig.model || '已启用') : '未启用'
        },
        {
          section: 'prompts',
          icon: <PromptIcon />,
          label: '润色提示词',
          summary: () => '润色与教练'
        }
      ]
    },
    {
      title: '媒体与应用',
      items: [
        {
          section: 'images',
          icon: <ImageIcon />,
          label: '图片压缩',
          summary: () => `${imageConfig.maxLongSide}px / ${imageConfig.maxSizeMB}MB`
        },
        {
          section: 'about',
          icon: <InfoIcon />,
          label: '关于',
          summary: () => ''
        }
      ]
    }
  ];
}
