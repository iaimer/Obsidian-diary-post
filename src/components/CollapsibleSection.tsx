import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ 
  title, 
  defaultExpanded = false, 
  children 
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div
        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h2>
        <span
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          style={{ fontSize: '12px' }}
        >
          ▶
        </span>
      </div>
      
      <div 
        className={`transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </section>
  );
}