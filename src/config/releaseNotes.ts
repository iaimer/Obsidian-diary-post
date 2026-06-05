export interface ReleaseNoteSection {
  title: string;
  items: string[];
}

export const RELEASE_NOTES: Record<string, ReleaseNoteSection[]> = {
  '0.14.1': [
    {
      title: '日记条目编辑与删除',
      items: [
        '日记条目改为显式 ⋯ 入口，避免长按误触发。',
        '手机端编辑/删除菜单改为贴近 Dock 的底部操作面板。',
        '编辑弹窗支持修改正文和标签，并按完整条目块替换。',
        '删除多自然段条目时会同步清理续行。',
        '图片右上角小号 ✕ 可直接删除，并同步清理同日期 assets 原图。',
        '修复本地模式编辑成功后仍误报条目未找到的问题。'
      ]
    }
  ]
};

export function getReleaseNotes(version: string): ReleaseNoteSection[] {
  return RELEASE_NOTES[version] ?? [];
}
