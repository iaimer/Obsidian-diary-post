import { useState, useEffect } from 'react';
import { useDiaryStore } from './stores/diaryStore';
import { getFileSyncService } from './services/fileSync';
import QuickInput from './components/QuickInput';
import { ReflectionModal } from './components/ReflectionModal';
import { HappinessModal } from './components/HappinessModal';
import HabitTracker from './components/HabitTracker';
import DiaryView from './components/DiaryView';
import { SettingsPage } from './components/SettingsPage';
import StatsPage from './components/StatsPage';

type PageView = 'home' | 'stats' | 'settings';

function App() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const wasConnected = useDiaryStore(state => state.wasConnected);
  const setVaultConnected = useDiaryStore(state => state.setVaultConnected);

  const [showReflection, setShowReflection] = useState(false);
  const [showHappiness, setShowHappiness] = useState(false);
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [connecting, setConnecting] = useState(false);

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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
          <div className="flex justify-around max-w-md mx-auto">
            <button
              className="px-4 py-2 text-gray-400 hover:text-gray-600"
              onClick={() => setCurrentView('home')}
            >
              今天
            </button>
            <button className="px-4 py-2 text-gray-400 hover:text-gray-600">历史</button>
            <button
              className="px-4 py-2 text-gray-400 hover:text-gray-600"
              onClick={() => setCurrentView('stats')}
            >
              统计
            </button>
            <button className="px-4 py-2 text-indigo-600 font-medium">设置</button>
          </div>
        </nav>
      </>
    );
  }

  // 统计页面
  if (currentView === 'stats') {
    return (
      <>
        <StatsPage />
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
          <div className="flex justify-around max-w-md mx-auto">
            <button
              className="px-4 py-2 text-gray-400 hover:text-gray-600"
              onClick={() => setCurrentView('home')}
            >
              今天
            </button>
            <button className="px-4 py-2 text-gray-400 hover:text-gray-600">历史</button>
            <button className="px-4 py-2 text-indigo-600 font-medium">统计</button>
            <button
              className="px-4 py-2 text-gray-400 hover:text-gray-600"
              onClick={() => setCurrentView('settings')}
            >
              设置
            </button>
          </div>
        </nav>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
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
          <div className="text-sm text-orange-700 flex items-center justify-between">
            <span>页面刷新后需要重新授权Vault访问</span>
            <button
              className="text-xs bg-orange-600 text-white px-2 py-1 rounded"
              onClick={handleConnect}
            >
              重新连接
            </button>
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
        <DiaryView />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2">
        <div className="flex justify-around max-w-md mx-auto">
          <button className="px-4 py-2 text-indigo-600 font-medium">今天</button>
          <button className="px-4 py-2 text-gray-400 hover:text-gray-600">历史</button>
          <button
            className="px-4 py-2 text-gray-400 hover:text-gray-600"
            onClick={() => setCurrentView('stats')}
          >
            统计
          </button>
          <button
            className="px-4 py-2 text-gray-400 hover:text-gray-600"
            onClick={() => setCurrentView('settings')}
          >
            设置
          </button>
        </div>
      </nav>

      {/* Modals */}
      {showReflection && <ReflectionModal onClose={() => setShowReflection(false)} />}
      {showHappiness && <HappinessModal onClose={() => setShowHappiness(false)} />}
    </div>
  );
}

export default App