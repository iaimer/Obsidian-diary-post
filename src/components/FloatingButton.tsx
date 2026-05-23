import { useState } from 'react';

interface FloatingButtonProps {
  onQuickNote: () => void;
  onReflection: () => void;
  onHappiness: () => void;
}

interface SubButtonConfig {
  id: string;
  icon: string;
  label: string;
  angle: number;  // 角度（度数，以右为0度，逆时针）
  onClick: () => void;
}

export default function FloatingButton({ onQuickNote, onReflection, onHappiness }: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 子按钮配置：向左上方展开（角度转换后：180°=上，270°=左）
  // 间隔45°：180°（上）、225°（左上）、270°（左）
  const buttons: SubButtonConfig[] = [
    { id: 'quickNote', icon: '/icons/memo.svg', label: '随手记', angle: 180, onClick: onQuickNote },
    { id: 'happiness', icon: '/icons/heart.svg', label: '小确幸', angle: 225, onClick: onHappiness },
    { id: 'reflection', icon: '/icons/thinking.svg', label: '觉察', angle: 270, onClick: onReflection },
  ];

  const radius = 80; // 子按钮距离中心的半径（px）

  // 计算子按钮位置（角度转为坐标）
  const getPosition = (angle: number) => {
    // 将角度转为弧度，并调整坐标系（CSS中y轴向下为正）
    const radians = (angle - 90) * (Math.PI / 180); // -90 使顶部为0度方向
    const x = radius * Math.cos(radians);
    const y = -radius * Math.sin(radians); // 负号使向上为正
    return { x, y };
  };

  const handleClick = (btn: SubButtonConfig) => {
    btn.onClick();
    setIsOpen(false);
  };

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 子按钮容器 */}
      <div className="fixed bottom-[80px] right-5 z-40">
        {buttons.map((btn, index) => {
          const pos = getPosition(btn.angle);
          return (
            <button
              key={btn.id}
              onClick={() => handleClick(btn)}
              className="absolute w-11 h-11 rounded-full bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm shadow-md flex items-center justify-center transition-all duration-300 ease-out"
              style={{
                right: 0,
                bottom: 0,
                transform: isOpen
                  ? `translate(${pos.x}px, ${pos.y}px)`
                  : 'translate(0, 0)',
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

        {/* 主按钮 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-13 h-13 rounded-full bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm shadow-md flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 z-50 relative"
          style={{ marginBottom: 0 }}
        >
          <img
            src="/icons/pencil.svg"
            alt="快速记录"
            className={`w-8 h-8 transition-opacity duration-200 ${isOpen ? 'opacity-0' : 'opacity-100'}`}
          />
          {/* 展开时显示关闭图标 */}
          {isOpen && (
            <span className="absolute text-gray-500 dark:text-gray-300 text-xl">✕</span>
          )}
        </button>
      </div>
    </>
  );
}