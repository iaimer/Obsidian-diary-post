import { TagConfig } from '../types/tagTypes';
import { useDiaryStore } from '../stores/diaryStore';

export async function fetchTagConfig(): Promise<{ config: TagConfig | null; error?: string }> {
  const state = useDiaryStore.getState();
  const baseUrl = state.apiUrl?.replace(/\/api\/v1\/?$/, '');
  const token = state.apiToken;
  if (!baseUrl || !token) return { config: null, error: '远程 API 未配置' };

  try {
    const response = await fetch(`${baseUrl}/api/v1/settings/tags`, {
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 401) return { config: null, error: 'Token 无效' };
      return { config: null, error: `获取失败 (${response.status})` };
    }

    const data = await response.json();
    return { config: data as TagConfig };
  } catch (error) {
    return { config: null, error: '连接失败: ' + (error as Error).message };
  }
}

export async function saveTagConfig(config: TagConfig): Promise<{ success: boolean; error?: string }> {
  const state = useDiaryStore.getState();
  const baseUrl = state.apiUrl?.replace(/\/api\/v1\/?$/, '');
  const token = state.apiToken;
  if (!baseUrl || !token) return { success: false, error: '远程 API 未配置' };

  try {
    const response = await fetch(`${baseUrl}/api/v1/settings/tags`, {
      method: 'PUT',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || `保存失败 (${response.status})` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: '连接失败: ' + (error as Error).message };
  }
}
