import { useEffect, useRef, useState } from 'react';
import { getOutboxSummary, retryFailed, isOnline } from '../services/outboxService';

type SyncState = 'hidden' | 'offline' | 'syncing' | 'failed' | 'done';

export function SyncStatusBar() {
  const [state, setState] = useState<SyncState>('hidden');
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [doneVisible, setDoneVisible] = useState(false);
  const previousTotal = useRef(0);

  const refresh = () => {
    getOutboxSummary().then(s => {
      setPending(s.pending);
      setFailed(s.failed);
      const total = s.pending + s.failed;
      if (previousTotal.current > 0 && total === 0) {
        setDoneVisible(true);
      }
      previousTotal.current = total;
      if (s.syncing) {
        setState('syncing');
      } else if (s.failed > 0) {
        setState('failed');
      } else if (s.pending > 0) {
        isOnline().then(online => {
          setState(online ? 'syncing' : 'offline');
        });
      } else {
        setState('hidden');
      }
    });
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    window.addEventListener('diary-outbox-change', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('diary-outbox-change', refresh);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (doneVisible) {
      timer = setTimeout(() => setDoneVisible(false), 2500);
    }
    return () => clearTimeout(timer);
  }, [doneVisible]);

  const handleRetry = async () => {
    await retryFailed();
    refresh();
  };

  if (state === 'hidden' && !doneVisible) return null;

  const barCls = 'px-4 py-1.5 text-xs text-center transition-all duration-300';

  if (doneVisible) {
    return (
      <div className={`${barCls} bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300`}>
        同步完成
      </div>
    );
  }

  switch (state) {
    case 'offline':
      return (
        <div className={`${barCls} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`}>
          当前离线，{pending} 项记录将在联网后同步
        </div>
      );
    case 'syncing':
      return (
        <div className={`${barCls} bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300`}>
          正在同步... {pending > 0 ? `剩余 ${pending} 项` : ''}
        </div>
      );
    case 'failed':
      return (
        <div className={`${barCls} bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 flex items-center justify-center gap-2`}>
          有 {failed} 项同步失败
          <button
            onClick={handleRetry}
            className="underline hover:text-red-700 dark:hover:text-red-200"
          >
            重试
          </button>
        </div>
      );
    default:
      return null;
  }
}
