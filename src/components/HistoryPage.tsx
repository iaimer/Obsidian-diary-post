import { useState, useEffect } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { CalendarView } from './CalendarView';
import { DiaryDetail } from './DiaryDetail';
import { getHistoryService } from '../services/historyService';
import { getFileSyncService } from '../services/fileSync';
import { DiaryMeta } from '../types/history';
import { PullToRefresh } from './PullToRefresh';

export function HistoryPage() {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [monthData, setMonthData] = useState<{ year: number; month: number; diaries: DiaryMeta[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vaultConnected) {
      const fileSync = getFileSyncService();
      const historyService = getHistoryService();
      const vaultHandle = fileSync.getVaultHandle();
      
      if (vaultHandle) {
        historyService.setVaultHandle(vaultHandle);
        
        const now = new Date();
        loadMonthData(now.getFullYear(), now.getMonth() + 1);
      }
    }
  }, [vaultConnected]);

  const loadMonthData = async (year: number, month: number) => {
    setLoading(true);
    try {
      const historyService = getHistoryService();
      const data = await historyService.getMonthDiaries(year, month);
      setMonthData(data);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen">
          <header className="bg-white shadow-sm px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-800">📅 历史日记</h1>
              <span className="text-sm text-gray-500">
                {vaultConnected ? '✓ 已连接' : '未连接'}
              </span>
            </div>
          </header>

          <main className="px-4 py-6 max-w-md mx-auto">
            {!vaultConnected ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                请先连接 Obsidian Vault
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