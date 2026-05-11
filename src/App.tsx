import { useState, useEffect, useRef } from 'react';
import { useDiaryStore } from './stores/diaryStore';
import { getFileSyncService } from './services/fileSync';
import QuickInput from './components/QuickInput';
import { ReflectionModal } from './components/ReflectionModal';
import { HappinessModal } from './components/HappinessModal';
import HabitTracker from './components/HabitTracker';
import DiaryView, { DiaryViewRef } from './components/DiaryView';
import { SettingsPage } from './components/SettingsPage';
import StatsPage from './components/StatsPage';
import { HistoryPage } from './components/HistoryPage';
import { PullToRefresh } from './components/PullToRefresh';

type PageView = 'home' | 'history' | 'stats' | 'settings';

function App() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const wasConnected = useDiaryStore(state => state.wasConnected);
  const setVaultConnected = useDiaryStore(state => state.setVaultConnected);

  const [showReflection, setShowReflection] = useState(false);
  const [showHappiness, setShowHappiness] = useState(false);
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [connecting, setConnecting] = useState(false);
  const diaryViewRef = useRef<DiaryViewRef>(null);

  const renderBottomNav = () => {
    const navItems: { label: string; view: PageView }[] = [
      { label: '今天', view: 'home' },
      { label: '历史', view: 'history' },
      { label: '统计', view: 'stats' },
      { label: '设置', view: 'settings' }
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(item => (
            <button
              key={item.view}
              className={`px-4 py-2 ${
                currentView === item.view
                  ? 'text-indigo-600 font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setCurrentView(item.view)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    );
  };

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

  // 设置页面
  if (currentView === 'settings') {
    return (
      <>
        <SettingsPage />
        {renderBottomNav()}
      </>
    );
  }

  // 统计页面
  if (currentView === 'stats') {
    return (
      <>
        <StatsPage />
        {renderBottomNav()}
      </>
    );
  }

  // 历史页面
  if (currentView === 'history') {
    return (
      <>
        <HistoryPage />
        {renderBottomNav()}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      <PullToRefresh onRefresh={async () => {
        await diaryViewRef.current?.reload();
      }}>
        <div className="min-h-screen">
          {/* Header */}
          <header className="bg-white shadow-sm px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-800">
                📅 {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </h1>
              <button
                onClick={vaultConnected ? handleDisconnect : handleConnect}
                disabled={connecting}
                className={`px-3 py-1 rounded-full text-sm ${
                  vaultConnected
                    ? 'bg-green-100 text-green-700'
                    : connecting
                      ? 'bg-gray-100 text-gray-400'
                      : wasConnected
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {connecting ? '连接中...' : vaultConnected ? '✓ 已连接' : wasConnected ? '重新连接' : '连接Vault'}
              </button>
            </div>
          </header>

          {/* 重新连接提示 */}
          {wasConnected && !vaultConnected && (
            <div className="px-4 py-2 bg-orange-50 border-b">
              <div className="text-sm text-orange-700 text-center">
                页面刷新后需要重新授权Vault访问
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="px-4 py-6 max-w-md mx-auto">
            {/* Quick Input */}
            <QuickInput />

            {/* Quick Actions */}
            <section className="flex gap-3 mb-4">
              <button
                className="flex-1 py-3 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-medium hover:bg-yellow-100"
                onClick={() => setShowReflection(true)}
              >
                💡 觉察
              </button>
              <button
                className="flex-1 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100"
                onClick={() => setShowHappiness(true)}
              >
                ✨ 小确幸
              </button>
            </section>

            {/* Habits */}
            <HabitTracker />

            {/* Diary View */}
            <DiaryView ref={diaryViewRef} />
          </main>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      {renderBottomNav()}

      {/* Modals */}
      {showReflection && <ReflectionModal onClose={() => setShowReflection(false)} />}
      {showHappiness && <HappinessModal onClose={() => setShowHappiness(false)} />}
    </div>
  );
}

export default App