const sectionHeaders: Record<string, string> = {
  habits: '## 🏃 习惯打卡',
  quick_notes: '## ✍️ 随手记 & 灵感',
  happiness: '## ✨ 每日小确幸',
  anxiety: '## 😰 焦虑时刻',
  reflection: '### 💡 觉察与迭代',
  lizhi_says: '### 🧠 荔枝喵说',
  tomorrow: '### 🌙 明日寄语',
  images: '## 📸 影像记录'
};

export function parseDiary(content: string) {
  const lines = content.split('\n');
  
  let frontmatter: Record<string, any> = {};
  let startIndex = 0;
  
  if (lines[0] === '---') {
    const endIndex = lines.indexOf('---', 1);
    if (endIndex !== -1) {
      const yamlContent = lines.slice(1, endIndex).join('\n');
      frontmatter = parseYaml(yamlContent);
      startIndex = endIndex + 1;
    }
  }
  
  let title = '';
  let quote = '';
  
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      title = lines[i].slice(2);
      startIndex = i + 1;
      break;
    }
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].startsWith('> [!quote]')) {
      quote = lines[i].slice(11).trim();
      startIndex = i + 1;
      break;
    }
  }
  
  const sections = {
    habits: [] as string[],
    quick_notes: [] as string[],
    happiness: [] as string[],
    anxiety: [] as string[],
    reflection: [] as string[],
    lizhi_says: [] as string[],
    tomorrow: [] as string[],
    images: [] as string[]
  };
  
  let currentSection: keyof typeof sections | null = null;
  
  const sectionKeys = Object.keys(sectionHeaders) as (keyof typeof sections)[];
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    for (const section of sectionKeys) {
      const header = sectionHeaders[section];
      if (line.startsWith(header)) {
        currentSection = section;
        break;
      }
    }
    
    if (Object.values(sectionHeaders).some(h => line.startsWith(h))) {
      continue;
    }
    
    if (currentSection && line.trim()) {
      if (line.trim() === '---') continue;
      if (line.startsWith('> [!') && !line.startsWith('> [!quote]')) continue;
      if (line.startsWith('## 📈 每日复盘')) continue;
      sections[currentSection].push(line);
    }
  }
  
  return {
    date: '',
    frontmatter,
    title,
    quote,
    sections,
    raw: content
  };
}

function parseYaml(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    
    if (value.startsWith('-')) {
      result[key] = [value.slice(1).trim().replace(/'/g, '').replace(/"/g, '')];
    } else {
      result[key] = value.replace(/'/g, '').replace(/"/g, '');
    }
  }
  
  return result;
}

export function appendToSection(content: string, section: string, newLine: string): string {
  const lines = content.split('\n');
  const header = sectionHeaders[section];
  
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(header)) {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) return content;
  
  // 如果是随手记区块，删除模板中的示例行
  if (section === 'quick_notes') {
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].includes('- **HH:MM** 内容 #标签')) {
        lines.splice(i, 1);
        break;
      }
    }
  }
  
  const allHeaders = Object.values(sectionHeaders);
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (allHeaders.some(h => lines[i].startsWith(h))) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) endIndex = lines.length;
  
  let insertIndex = endIndex;
  
  while (insertIndex > startIndex + 1) {
    const prevLine = lines[insertIndex - 1];
    if (prevLine.trim() === '' || prevLine.trim() === '---') {
      insertIndex--;
    } else {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, newLine);
  
  return lines.join('\n');
}