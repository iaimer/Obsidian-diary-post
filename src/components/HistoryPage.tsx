import { useState, useEffect } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { CalendarView } from './CalendarView';
import { DiaryDetail } from './DiaryDetail';
import { getHistoryService } from '../services/historyService';
import { getFileSyncService } from '../services/fileSync';
import { DiaryMeta } from '../types/history';
import { PullToRefresh } from './PullToRefresh';

async function fetchRemoteMonthData(year: number, month: number): Promise<{ year: number; month: number; diaries: DiaryMeta[] }> {
  const { apiUrl, apiToken } = useDiaryStore.getState();
  
  const response = await fetch(`${apiUrl}/api/v1/history/${year}/${month}`, {
    headers: {
      'Authorization': `Token ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch history from API');
  }
  
  return await response.json();
}

export function HistoryPage() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthData, setMonthData] = useState<{ year: number; month: number; diaries: DiaryMeta[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vaultConnected || remoteMode) {
      if (remoteMode) {
        const now = new Date();
        loadMonthData(now.getFullYear(), now.getMonth() + 1);
      } else {
        const fileSync = getFileSyncService();
        const historyService = getHistoryService();
        const vaultHandle = fileSync.getVaultHandle();
        
        if (vaultHandle) {
          historyService.setVaultHandle(vaultHandle);
          
          const now = new Date();
          loadMonthData(now.getFullYear(), now.getMonth() + 1);
        }
      }
    }
  }, [vaultConnected, remoteMode]);

  const loadMonthData = async (year: number, month: number) => {
    setLoading(true);
    try {
      if (remoteMode) {
        const data = await fetchRemoteMonthData(year, month);
        setMonthData(data);
      } else {
        const historyService = getHistoryService();
        const data = await historyService.getMonthDiaries(year, month);
        setMonthData(data);
      }
    } catch (error) {
      console.error('Failed to load month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (monthData) {
      await loadMonthData(monthData.year, monthData.month);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const isConnected = vaultConnected || remoteMode;

  return (
    <div className="min-h-screen bg-gray-50 pb-[50px]">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen">
          <header className="bg-white shadow-sm px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-800">📅 历史日记</h1>
              <span className="text-sm text-gray-500">
                {remoteMode ? '远程模式' : vaultConnected ? '✓ 已连接' : '未连接'}
              </span>
            </div>
          </header>

          <main className="px-4 py-6 max-w-md mx-auto">
            {!isConnected ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                {remoteMode ? '请配置 API 地址和 Token' : '请先连接 Obsidian Vault'}
              </div>
            ) : (
              <div className="space-y-4">
                <CalendarView 
                  onDateSelect={handleDateSelect}
                  onMonthChange={loadMonthData}
                  diaryMetas={monthData?.diaries || []}
                  loading={loading}
                />

                {selectedDate && (
                  <DiaryDetail 
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </PullToRefresh>
    </div>
  );
}