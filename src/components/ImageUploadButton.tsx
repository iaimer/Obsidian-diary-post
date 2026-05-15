import { useState, useRef } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';

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
            ? 'bg-gray-100 text-gray-400'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        }`}
      >
        {status === 'processing' ? progress : '添加照片'}
      </button>

      {status === 'error' && (
        <span className="text-xs text-red-500">{errorMsg}</span>
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
