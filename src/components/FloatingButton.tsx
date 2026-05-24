import { useState } from 'react';
import { AddIcon, CloseIcon } from './Icons';

interface FloatingButtonProps {
  onQuickNote: () => void;
  onHappiness: () => void;
  onReflection: () => void;
  onAnxiety: () => void;
}

interface SubButtonConfig {
  id: string;
  icon: string;
  label: string;
  angle: number;
  onClick: () => void;
}

export default function FloatingButton({ onQuickNote, onHappiness, onReflection, onAnxiety }: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttons: SubButtonConfig[] = [
    { id: 'happiness', icon: '/icons/heart.svg?v=2', label: '小确幸', angle: 225, onClick: onHappiness },
    { id: 'quickNote', icon: '/icons/memo.svg?v=2', label: '随手记', angle: 195, onClick: onQuickNote },
    { id: 'reflection', icon: '/icons/thinking.svg?v=2', label: '觉察', angle: 165, onClick: onReflection },
    { id: 'anxiety', icon: '/icons/anxiety.svg?v=2', label: '焦虑时刻', angle: 135, onClick: onAnxiety },
  ];

  const radius = 115;

  const getPosition = (angle: number) => {
    const radians = (angle - 90) * (Math.PI / 180);
    const x = radius * Math.cos(radians);
    const y = -radius * Math.sin(radians);
    return { x, y };
  };

  const handleSubClick = (btn: SubButtonConfig) => {
    btn.onClick();
    setIsOpen(false);
  };

  const toggle = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-30" onClick={close} />
      )}

      <div
        className="fixed left-1/2 z-40"
        style={{ bottom: 'calc(32px + env(safe-area-inset-bottom))' }}
      >
        {buttons.map((btn, index) => {
          const pos = getPosition(btn.angle);
          return (
            <button
              key={btn.id}
              onClick={() => handleSubClick(btn)}
              className="absolute w-11 h-11 rounded-full bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm shadow-md flex items-center justify-center transition-all duration-300 ease-out"
              style={{
                left: 0,
                bottom: 0,
                transform: isOpen
                  ? `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`
                  : 'translate(-50%, 0)',
                opacity: isOpen ? 1 : 0,
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                pointerEvents: isOpen ? 'auto' : 'none',
              }}
              title={btn.label}
            >
              <img src={btn.icon} alt={btn.label} className="w-7 h-7" />
            </button>
          );
        })}
      </div>

      <button
        onClick={toggle}
        className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <span className="text-2xl">
          {isOpen ? <CloseIcon /> : <AddIcon />}
        </span>
        <span>记录</span>
      </button>
    </>
  );
}
