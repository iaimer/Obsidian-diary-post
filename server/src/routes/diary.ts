import { Router } from 'express';
import { readDiary, writeDiary, getDateString, getDiaryPath, existsDiary, getAssetsDir } from '../services/vault.js';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import config from '../config/index.js';
import { parseDiary, appendToSection } from '../services/markdown.js';
import { createObsidianDiaryContent } from '../services/template.js';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

const router = Router();

// 检查日记是否存在
router.get('/exists/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const exists = existsDiary(date);
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建日记
router.post('/create', async (req, res) => {
  try {
    const { date } = req.body;
    let diaryDate: Date;
    
    if (date) {
      const [year, month, day] = date.split('-');
      diaryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      diaryDate = new Date();
    }
    
    // 如果已存在，返回错误
    if (existsDiary(diaryDate)) {
      return res.status(400).json({ error: '日记已存在' });
    }
    
    const content = createObsidianDiaryContent(diaryDate);
    writeDiary(diaryDate, content);
    
    res.json({ success: true, date: getDateString(diaryDate) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

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
      return res.status(404).json({ error: '日记文件不存在，请先创建' });
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
      return res.status(404).json({ error: '日记文件不存在，请先创建' });
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
      return res.status(404).json({ error: '日记文件不存在，请先创建' });
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
      return res.status(404).json({ error: '日记文件不存在，请先创建' });
    }
    
    const updated = appendToSection(originalContent, 'reflection', `- ${content}`);
    writeDiary(date, updated);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 上传图片（远程模式）：接收 base64 压缩图片，保存到 assets 并追加 WikiLink
router.post('/image/upload', async (req, res) => {
  try {
    const { date: dateStr, imageData } = req.body;

    const [year, monthNum, day] = dateStr.split('-').map(Number);
    const uploadDate = new Date(year, monthNum - 1, day);

    const assetsDir = getAssetsDir(uploadDate);
    if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, { recursive: true });
    }

    // 扫描已有文件确定序号
    const dayPrefix = `${year}${monthNum.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    const prefix = `Image-${dayPrefix}-`;

    let maxSeq = 0;
    if (existsSync(assetsDir)) {
      const files = readdirSync(assetsDir);
      for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith('.jpg')) {
          const seqStr = file.slice(prefix.length, -4);
          const seq = parseInt(seqStr);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    }

    const seq = (maxSeq + 1).toString().padStart(3, '0');
    const filename = `${prefix}${seq}.jpg`;

    // 解码 base64
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 写入图片文件
    writeFileSync(join(assetsDir, filename), buffer);

    // 追加 WikiLink 到日记
    let originalContent: string;
    try {
      originalContent = readDiary(uploadDate);
    } catch {
      return res.status(404).json({ error: '日记文件不存在，请先创建' });
    }

    const updated = appendToSection(originalContent, 'images', `![[${filename}]]`);
    writeDiary(uploadDate, updated);

    res.json({ success: true, filename });
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