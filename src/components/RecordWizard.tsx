import { useState, useRef, useEffect } from 'react';
import { getDataService } from '../services/dataService';
import { useDiaryStore } from '../stores/diaryStore';

interface RecordWizardProps {
  onClose: () => void;
}

interface StepConfig {
  id: string;
  icon: string;
  title: string;
  question: string;
  placeholder: string;
}

const STEPS: StepConfig[] = [
  { id: 'q1', icon: '/icons/anxiety.svg?v=2', title: '焦虑时刻', question: '今天什么时候我感到焦虑/紧张？', placeholder: '描述当时的场景...' },
  { id: 'q2', icon: '/icons/anxiety.svg?v=2', title: '焦虑时刻', question: '当时我在担心什么？（具体到一句话）', placeholder: '我担心的是...' },
  { id: 'q3', icon: '/icons/anxiety.svg?v=2', title: '焦虑时刻', question: '我做了什么？', placeholder: '我采取了什么行动...' },
  { id: 'q4', icon: '/icons/anxiety.svg?v=2', title: '焦虑时刻', question: '这个应对是帮我面对了，还是帮我躲开了？', placeholder: '反思一下这个应对方式...' },
];

export default function RecordWizard({ onClose }: RecordWizardProps) {
  const [step, setStep] = useState(0);
  const [content, setContent] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const triggerRefresh = useDiaryStore(state => state.triggerRefresh);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  useEffect(() => {
    textareaRef.current?.focus();
  }, [step]);

  const handleNext = () => {
    setAnswers(prev => [...prev, content]);
    setContent('');
    setStep(s => s + 1);
  };

  const handleSkip = () => {
    setAnswers(prev => [...prev, '']);
    setContent('');
    if (isLast) {
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSave = async () => {
    const allAnswers = [...answers, content];
    const hasContent = allAnswers.some(a => a.trim());

    if (!hasContent) {
      onClose();
      return;
    }

    const dataService = getDataService();
    if (!remoteMode && !vaultConnected) {
      alert('请先连接Obsidian Vault');
      return;
    }

    setIsSubmitting(true);
    try {
      const questions = [
        '今天什么时候我感到焦虑/紧张？',
        '当时我在担心什么？（具体到一句话）',
        '我做了什么？',
        '这个应对是帮我面对了，还是帮我躲开了？',
      ];

      const formatted = allAnswers.map((answer, i) => {
        if (!answer.trim()) return `- ${questions[i]}\n> `;
        return `- ${questions[i]}\n> ${answer.trim()}`;
      }).join('\n');

      await (dataService as any).appendAnxiety(formatted, []);
      triggerRefresh();
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('保存失败: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (isLast) {
        handleSave();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-overlay-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md shadow-xl animate-modal-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src={current.icon} alt="" className="w-5 h-5" />
              <h2 className="text-base font-medium text-gray-800 dark:text-gray-100">
                {current.title}
              </h2>
            </div>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
          {current.question}
        </p>

        <textarea
          ref={textareaRef}
          className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-shadow duration-200"
          placeholder={current.placeholder}
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          autoFocus
        />

        <div className="flex gap-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            onClick={isLast ? onClose : handleSkip}
            disabled={isSubmitting}
          >
            {isLast ? '关闭' : '跳过'}
          </button>
          {isLast ? (
            <button
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-800 transition-colors"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : '✓ 保存'}
            </button>
          ) : (
            <button
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-800 transition-colors"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              下一步 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
