import { useState, useRef } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';
import { UploadPhotoIcon } from './Icons';

interface ImageUploadButtonProps {
  onImageUploaded?: () => void;
}

export default function ImageUploadButton({ onImageUploaded }: ImageUploadButtonProps) {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const handleClick = () => {
    if (status === 'uploading') {
      cancelRef.current = true;
      setStatus('idle');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus('uploading');
    setErrorMsg('');
    cancelRef.current = false;

    try {
      const dataService = getDataService();
      for (let i = 0; i < files.length; i++) {
        if (cancelRef.current) return;
        await dataService.uploadImage(files[i], new Date());
        if (cancelRef.current) return;
      }
      setStatus('idle');
      e.target.value = '';
      onImageUploaded?.();
      useDiaryStore.getState().triggerRefresh();
    } catch (err) {
      if (cancelRef.current) return;
      setStatus('error');
      setErrorMsg((err as Error).message);
    }
  };

  if (!vaultConnected && !remoteMode) return null;

  return (
    <span className="ml-auto inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
          status === 'uploading'
            ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
            : 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50'
        }`}
      >
        {status === 'uploading' ? (
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-500 border-t-gray-500 dark:border-t-gray-300 rounded-full animate-spin" />
            取消上传
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <UploadPhotoIcon />
            添加照片
          </span>
        )}
      </button>

      {status === 'error' && (
        <span className="text-xs text-red-500 dark:text-red-400">{errorMsg}</span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </span>
  );
}
