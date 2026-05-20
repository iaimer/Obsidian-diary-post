import { useState, useRef, useEffect } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getDataService } from '../services/dataService';
import { polishContent, getAIConfig, isAIConfigured } from '../services/aiPolish';

// 三层标签体系
const TAG_SYSTEM = {
  domain: ['亲子', '育儿', '工作', '学习', '阅读', '技术'] as const,
  capability: {
    '亲子': ['情绪管理', '表达能力', '语言发育', '成长观察', '自信心', '自主探索'],
    '育儿': ['情绪管理', '表达能力', '语言发育', '成长观察', '自信心', '自主探索'],
    '工作': ['任务执行', '沟通协作', '问题解决', '决策能力', '效率管理'],
    '学习': ['理解能力', '记忆能力', '专注力', '学习迁移'],
    '阅读': ['信息提取', '理解深度', '批判思维'],
    '技术': ['系统理解', '调试能力', '架构理解', '实现能力']
  } as Record<string, string[]>,
  method: ['反思', '方法论', '问题分析', '记录'] as const
};

// 从润色结果中解析标签
function parseTagsFromPolished(text: string): { content: string; tags: string[] } {
  const tagMatches = text.match(/#\S+/g) || [];
  const tags = tagMatches.map(t => t.slice(1));
  const content = text.replace(/#\S+/g, '').trim();
  return { content, tags };
}

interface HappinessModalProps {
  onClose: () => void;
}

export function HappinessModal({ onClose }: HappinessModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showPolishedPreview, setShowPolishedPreview] = useState(false);
  const [polishedContent, setPolishedContent] = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false);

  // 选中的标签
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const isBatchSettingTags = useRef(false);

  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const triggerRefresh = useDiaryStore(state => state.triggerRefresh);

  // 当选择新领域时，清空能力标签
  useEffect(() => {
    if (!isBatchSettingTags.current) {
      setSelectedCapability(null);
    }
  }, [selectedDomain]);

  // 设置解析后的标签
  const setParsedTags = (tags: string[]) => {
    isBatchSettingTags.current = true;
    setSelectedDomain(null);
    setSelectedCapability(null);
    setSelectedMethod(null);

    for (const tag of tags) {
      if (TAG_SYSTEM.domain.includes(tag as any)) {
        setSelectedDomain(tag);
      } else if (TAG_SYSTEM.method.includes(tag as any)) {
        setSelectedMethod(tag);
      } else {
        for (const [domain, capabilities] of Object.entries(TAG_SYSTEM.capability)) {
          if (capabilities.includes(tag)) {
            setSelectedDomain(domain);
            setSelectedCapability(tag);
            break;
          }
        }
      }
    }

    setTimeout(() => {
      isBatchSettingTags.current = false;
    }, 0);
  };

  const availableCapabilities = selectedDomain ? TAG_SYSTEM.capability[selectedDomain] || [] : [];

  const getSelectedTags = (): string[] => {
    const tags: string[] = [];
    if (selectedDomain) tags.push(selectedDomain);
    if (selectedCapability) tags.push(selectedCapability);
    if (selectedMethod) tags.push(selectedMethod);
    return tags;
  };

  const handlePolish = async () => {
    if (!content.trim()) return;
    if (!isAIConfigured()) {
      alert('请先在设置页面配置AI API');
      return;
    }

    setIsPolishing(true);
    try {
      const config = getAIConfig();
      const result = await polishContent(content.trim(), config, 'happiness');
      const { tags } = parseTagsFromPolished(result);
      setParsedTags(tags);
      setPolishedContent(result);
      setShowPolishedPreview(true);
    } catch (error) {
      console.error('Polish failed:', error);
      alert('润色失败: ' + (error as Error).message);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUsePolished = () => {
    const { content: pureContent } = parseTagsFromPolished(polishedContent);
    setContent(pureContent);
    setShowPolishedPreview(false);
    setPolishedContent('');
  };

  const handleCancelPolish = () => {
    setShowPolishedPreview(false);
    setPolishedContent('');
    setSelectedDomain(null);
    setSelectedCapability(null);
    setSelectedMethod(null);
  };

  const handleSubmit = async (textToSend?: string) => {
    const finalContent = textToSend || content;
    if (!finalContent.trim()) return;
    
    const dataService = getDataService();
    if (!remoteMode && !vaultConnected) {
      alert('请先连接Obsidian Vault');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.appendHappiness(finalContent.trim(), getSelectedTags());

      setContent('');
      setSelectedDomain(null);
      setSelectedCapability(null);
      setSelectedMethod(null);
      triggerRefresh();
      onClose();
    } catch (error: unknown) {
      console.error('Failed to submit:', error);
      alert('提交失败: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">✨ 每日小确幸</h2>
          <button
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 bg-green-50 dark:bg-green-900/20 p-2 rounded">
          总有事件值得感恩🙏♥️
        </div>

        {/* 润色预览 */}
        {showPolishedPreview ? (
          <div className="mb-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">✨ AI润色结果：</div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-200 mb-2">
              {parseTagsFromPolished(polishedContent).content}
            </div>
            {/* AI生成的标签 */}
            <div className="flex gap-1 mb-2 flex-wrap items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">AI标签：</span>
              {selectedDomain && (
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs">
                  #{selectedDomain}
                </span>
              )}
              {selectedCapability && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">
                  #{selectedCapability}
                </span>
              )}
              {selectedMethod && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                  #{selectedMethod}
                </span>
              )}
              {selectedDomain && !selectedCapability && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
                  ⚠️ 缺少能力标签，请手动选择
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:bg-green-300 dark:disabled:bg-green-800"
                onClick={() => handleSubmit(parseTagsFromPolished(polishedContent).content)}
                disabled={isSubmitting || !selectedDomain || !selectedCapability}
              >
                {isSubmitting ? '保存中...' : '保存润色结果'}
              </button>
              <button
                className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm"
                onClick={handleUsePolished}
              >
                继续编辑
              </button>
              <button
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm"
                onClick={handleCancelPolish}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              placeholder="记录今天的小确幸..."
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={isSubmitting || isPolishing}
            />

            {/* 已选标签显示 */}
            {getSelectedTags().length > 0 && (
              <div className="flex gap-1 mt-2 mb-2 flex-wrap">
                {selectedDomain && (
                  <span
                    className="px-2 py-1 bg-indigo-600 text-white rounded-full text-xs cursor-pointer"
                    onClick={() => setSelectedDomain(null)}
                  >
                    #{selectedDomain} ×
                  </span>
                )}
                {selectedCapability && (
                  <span
                    className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs cursor-pointer"
                    onClick={() => setSelectedCapability(null)}
                  >
                    #{selectedCapability} ×
                  </span>
                )}
                {selectedMethod && (
                  <span
                    className="px-2 py-1 bg-gray-600 text-white rounded-full text-xs cursor-pointer"
                    onClick={() => setSelectedMethod(null)}
                  >
                    #{selectedMethod} ×
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {isAIConfigured() && (
                <button
                  className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50"
                  onClick={handlePolish}
                  disabled={isPolishing || !content.trim()}
                >
                  {isPolishing ? '润色中...' : '✨ 润色'}
                </button>
              )}

              <button
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => setShowTagPicker(!showTagPicker)}
              >
                🏷️ {showTagPicker ? '收起' : '标签'}
              </button>

              <button
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-800"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !content.trim()}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
              <button
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={onClose}
              >
                取消
              </button>
            </div>

            {/* 标签选择器 */}
            {showTagPicker && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="text-red-500">*</span> 领域（必选1个）
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TAG_SYSTEM.domain.map(tag => (
                      <button
                        key={tag}
                        className={`px-2 py-1 rounded-full text-xs ${
                          selectedDomain === tag
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                        }`}
                        onClick={() => setSelectedDomain(tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="text-orange-500">*</span> 能力（必选1个）
                    {!selectedDomain && <span className="text-gray-400 dark:text-gray-500 ml-1">→ 先选择领域</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableCapabilities.length > 0 ? (
                      availableCapabilities.map(tag => (
                        <button
                          key={tag}
                          className={`px-2 py-1 rounded-full text-xs ${
                            selectedCapability === tag
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                          }`}
                          onClick={() => setSelectedCapability(tag)}
                        >
                          #{tag}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">请先选择领域</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">方法（可选0-1个）</div>
                  <div className="flex flex-wrap gap-1">
                    {TAG_SYSTEM.method.map(tag => (
                      <button
                        key={tag}
                        className={`px-2 py-1 rounded-full text-xs ${
                          selectedMethod === tag
                            ? 'bg-gray-600 dark:bg-gray-500 text-white'
                            : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                        }`}
                        onClick={() => setSelectedMethod(selectedMethod === tag ? null : tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}