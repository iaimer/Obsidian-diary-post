import { Router } from 'express';
import { readDiary, writeDiary, getDateString, getDiaryPath } from '../services/vault.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config/index.js';
import { parseDiary, appendToSection } from '../services/markdown.js';
import { createObsidianDiaryContent } from '../services/template.js';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

const router = Router();

router.get('/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const content = readDiary(date);
    const entry = parseDiary(content);
    entry.date = dateStr;
    
    res.json(entry);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post('/quick-note', async (req, res) => {
  try {
    const { content, tags } = req.body;
    const date = new Date();
    const time = date.toLocaleTimeString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const tagStr = tags?.length > 0 ? ' ' + tags.map((t: string) => `#${t}`).join(' ') : '';
    const formatted = `- **${time}** ${content}${tagStr}`;
    
    let originalContent: string;
    try {
      originalContent = readDiary(date);
    } catch {
      originalContent = createObsidianDiaryContent(date);
      writeDiary(date, originalContent);
    }
    
    const updated = appendToSection(originalContent, 'quick_notes', formatted);
    writeDiary(date, updated);
    
    res.json({ success: true, content: formatted });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/habit', async (req, res) => {
  try {
    const { water, steps, reading, language, supplements } = req.body;
    const date = new Date();
    
    let originalContent: string;
    try {
      originalContent = readDiary(date);
    } catch {
      originalContent = createObsidianDiaryContent(date);
    }
    
    const waterEmoji = '🥤';
    const waterCount = Math.floor(water / 250);
    const waterStr = waterCount > 0 
      ? `- 🥛${waterEmoji.repeat(waterCount)}饮水 ${water} mL` 
      : `- 🥛饮水 ${water} mL`;
    
    const habits = [
      waterStr,
      `- 🧘 运动/拉伸/快走 ${steps} 步`,
      `- [${reading ? 'x' : ' '}] 📖 阅读/亲子共读`,
      `- [${language ? 'x' : ' '}] 🇬🇧 学语言`,
      `- [${supplements ? 'x' : ' '}] 💊 鱼油/植物甾醇`
    ];
    
    const updated = updateHabitsSection(originalContent, habits);
    writeDiary(date, updated);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/happiness', async (req, res) => {
  try {
    const { content } = req.body;
    const date = new Date();
    
    let originalContent: string;
    try {
      originalContent = readDiary(date);
    } catch {
      originalContent = createObsidianDiaryContent(date);
      writeDiary(date, originalContent);
    }
    
    const updated = appendToSection(originalContent, 'happiness', `> ${content}`);
    writeDiary(date, updated);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/reflection', async (req, res) => {
  try {
    const { content } = req.body;
    const date = new Date();
    
    let originalContent: string;
    try {
      originalContent = readDiary(date);
    } catch {
      originalContent = createObsidianDiaryContent(date);
      writeDiary(date, originalContent);
    }
    
    const updated = appendToSection(originalContent, 'reflection', `- ${content}`);
    writeDiary(date, updated);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

function updateHabitsSection(content: string, habits: string[]): string {
  const lines = content.split('\n');
  const header = '## 🏃 习惯打卡';
  
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(header)) {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) return content;
  
  const allHeaders = ['## 🏃 习惯打卡', '## ✍️ 随手记', '## ✨ 每日小确幸', '## 😰 焦虑时刻', '### 💡 觉察与迭代'];
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (allHeaders.some(h => lines[i].startsWith(h))) {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) endIndex = lines.length;
  
  const before = lines.slice(0, startIndex + 1);
  const after = lines.slice(endIndex);
  
  return [...before, ...habits, '', ...after].join('\n');
}

router.get('/image/:year/:imageName', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const imageName = req.params.imageName;
    const month = req.query.month ? parseInt(req.query.month as string) : null;
    
    let imagePath: string | null = null;
    
    if (month) {
      const monthDirName = `${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`;
      const monthAssetsPath = join(
        config.vaultPath,
        'workspace',
        '生活',
        '日记',
        year.toString(),
        monthDirName,
        'assets',
        imageName
      );
      if (existsSync(monthAssetsPath)) {
        imagePath = monthAssetsPath;
      }
    }
    
    if (!imagePath) {
      const yearAssetsPath = join(
        config.vaultPath,
        'workspace',
        '生活',
        '日记',
        year.toString(),
        'assets',
        imageName
      );
      if (existsSync(yearAssetsPath)) {
        imagePath = yearAssetsPath;
      }
    }
    
    if (!imagePath) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const imageBuffer = readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = getMimeType(imageName);
    
    res.json({
      data: `data:${mimeType};base64,${base64}`,
      mimeType
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif'
  };
  return mimeTypes[ext || ''] || 'image/jpeg';
}

export default router;