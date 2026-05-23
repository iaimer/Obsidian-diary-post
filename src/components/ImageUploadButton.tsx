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
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus('processing');
    setErrorMsg('');
    const dataService = getDataService();

    for (let i = 0; i < files.length; i++) {
      setProgress(`${i + 1}/${files.length}`);

      try {
        await dataService.uploadImage(files[i], new Date());
      } catch (err) {
        setStatus('error');
        setErrorMsg((err as Error).message);
        return;
      }
    }

    setStatus('idle');
    setProgress('');
    e.target.value = '';
    onImageUploaded?.();
    useDiaryStore.getState().triggerRefresh();
  };

  if (!vaultConnected && !remoteMode) return null;

  return (
    <span className="ml-auto">
      <button
        onClick={handleClick}
        disabled={status === 'processing'}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
          status === 'processing'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            : 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50'
        }`}
      >
        {status === 'processing' ? (
          progress
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
