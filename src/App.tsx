import { useState, useEffect, useRef } from 'react';
import { useDiaryStore } from './stores/diaryStore';
import { getFileSyncService } from './services/fileSync';
import { resetDataService } from './services/dataService';
import QuickInputModal from './components/QuickInputModal';
import FloatingButton from './components/FloatingButton';
import { ReflectionModal } from './components/ReflectionModal';
import { HappinessModal } from './components/HappinessModal';
import RecordWizard from './components/RecordWizard';
import HabitTracker from './components/HabitTracker';
import DiaryView, { DiaryViewRef } from './components/DiaryView';
import { SettingsPage } from './components/SettingsPage';
import StatsPage from './components/StatsPage';
import { HistoryPage } from './components/HistoryPage';
import { PullToRefresh } from './components/PullToRefresh';
import { TodayIcon, HistoryIcon, StatsIcon, SettingsIcon } from './components/Icons';
import { isNativeApp } from './utils/platform';
import { FirstTimeConfig } from './components/FirstTimeConfig';
import { SyncStatusBar } from './components/SyncStatusBar';
import ImageUploadButton, { ImageUploadButtonRef } from './components/ImageUploadButton';
import { syncPending } from './services/outboxService';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { getShanghaiCalendarDate } from './utils/date';

type PageView = 'home' | 'history' | 'stats' | 'settings';

const PRODUCTION_API_URL = 'https://obsidian.femkits.org';
const DEV_API_URL = 'http://localhost:4001';

function App() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const wasConnected = useDiaryStore(state => state.wasConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const setVaultConnected = useDiaryStore(state => state.setVaultConnected);
  const setRemoteMode = useDiaryStore(state => state.setRemoteMode);
  const setApiConfig = useDiaryStore(state => state.setApiConfig);

  const [showReflection, setShowReflection] = useState(false);
  const [showHappiness, setShowHappiness] = useState(false);
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [connecting, setConnecting] = useState(false);
  const [showFirstTimeConfig, setShowFirstTimeConfig] = useState(false);
  const diaryViewRef = useRef<DiaryViewRef>(null);
  const imageUploadRef = useRef<ImageUploadButtonRef>(null);

  useEffect(() => {
    const init = () => {
      const native = isNativeApp();
      const isProduction = !window.location.hostname.match(/localhost|127\.0\.0\.1/) && !native;
      const state = useDiaryStore.getState();
      const { apiToken, apiUrl, themePreference } = state;

      const applyTheme = () => {
        const isDark = themePreference === 'dark' || (themePreference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      applyTheme();

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const pref = useDiaryStore.getState().themePreference;
        if (pref === 'system') {
          applyTheme();
        }
      };
      mediaQuery.addEventListener('change', handleChange);

      if (native) {
        const cleanUrl = apiUrl && apiUrl !== DEV_API_URL
          ? apiUrl.replace(/\/api\/v1\/?$/, '')
          : PRODUCTION_API_URL;
        setApiConfig(cleanUrl, apiToken || '');
        setRemoteMode(true);
        resetDataService();

        if (!apiToken) {
          setShowFirstTimeConfig(true);
        }
      } else if (isProduction) {
        const cleanUrl = apiUrl?.replace(/\/api\/v1\/?$/, '') || PRODUCTION_API_URL;
        setApiConfig(cleanUrl, apiToken);
        if (!state.remoteMode) {
          setRemoteMode(true);
          resetDataService();
        }
      } else {
        if (!apiToken || !apiUrl) {
          setApiConfig(DEV_API_URL, '');
        }
      }

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    };
    return init();
  }, []);

  // 自动同步触发：App 启动（远程/原生模式）
  useEffect(() => {
    if (remoteMode) {
      syncPending();
    }
  }, [remoteMode]);

  // 自动同步触发：网络恢复 / App 回到前台
  useEffect(() => {
    if (!isNativeApp()) return;

    let active = true;
    const handles: { remove: () => Promise<void> }[] = [];
    const setup = async () => {
      const addHandle = async (handlePromise: Promise<{ remove: () => Promise<void> }>) => {
        const handle = await handlePromise;
        if (active) {
          handles.push(handle);
        } else {
          await handle.remove();
        }
      };
      const handleNetwork = async () => {
        const status = await Network.getStatus();
        if (status.connected) {
          syncPending();
        }
      };
      await addHandle(Network.addListener('networkStatusChange', status => {
        if (status.connected) {
          syncPending();
        }
      }));

      await addHandle(CapApp.addListener('resume', () => {
        syncPending();
      }));

      await addHandle(CapApp.addListener('backButton', () => {
        if (showQuickInput) return setShowQuickInput(false);
        if (showReflection) return setShowReflection(false);
        if (showHappiness) return setShowHappiness(false);
        if (showWizard) return setShowWizard(false);
        if (currentView !== 'home') return setCurrentView('home');
        CapApp.exitApp();
      }));

      if (active) handleNetwork();
    };
    setup();
    return () => {
      active = false;
      handles.forEach(handle => handle.remove());
    };
  }, [currentView, showHappiness, showQuickInput, showReflection, showWizard]);

  useEffect(() => {
    const refreshDiary = () => useDiaryStore.getState().triggerRefresh();
    window.addEventListener('diary-outbox-synced', refreshDiary);
    return () => window.removeEventListener('diary-outbox-synced', refreshDiary);
  }, []);

  const navItems: { label: string; view: PageView; icon: React.ReactNode }[] = [
    { label: '今天', view: 'home', icon: <TodayIcon /> },
    { label: '过往', view: 'history', icon: <HistoryIcon /> },
    { label: '统计', view: 'stats', icon: <StatsIcon /> },
    { label: '设置', view: 'settings', icon: <SettingsIcon /> }
  ];

  const renderBottomNav = () => (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-100/50 dark:border-gray-700/50 px-2 py-1 z-50">
      <div className="flex justify-around max-w-md mx-auto items-center">
        {navItems.slice(0, 2).map(item => (
          <button
            key={item.view}
            className={`flex flex-col items-center gap-1 px-4 py-2 text-xs ${
              currentView === item.view
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            onClick={() => setCurrentView(item.view)}
          >
            <span className="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <FloatingButton
          onQuickNote={() => { if (currentView !== 'home') setCurrentView('home'); setShowQuickInput(true); }}
          onReflection={() => { if (currentView !== 'home') setCurrentView('home'); setShowReflection(true); }}
          onHappiness={() => { if (currentView !== 'home') setCurrentView('home'); setShowHappiness(true); }}
          onAnxiety={() => { if (currentView !== 'home') setCurrentView('home'); setShowWizard(true); }}
          onImage={() => { if (currentView !== 'home') setCurrentView('home'); imageUploadRef.current?.open(); }}
        />
        {navItems.slice(2).map(item => (
          <button
            key={item.view}
            className={`flex flex-col items-center gap-1 px-4 py-2 text-xs ${
              currentView === item.view
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            onClick={() => setCurrentView(item.view)}
          >
            <span className="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  useEffect(() => {
    if (wasConnected && !vaultConnected) {
      // 可以自动尝试重新连接，但File System API需要用户交互
    }
  }, [wasConnected, vaultConnected]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const fileSync = getFileSyncService();
      const success = await fileSync.connectVault();
      if (success) {
        setVaultConnected(true);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setVaultConnected(false);
  };

  // 首次配置（仅原生 App 且无 Token 时显示）
  if (showFirstTimeConfig) {
    return (
      <FirstTimeConfig onConfigured={() => setShowFirstTimeConfig(false)} />
    );
  }

  // 设置页面
  if (currentView === 'settings') {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <SettingsPage />
        {renderBottomNav()}
      </div>
    );
  }

  // 统计页面
  if (currentView === 'stats') {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <StatsPage />
        {renderBottomNav()}
      </div>
    );
  }

  // 过往页面
  if (currentView === 'history') {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <HistoryPage />
        {renderBottomNav()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 pb-[50px]">
      {/* Header - 固定在 PullToRefresh 外部，不受下拉影响 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-3 sticky top-0 z-10 border-b border-gray-100/50 dark:border-gray-700/50">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            <span className="inline-flex items-center gap-2">
              <TodayIcon />
              {getShanghaiCalendarDate().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </h1>
          {/* 本地环境显示连接状态，生产环境隐藏远程模式提示 */}
          {(() => {
            const native = isNativeApp();
            const isProduction = !window.location.hostname.match(/localhost|127\.0\.0\.1/);
            if (isProduction || native) return null;
            if (remoteMode) {
              return (
                <span className="px-3 py-1 rounded-full text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  ✓ 远程模式
                </span>
              );
            }
            return (
              <button
                onClick={vaultConnected ? handleDisconnect : handleConnect}
                disabled={connecting}
                className={`px-3 py-1 rounded-full text-sm ${
                  vaultConnected
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : connecting
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      : wasConnected
                        ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300'
                        : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
                }`}
              >
                {connecting ? '连接中...' : vaultConnected ? '✓ 已连接' : wasConnected ? '重新连接' : '连接Vault'}
              </button>
            );
          })()}
        </div>
      </header>

      {remoteMode && <SyncStatusBar />}

      {/* 重新连接提示 */}
      {!remoteMode && wasConnected && !vaultConnected && (
        <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 border-b dark:border-gray-700">
          <div className="text-sm text-orange-700 dark:text-orange-300 text-center">
            页面刷新后需要重新授权Vault访问
          </div>
        </div>
      )}

      <PullToRefresh onRefresh={async () => {
        await diaryViewRef.current?.reload();
      }}>
        <main className="px-4 pt-1 pb-[80px] max-w-2xl mx-auto">
          <HabitTracker />
          <DiaryView ref={diaryViewRef} />
        </main>
      </PullToRefresh>

      {/* Bottom Navigation */}
      {renderBottomNav()}

      {/* Modals */}
      <ImageUploadButton
        ref={imageUploadRef}
        hidden
        onImageUploaded={() => diaryViewRef.current?.reload()}
      />
      {showQuickInput && <QuickInputModal onClose={() => setShowQuickInput(false)} />}
      {showReflection && <ReflectionModal onClose={() => setShowReflection(false)} />}
      {showHappiness && <HappinessModal onClose={() => setShowHappiness(false)} />}
      {showWizard && <RecordWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}

export default App
