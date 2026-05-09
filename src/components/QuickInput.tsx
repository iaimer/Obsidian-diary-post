import { useState, useEffect } from 'react';
import { useDiaryStore } from '../stores/diaryStore';
import { getFileSyncService } from '../services/fileSync';
import { polishContent, getAIConfig, isAIConfigured } from '../services/aiPolish';

// 三层标签体系（来自标签规范.md）
const TAG_SYSTEM = {
  // 第一层：领域层（唯一必选，6个）
  domain: ['亲子', '育儿', '工作', '学习', '阅读', '技术'] as const,

  // 第二层：能力层（严格对应领域，24个）
  capability: {
    '亲子': ['情绪管理', '表达能力', '语言发育', '成长观察', '自信心', '自主探索'],
    '育儿': ['情绪管理', '表达能力', '语言发育', '成长观察', '自信心', '自主探索'],
    '工作': ['任务执行', '沟通协作', '问题解决', '决策能力', '效率管理'],
    '学习': ['理解能力', '记忆能力', '专注力', '学习迁移'],
    '阅读': ['信息提取', '理解深度', '批判思维'],
    '技术': ['系统理解', '调试能力', '架构理解', '实现能力']
  } as Record<string, string[]>,
  // 第三层：方法层（可选，全领域共享，4个）
  method: ['反思', '方法论', '问题分析', '记录'] as const
};

// 从润色结果中解析标签
function parseTagsFromPolished(text: string): { content: string; tags: string[] } {
  // 提取所有 #xxx 格式的标签
  const tagMatches = text.match(/#\S+/g) || [];
  const tags = tagMatches.map(t => t.slice(1)); // 去掉#号

  // 移除标签，只保留内容
  const content = text.replace(/#\S+/g, '').trim();

  return { content, tags };
}

// 将解析的标签设置到选择器
function setParsedTags(tags: string[], setDomain: (d: string | null) => void, setCapability: (c: string | null) => void, setMethod: (m: string | null) => void) {
  // 清空所有标签
  setDomain(null);
  setCapability(null);
  setMethod(null);

  // 分类标签
  for (const tag of tags) {
    if (TAG_SYSTEM.domain.includes(tag as any)) {
      setDomain(tag);
    } else if (TAG_SYSTEM.method.includes(tag as any)) {
      setMethod(tag);
    } else {
      // 查找是否是某个领域的有效能力标签
      for (const [domain, capabilities] of Object.entries(TAG_SYSTEM.capability)) {
        if (capabilities.includes(tag)) {
          setDomain(domain);
          setCapability(tag);
          break;
        }
      }
    }
  }
}

export default function QuickInput() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPolishedPreview, setShowPolishedPreview] = useState(false);
  const [polishedContent, setPolishedContent] = useState('');

  // 选中的标签
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const vaultConnected = useDiaryStore(state => state.vaultConnected);
  const triggerRefresh = useDiaryStore(state => state.triggerRefresh);

  // 当选择新领域时，清空能力标签
  useEffect(() => {
    setSelectedCapability(null);
  }, [selectedDomain]);

  // 获取当前可用的能力标签列表
  const availableCapabilities = selectedDomain ? TAG_SYSTEM.capability[selectedDomain] || [] : [];

  // 获取完整的标签字符串数组
  const getSelectedTags = (): string[] => {
    const tags: string[] = [];
    if (selectedDomain) tags.push(selectedDomain);
    if (selectedCapability) tags.push(selectedCapability);
    if (selectedMethod) tags.push(selectedMethod);
    return tags;
  };

  // AI润色
  const handlePolish = async () => {
    if (!content.trim()) return;
    if (!isAIConfigured()) {
      alert('请先在设置页面配置AI API');
      return;
    }

    setIsPolishing(true);
    try {
      const config = getAIConfig();
      const result = await polishContent(content.trim(), config);

      // 解析标签
      const { tags } = parseTagsFromPolished(result);

      // 设置解析后的标签到选择器
      setParsedTags(tags, setSelectedDomain, setSelectedCapability, setSelectedMethod);

      // 存储原始润色结果（含标签）
      setPolishedContent(result);
      setShowPolishedPreview(true);
    } catch (error) {
      console.error('Polish failed:', error);
      alert('润色失败: ' + (error as Error).message);
    } finally {
      setIsPolishing(false);
    }
  };

  // 使用润色后的内容（不含标签，标签已自动设置到选择器）
  const handleUsePolished = () => {
    const { content: pureContent } = parseTagsFromPolished(polishedContent);
    setContent(pureContent);
    setShowPolishedPreview(false);
    setPolishedContent('');
  };

  // 取消润色
  const handleCancelPolish = () => {
    setShowPolishedPreview(false);
    setPolishedContent('');
    // 清空标签
    setSelectedDomain(null);
    setSelectedCapability(null);
    setSelectedMethod(null);
  };

  const handleSubmit = async (textToSend?: string) => {
    const finalContent = textToSend || content;
    if (!finalContent.trim()) return;
    if (!vaultConnected) {
      alert('请先连接Obsidian Vault');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileSync = getFileSyncService();
      await fileSync.appendQuickNote(finalContent.trim(), getSelectedTags());

      setContent('');
      setShowPolishedPreview(false);
      setPolishedContent('');
      // 清空标签
      setSelectedDomain(null);
      setSelectedCapability(null);
      setSelectedMethod(null);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('提交失败: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <h2 className="text-sm font-medium text-gray-500 mb-3">📝 快速记录</h2>

      {/* 润色预览 */}
      {showPolishedPreview ? (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">✨ AI润色结果：</div>
          {/* 内容部分 */}
          <div className="p-3 bg-indigo-50 rounded-lg text-sm text-gray-700 mb-2">
            {parseTagsFromPolished(polishedContent).content}
          </div>
          {/* AI生成的标签 */}
          <div className="flex gap-1 mb-2 flex-wrap items-center">
            <span className="text-xs text-gray-500">AI标签：</span>
            {selectedDomain && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">
                #{selectedDomain}
              </span>
            )}
            {selectedCapability && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                #{selectedCapability}
              </span>
            )}
            {selectedMethod && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                #{selectedMethod}
              </span>
            )}
            {/* 缺少能力标签警告 */}
            {selectedDomain && !selectedCapability && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">
                ⚠️ 缺少能力标签，请手动选择
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:bg-indigo-300"
              onClick={() => handleSubmit(parseTagsFromPolished(polishedContent).content)}
              disabled={isSubmitting || !selectedDomain || !selectedCapability}
            >
              {isSubmitting ? '发送中...' : '发送润色结果'}
            </button>
            <button
              className="px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-sm"
              onClick={handleUsePolished}
            >
              继续编辑
            </button>
            <button
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
              onClick={handleCancelPolish}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="输入随手记内容..."
            rows={2}
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
            {/* 润色按钮 */}
            {isAIConfigured() && (
              <button
                className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                onClick={handlePolish}
                disabled={isPolishing || !content.trim()}
              >
                {isPolishing ? '润色中...' : '✨ 润色'}
              </button>
            )}

            <button
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
              onClick={() => setShowTagPicker(!showTagPicker)}
            >
              🏷️ {showTagPicker ? '收起' : '标签'}
            </button>

            <button
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? '发送中...' : '发送'}
            </button>
          </div>

          {/* 标签选择器 */}
          {showTagPicker && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              {/* 第一层：领域层 */}
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <span className="text-red-500">*</span> 领域（必选1个）
                </div>
                <div className="flex flex-wrap gap-1">
                  {TAG_SYSTEM.domain.map(tag => (
                    <button
                      key={tag}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedDomain === tag
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200'
                      }`}
                      onClick={() => setSelectedDomain(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 第二层：能力层 */}
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <span className="text-orange-500">*</span> 能力（必选1个）
                  {!selectedDomain && <span className="text-gray-400 ml-1">→ 先选择领域</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {availableCapabilities.length > 0 ? (
                    availableCapabilities.map((tag: string) => (
                      <button
                        key={tag}
                        className={`px-2 py-1 rounded-full text-xs transition-colors ${
                          selectedCapability === tag
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
                        }`}
                        onClick={() => setSelectedCapability(tag)}
                      >
                        #{tag}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">请先选择领域</span>
                  )}
                </div>
              </div>

              {/* 第三层：方法层 */}
              <div>
                <div className="text-xs text-gray-500 mb-1">方法（可选0-1个）</div>
                <div className="flex flex-wrap gap-1">
                  {TAG_SYSTEM.method.map(tag => (
                    <button
                      key={tag}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedMethod === tag
                          ? 'bg-gray-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                      onClick={() => setSelectedMethod(selectedMethod === tag ? null : tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 规则提示 */}
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                规则：1领域 + 1能力 + 0-1方法
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}