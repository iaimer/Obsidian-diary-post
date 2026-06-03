import { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getFileSyncService } from '../services/dataService';
import { compressImage, generateImageFilename } from '../services/imageService';
import { UploadPhotoIcon } from './Icons';
import { enqueue } from '../services/outboxService';
import { getShanghaiCalendarDate, getShanghaiDateString } from '../utils/date';

interface ImageUploadButtonProps {
  onImageUploaded?: () => void;
  hidden?: boolean;
}

export interface ImageUploadButtonRef {
  open: () => void;
}

const ImageUploadButton = forwardRef<ImageUploadButtonRef, ImageUploadButtonProps>(function ImageUploadButton(
  { onImageUploaded, hidden = false },
  ref
) {
  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleClick = () => {
    if (status === 'uploading') {
      cancelRef.current = true;
      abortRef.current?.abort();
      setStatus('idle');
      return;
    }
    fileInputRef.current?.click();
  };

  useImperativeHandle(ref, () => ({
    open: handleClick
  }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatus('uploading');
    setErrorMsg('');
    cancelRef.current = false;
    abortRef.current = new AbortController();

    try {
      for (let i = 0; i < files.length; i++) {
        if (cancelRef.current) return;

        const config = useDiaryStore.getState().imageConfig;

        const blob = await compressImage(files[i], config);
        if (cancelRef.current) return;

        const date = getShanghaiCalendarDate();

        if (remoteMode) {
          await enqueue('upload_image', getShanghaiDateString(), {}, blob);
          if (cancelRef.current) return;
        } else {
          const fileSync = getFileSyncService();
          const seq = await fileSync.getNextImageSequence(date, config.nameFormat);
          if (cancelRef.current) return;

          const filename = generateImageFilename(date, seq, config.nameFormat);

          await fileSync.saveImageToAssets(date, blob, filename);
          if (cancelRef.current) return;

          await fileSync.appendImageReference(date, filename);
          if (cancelRef.current) return;
        }
      }

      if (!cancelRef.current) {
        setStatus('idle');
        e.target.value = '';
        onImageUploaded?.();
        useDiaryStore.getState().triggerRefresh();
      }
    } catch (err: any) {
      if (cancelRef.current || err.name === 'AbortError') return;
      setStatus('error');
      setErrorMsg(err.message || '上传失败');
      if (hidden) {
        alert('上传失败: ' + (err.message || '未知错误'));
      }
    } finally {
      abortRef.current = null;
    }
  };

  if (!vaultConnected && !remoteMode) return null;

  const input = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={handleFileChange}
    />
  );

  if (hidden) return input;

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

      {input}
    </span>
  );
});

export default ImageUploadButton;
