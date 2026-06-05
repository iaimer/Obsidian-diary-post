import { useState, useEffect } from 'react';
import { useDiaryStore } from '../../stores/diaryStore';
import { TagConfig, DEFAULT_TAG_CONFIG, TagDomain, TagMethod, TagTopic } from '../../types/tagTypes';
import { generateId, stripHash } from '../../config/tagSystem';
import { fetchTagConfig, saveTagConfig } from '../../services/tagSync';

interface Props {
  onDirtyChange?: (dirty: boolean) => void;
}

type Tab = 'domains' | 'methods' | 'preview';

export function SettingsTags({ onDirtyChange }: Props) {
  const tagConfig = useDiaryStore(state => state.tagConfig);
  const setTagConfig = useDiaryStore(state => state.setTagConfig);
  const remoteMode = useDiaryStore(state => state.remoteMode);
  const [draft, setDraft] = useState<TagConfig>(() => JSON.parse(JSON.stringify(tagConfig)));
  const [tab, setTab] = useState<Tab>('domains');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { config } = await fetchTagConfig();
      if (config) {
        setTagConfig(config);
        setDraft(JSON.parse(JSON.stringify(config)));
      }
    };
    load();
  }, [setTagConfig]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(tagConfig);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const handleSave = async () => {
    const validationError = validateTagConfig(draft);
    if (validationError) {
      setSyncStatus('error');
      setSyncError(validationError);
      return;
    }

    setSyncStatus('saving');
    setSyncError('');

    if (!remoteMode) {
      setTagConfig(draft);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
      return;
    }

    const { success, error } = await saveTagConfig(draft);
    if (success) {
      setTagConfig(draft);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } else {
      setSyncStatus('error');
      setSyncError(error || '保存失败，请稍后重试');
    }
  };

  const handleReset = () => {
    if (confirm('确定要恢复默认标签配置吗？自定义标签将全部丢失。')) {
      setDraft(JSON.parse(JSON.stringify(DEFAULT_TAG_CONFIG)));
    }
  };

  const addDomain = () => {
    const name = normalizeTagName(prompt('输入新领域名称：'));
    if (!name) return;
    if (hasTagName(draft, name)) return alert('该标签名称已存在');
    const topicName = normalizeTagName(prompt('输入该领域的第一个主题名称：'));
    if (!topicName) return alert('每个领域至少需要 1 个主题');
    if (hasTagName(draft, topicName)) return alert('该标签名称已存在');
    const description = prompt('领域说明（可选）：')?.trim() || undefined;
    const topicDescription = prompt('主题说明（可选）：')?.trim() || undefined;
    setDraft({
      ...draft,
      domains: [...draft.domains, {
        id: generateId(),
        name,
        description,
        order: draft.domains.length,
        topics: [{ id: generateId(), name: topicName, description: topicDescription, order: 0 }]
      }]
    });
  };

  const editDomain = (id: string) => {
    const domain = draft.domains.find(d => d.id === id);
    if (!domain) return;
    const name = normalizeTagName(prompt('编辑领域名称：', domain.name));
    if (!name) return;
    if (name !== domain.name && hasTagName(draft, name)) return alert('该标签名称已存在');
    const description = prompt('领域说明（可选）：', domain.description || '')?.trim() || undefined;
    setDraft({
      ...draft,
      domains: draft.domains.map(d => d.id === id ? { ...d, name, description } : d)
    });
  };

  const deleteDomain = (id: string) => {
    if (draft.domains.length <= 1) {
      alert('至少保留 1 个领域');
      return;
    }
    const domain = draft.domains.find(d => d.id === id);
    if (!domain || !confirm(`确定要删除领域「${domain.name}」及其全部主题吗？`)) return;
    setDraft({ ...draft, domains: draft.domains.filter(d => d.id !== id) });
  };

  const moveDomain = (id: string, dir: -1 | 1) => {
    const idx = draft.domains.findIndex(d => d.id === id);
    const to = idx + dir;
    if (to < 0 || to >= draft.domains.length) return;
    const arr = [...draft.domains];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setDraft({ ...draft, domains: arr.map((d, i) => ({ ...d, order: i })) });
  };

  const addTopic = (domainId: string) => {
    const name = normalizeTagName(prompt('输入新主题名称：'));
    if (!name) return;
    const domain = draft.domains.find(d => d.id === domainId);
    if (!domain) return;
    if (hasTagName(draft, name)) return alert('该标签名称已存在');
    const description = prompt('主题说明（可选）：')?.trim() || undefined;
    setDraft({
      ...draft,
      domains: draft.domains.map(d => d.id === domainId ? {
        ...d, topics: [...d.topics, { id: generateId(), name, description, order: d.topics.length }]
      } : d)
    });
    setExpandedDomain(domainId);
  };

  const editTopic = (domainId: string, topicId: string) => {
    const domain = draft.domains.find(d => d.id === domainId);
    const topic = domain?.topics.find(t => t.id === topicId);
    if (!topic) return;
    const name = normalizeTagName(prompt('编辑主题名称：', topic.name));
    if (!name) return;
    if (name !== topic.name && hasTagName(draft, name)) return alert('该标签名称已存在');
    const description = prompt('主题说明（可选）：', topic.description || '')?.trim() || undefined;
    setDraft({
      ...draft,
      domains: draft.domains.map(d => d.id === domainId ? {
        ...d, topics: d.topics.map(t => t.id === topicId ? { ...t, name, description } : t)
      } : d)
    });
  };

  const deleteTopic = (domainId: string, topicId: string) => {
    const domain = draft.domains.find(d => d.id === domainId);
    if (!domain) return;
    if (domain.topics.length <= 1) {
      alert('每个领域至少保留 1 个主题');
      return;
    }
    const topic = domain.topics.find(t => t.id === topicId);
    if (!topic || !confirm(`确定要删除主题「${topic.name}」吗？`)) return;
    setDraft({
      ...draft,
      domains: draft.domains.map(d => d.id === domainId ? {
        ...d, topics: d.topics.filter(t => t.id !== topicId)
      } : d)
    });
  };

  const moveTopic = (domainId: string, topicId: string, dir: -1 | 1) => {
    const domain = draft.domains.find(d => d.id === domainId);
    if (!domain) return;
    const idx = domain.topics.findIndex(t => t.id === topicId);
    const to = idx + dir;
    if (to < 0 || to >= domain.topics.length) return;
    const arr = [...domain.topics];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setDraft({
      ...draft,
      domains: draft.domains.map(d => d.id === domainId ? { ...d, topics: arr.map((t, i) => ({ ...t, order: i })) } : d)
    });
  };

  const addMethod = () => {
    const name = normalizeTagName(prompt('输入新方法名称：'));
    if (!name) return;
    if (hasTagName(draft, name)) return alert('该标签名称已存在');
    const description = prompt('方法说明（可选）：')?.trim() || undefined;
    setDraft({
      ...draft,
      methods: [...draft.methods, { id: generateId(), name, description, order: draft.methods.length }]
    });
  };

  const editMethod = (id: string) => {
    const method = draft.methods.find(m => m.id === id);
    if (!method) return;
    const name = normalizeTagName(prompt('编辑方法名称：', method.name));
    if (!name) return;
    if (name !== method.name && hasTagName(draft, name)) return alert('该标签名称已存在');
    const description = prompt('方法说明（可选）：', method.description || '')?.trim() || undefined;
    setDraft({
      ...draft,
      methods: draft.methods.map(m => m.id === id ? { ...m, name, description } : m)
    });
  };

  const deleteMethod = (id: string) => {
    const method = draft.methods.find(m => m.id === id);
    if (!method || !confirm(`确定要删除方法「${method.name}」吗？`)) return;
    setDraft({ ...draft, methods: draft.methods.filter(m => m.id !== id) });
  };

  const moveMethod = (id: string, dir: -1 | 1) => {
    const idx = draft.methods.findIndex(m => m.id === id);
    const to = idx + dir;
    if (to < 0 || to >= draft.methods.length) return;
    const arr = [...draft.methods];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setDraft({ ...draft, methods: arr.map((m, i) => ({ ...m, order: i })) });
  };

  const totalTopics = draft.domains.reduce((s, d) => s + d.topics.length, 0);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['domains', 'methods', 'preview'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {t === 'domains' ? '领域' : t === 'methods' ? '方法' : '预览'}
            </button>
          ))}
        </div>

        {tab === 'domains' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {draft.domains.map(domain => (
              <div key={domain.id}>
                <div className="flex items-center justify-between px-4 py-3 min-h-[44px]">
                  <button
                    onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span className={`text-gray-400 transition-transform ${expandedDomain === domain.id ? 'rotate-90' : ''}`}>▶</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{domain.name}</span>
                    <span className="text-xs text-gray-400">{domain.topics.length} 主题</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <MoveBtn onClick={() => moveDomain(domain.id, -1)} label="上移" />
                    <MoveBtn onClick={() => moveDomain(domain.id, 1)} label="下移" />
                    <ActionBtn onClick={() => editDomain(domain.id)} label="编辑">✎</ActionBtn>
                    <ActionBtn
                      onClick={() => deleteDomain(domain.id)}
                      label={draft.domains.length <= 1 ? '至少保留一个' : '删除'}
                      className={draft.domains.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-600 dark:hover:text-red-400'}
                    >✕</ActionBtn>
                  </div>
                </div>
                {expandedDomain === domain.id && (
                  <div className="pb-3 pl-8 pr-4 space-y-1">
                    {domain.topics.map(topic => (
                      <div key={topic.id} className="flex items-center justify-between py-1.5 min-h-[36px]">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{topic.name}</span>
                        <div className="flex items-center gap-1">
                          <MoveBtn onClick={() => moveTopic(domain.id, topic.id, -1)} label="上移" small />
                          <MoveBtn onClick={() => moveTopic(domain.id, topic.id, 1)} label="下移" small />
                          <ActionBtn onClick={() => editTopic(domain.id, topic.id)} label="编辑" small>✎</ActionBtn>
                          <ActionBtn
                            onClick={() => deleteTopic(domain.id, topic.id)}
                            label={domain.topics.length <= 1 ? '至少保留一个' : '删除'}
                            small
                            className={domain.topics.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-600 dark:hover:text-red-400'}
                          >✕</ActionBtn>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addTopic(domain.id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline py-1"
                    >
                      + 添加主题
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-3">
              <button
                onClick={addDomain}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + 添加领域
              </button>
            </div>
          </div>
        )}

        {tab === 'methods' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {draft.methods.map(method => (
              <div key={method.id} className="flex items-center justify-between px-4 py-3 min-h-[44px]">
                <span className="text-sm text-gray-700 dark:text-gray-200">{method.name}</span>
                <div className="flex items-center gap-1">
                  <MoveBtn onClick={() => moveMethod(method.id, -1)} label="上移" />
                  <MoveBtn onClick={() => moveMethod(method.id, 1)} label="下移" />
                  <ActionBtn onClick={() => editMethod(method.id)} label="编辑">✎</ActionBtn>
                  <ActionBtn
                    onClick={() => deleteMethod(method.id)}
                    label="删除"
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >✕</ActionBtn>
                </div>
              </div>
            ))}
            <div className="px-4 py-3">
              <button onClick={addMethod} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                + 添加方法
              </button>
            </div>
          </div>
        )}

        {tab === 'preview' && (
          <div className="px-4 py-3 space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              共 <strong>{draft.domains.length}</strong> 个领域 / <strong>{totalTopics}</strong> 个主题 / <strong>{draft.methods.length}</strong> 个方法
            </p>
            {draft.domains.map(domain => (
              <div key={domain.id}>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  #{domain.name}
                  {domain.description && <span className="text-xs text-gray-400 font-normal"> {domain.description}</span>}
                </p>
                <div className="text-xs text-gray-400 dark:text-gray-500 pl-3 space-y-0.5">
                  {domain.topics.map(t => (
                    <div key={t.id}># {t.name}{t.description ? <span> — {t.description}</span> : null}</div>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">方法</p>
                <div className="text-xs text-gray-400 dark:text-gray-500 pl-3 space-y-0.5">
                  {draft.methods.map(m => (
                    <div key={m.id}># {m.name}{m.description ? <span> — {m.description}</span> : null}</div>
                  ))}
                </div>
            </div>
          </div>
        )}
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={syncStatus === 'saving'}
          className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
        >
          {syncStatus === 'saving' ? '保存中...' : '保存修改'}
        </button>
      )}
      {syncStatus === 'error' && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center">{syncError}</p>
      )}

      <button
        onClick={handleReset}
        className="w-full px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
      >
        恢复默认
      </button>
    </div>
  );
}

function normalizeTagName(value: string | null): string {
  return stripHash(value?.trim() || '').trim();
}

function getTagNames(config: TagConfig): string[] {
  return [
    ...config.domains.map(domain => domain.name),
    ...config.domains.flatMap(domain => domain.topics.map(topic => topic.name)),
    ...config.methods.map(method => method.name)
  ];
}

function hasTagName(config: TagConfig, name: string): boolean {
  return getTagNames(config).includes(name);
}

function validateNames(items: Array<TagDomain | TagTopic | TagMethod>, label: string, seen: Set<string>): string | null {
  for (const item of items) {
    const name = normalizeTagName(item.name);
    if (!name) return `${label}名称不能为空`;
    if (name !== item.name) return `${label}「${item.name}」不能以 # 开头`;
    if (seen.has(name)) return `标签「${name}」重复，请保持全局唯一`;
    seen.add(name);
  }
  return null;
}

function validateTagConfig(config: TagConfig): string | null {
  if (config.domains.length === 0) return '至少保留 1 个领域';

  const seen = new Set<string>();
  const domainError = validateNames(config.domains, '领域', seen);
  if (domainError) return domainError;

  let topicCount = 0;
  for (const domain of config.domains) {
    if (domain.topics.length === 0) return `领域「${domain.name}」至少需要 1 个主题`;
    topicCount += domain.topics.length;
    const topicError = validateNames(domain.topics, '主题', seen);
    if (topicError) return topicError;
  }
  if (topicCount === 0) return '至少保留 1 个主题';

  return validateNames(config.methods, '方法', seen);
}

function MoveBtn({ onClick, label, small }: { onClick: () => void; label: string; small?: boolean }) {
  return (
    <ActionBtn onClick={onClick} label={label} small={small}>
      {label === '上移' ? '▲' : '▼'}
    </ActionBtn>
  );
}

function ActionBtn({ onClick, label, children, small, className = '' }: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  small?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ${small ? 'text-[10px] w-5 h-5' : 'text-xs w-6 h-6'} flex items-center justify-center rounded ${className}`}
    >
      {children}
    </button>
  );
}
