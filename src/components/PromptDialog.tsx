import { useState, useRef, useEffect } from 'react';

interface Props {
  title: string;
  initialValue?: string;
  initialDescription?: string;
  showDescription?: boolean;
  descriptionLabel?: string;
  onConfirm: (name: string, description?: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  title,
  initialValue = '',
  initialDescription = '',
  showDescription = false,
  descriptionLabel = '说明（可选）',
  onConfirm,
  onCancel
}: Props) {
  const [name, setName] = useState(initialValue);
  const [description, setDescription] = useState(initialDescription);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed, showDescription ? description.trim() : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-overlay-in" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-sm shadow-xl animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-3">{title}</h3>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="输入名称..."
          className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
        />

        {showDescription && (
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder={descriptionLabel}
            className="w-full mt-2 p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-h-[44px]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
