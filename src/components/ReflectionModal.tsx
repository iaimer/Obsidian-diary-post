import { useState } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';

interface ReflectionModalProps {
  onClose: () => void;
}

export function ReflectionModal({ onClose }: ReflectionModalProps) {
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
      await dataService.appendReflection(content.trim());

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
          <h2 className="text-lg font-medium text-gray-800">💡 觉察与迭代</h2>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <textarea
          className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="记录今天的觉察与反思..."
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:bg-yellow-300"
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