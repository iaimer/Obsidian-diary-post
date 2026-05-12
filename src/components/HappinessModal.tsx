import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';

interface HappinessModalProps {
  onClose: () => void;
}

export function HappinessModal({ onClose }: HappinessModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const triggerRefresh = useDiaryStore(state => state.triggerRefresh);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    // 检查连接状态
    const dataService = getDataService();
    if (!remoteMode && !vaultConnected) {
      alert('请先连接Obsidian Vault');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.appendHappiness(content.trim());

      setContent('');
      triggerRefresh(); // 触发刷新
      onClose();
    } catch (error: unknown) {
      console.error('Failed to submit:', error);
      alert('提交失败: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">✨ 每日小确幸</h2>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-2 bg-green-50 p-2 rounded">
          总有事件值得感恩🙏♥️
        </div>

        <textarea
          className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="记录今天的小确幸..."
          rows={3}
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-green-300"
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}