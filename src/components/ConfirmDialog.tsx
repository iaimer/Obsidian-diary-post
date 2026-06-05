interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  destructive = false,
  onConfirm,
  onCancel
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-overlay-in" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-sm shadow-xl animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
        {message && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{message}</p>}

        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 min-h-[44px]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium min-h-[44px] ${
              destructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
