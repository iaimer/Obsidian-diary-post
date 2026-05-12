import { useState, useEffect } from 'react';

interface ImageModalProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
}

export function ImageModal({ images, currentIndex, onClose }: ImageModalProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
        setLoading(true);
      } else if (e.key === 'ArrowRight' && activeIndex < images.length - 1) {
        setActiveIndex(activeIndex + 1);
        setLoading(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length, onClose]);

  const goToPrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setLoading(true);
    }
  };

  const goToNext = () => {
    if (activeIndex < images.length - 1) {
      setActiveIndex(activeIndex + 1);
      setLoading(true);
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center overflow-hidden overscroll-contain touch-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 图片计数 */}
      <div className="absolute top-4 left-4 text-white/80 text-sm z-10">
        {activeIndex + 1} / {images.length}
      </div>

      {/* 左箭头 */}
      {activeIndex > 0 && (
        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 右箭头 */}
      {activeIndex < images.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full p-2 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 图片容器 */}
      <div className={`w-full h-full flex items-center justify-center ${images.length > 3 ? 'pb-20' : ''} px-4 py-12 box-border`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="text-white/60 animate-pulse">加载中...</div>
          </div>
        )}
        
        <img
          src={images[activeIndex]}
          alt={`Image ${activeIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onLoad={handleImageLoad}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 底部图片缩略图导航 */}
      {images.length > 3 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveIndex(i);
                setLoading(true);
              }}
              className={`w-10 h-10 rounded overflow-hidden border-2 transition-all ${
                i === activeIndex 
                  ? 'border-white opacity-100' 
                  : 'border-white/30 opacity-60 hover:opacity-80'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}