import { useState, useCallback, useEffect, useRef } from 'react';
import { SettingsSection } from '../types';
import { SettingsOverview } from './settings/SettingsOverview';
import { SettingsSidebar } from './settings/SettingsSidebar';
import { SettingsAppearance } from './settings/SettingsAppearance';
import { SettingsHabits } from './settings/SettingsHabits';
import { SettingsRemote } from './settings/SettingsRemote';
import { SettingsAI } from './settings/SettingsAI';
import { SettingsPrompts } from './settings/SettingsPrompts';
import { SettingsImages } from './settings/SettingsImages';
import { SettingsTags } from './settings/SettingsTags';
import { SettingsAbout } from './settings/SettingsAbout';
import { SettingsIcon, ArrowLeftIcon } from './Icons';

interface Props {
  onDetailNav?: (inDetail: boolean) => void;
  registerBackHandler?: (handler: (() => boolean) | null) => void;
}

const SECTION_TITLES: Record<SettingsSection, string> = {
  overview: '设置',
  appearance: '外观',
  habits: '习惯管理',
  tags: '标签管理',
  remote: '远程 API',
  ai: 'AI 服务配置',
  prompts: '润色提示词',
  images: '图片压缩',
  about: '关于'
};

export function SettingsPage({ onDetailNav, registerBackHandler }: Props) {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('overview');
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const dirtyRef = useRef<Record<string, boolean>>({});

  const setDirty = useCallback((section: string, dirty: boolean) => {
    dirtyRef.current[section] = dirty;
  }, []);

  const checkDirty = useCallback((fromSection: SettingsSection): boolean => {
    if (['tags', 'remote', 'ai', 'prompts', 'images'].includes(fromSection) && dirtyRef.current[fromSection]) {
      return confirm(`有未保存的修改，确定要离开吗？`);
    }
    return true;
  }, []);

  const navigate = useCallback((section: SettingsSection) => {
    if (currentSection !== 'overview' && !checkDirty(currentSection)) return;
    setCurrentSection(section);
  }, [currentSection, checkDirty]);

  const goBack = useCallback((): boolean => {
    if (currentSection === 'overview') return false;
    if (!checkDirty(currentSection)) return true;
    setCurrentSection('overview');
    return true;
  }, [currentSection, checkDirty]);

  const isInDetail = currentSection !== 'overview';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateLayout = () => setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    onDetailNav?.(isInDetail && !isDesktop);
  }, [isDesktop, isInDetail, onDetailNav]);

  useEffect(() => {
    registerBackHandler?.(goBack);
    return () => registerBackHandler?.(null);
  }, [goBack, registerBackHandler]);

  const renderDetail = () => {
    switch (currentSection) {
      case 'appearance': return <SettingsAppearance />;
      case 'habits': return <SettingsHabits />;
      case 'tags': return <SettingsTags onDirtyChange={v => setDirty('tags', v)} />;
      case 'remote': return <SettingsRemote onDirtyChange={v => setDirty('remote', v)} />;
      case 'ai': return <SettingsAI onDirtyChange={v => setDirty('ai', v)} />;
      case 'prompts': return <SettingsPrompts onDirtyChange={v => setDirty('prompts', v)} />;
      case 'images': return <SettingsImages onDirtyChange={v => setDirty('images', v)} />;
      case 'about': return <SettingsAbout />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <header className="safe-top flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 pb-3 z-10 border-b border-gray-100/50 dark:border-gray-700/50">
        <div className="flex items-center min-h-[32px]">
          {isInDetail ? (
            <>
              <button
                onClick={goBack}
                className="p-1 -ml-1 mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <span className="flex items-center gap-1">
                  <ArrowLeftIcon />
                  <span className="text-sm text-gray-400 dark:text-gray-500 lg:hidden">返回</span>
                </span>
              </button>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {SECTION_TITLES[currentSection]}
              </h1>
            </>
          ) : (
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2">
              <SettingsIcon /> 设置
            </h1>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="hidden lg:block w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 py-4">
          <SettingsSidebar currentSection={currentSection} onNavigate={navigate} />
        </aside>

        <main className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[80px] lg:pb-4 max-w-xl mx-auto lg:mx-0">
          {isInDetail ? renderDetail() : <SettingsOverview onNavigate={navigate} />}
        </main>
      </div>
    </div>
  );
}
