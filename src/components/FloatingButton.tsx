import { useState } from 'react';
import type { ReactNode } from 'react';
import { AddIcon, CloseIcon } from './Icons';

interface FloatingButtonProps {
  onQuickNote: () => void;
  onHappiness: () => void;
  onReflection: () => void;
  onAnxiety: () => void;
  onImage: () => void;
}

interface SubButtonConfig {
  id: string;
  icon: ReactNode;
  label: string;
  angle: number;
  onClick: () => void;
}

export default function FloatingButton({ onQuickNote, onHappiness, onReflection, onAnxiety, onImage }: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const buttons: SubButtonConfig[] = [
    { id: 'anxiety', icon: <img src="/icons/anxiety.svg?v=2" alt="" className="w-7 h-7" />, label: '焦虑时刻', angle: 240, onClick: onAnxiety },
    { id: 'reflection', icon: <img src="/icons/thinking.svg?v=2" alt="" className="w-7 h-7" />, label: '觉察', angle: 210, onClick: onReflection },
    { id: 'quickNote', icon: <img src="/icons/memo.svg?v=2" alt="" className="w-7 h-7" />, label: '随手记', angle: 180, onClick: onQuickNote },
    { id: 'happiness', icon: <img src="/icons/heart.svg?v=2" alt="" className="w-7 h-7" />, label: '小确幸', angle: 150, onClick: onHappiness },
    { id: 'image', icon: <img src="/icons/photo-camera.svg?v=1" alt="" className="w-7 h-7" />, label: '照片', angle: 120, onClick: onImage },
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
              <span className="text-2xl text-violet-600 dark:text-violet-300" aria-hidden="true">
                {btn.icon}
              </span>
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
