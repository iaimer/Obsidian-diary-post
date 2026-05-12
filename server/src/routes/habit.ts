import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config/index.js';
import { readDiary, listMonthDiaries, getDiaryPath } from '../services/vault.js';
import { parseDiary } from '../services/markdown.js';

const router = Router();

router.get('/habit', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats: any[] = [];
    
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      try {
        const content = readDiary(date);
        const entry = parseDiary(content);
        const habitData = parseHabitLines(entry.sections.habits);
        
        stats.push({
          date: getDateString(date),
          ...habitData
        });
      } catch {
        stats.push({
          date: getDateString(date),
          water: 0,
          steps: 0,
          reading: false,
          language: false,
          supplements: false
        });
      }
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

function parseHabitLines(lines: string[]): any {
  const data = {
    water: 0,
    steps: 0,
    reading: false,
    language: false,
    supplements: false
  };
  
  for (const line of lines) {
    if (line.includes('饮水')) {
      const match = line.match(/饮水\s+(\d+)\s*mL/);
      if (match) data.water = parseInt(match[1], 10);
    }
    
    if (line.includes('步') && line.includes('运动')) {
      const match = line.match(/(\d+)\s*步/);
      if (match) data.steps = parseInt(match[1], 10);
    }
    
    if (line.includes('📖')) {
      data.reading = line.includes('[x]');
    }
    
    if (line.includes('🇬🇧') || line.includes('学语言')) {
      data.language = line.includes('[x]');
    }
    
    if (line.includes('💊') || line.includes('鱼油')) {
      data.supplements = line.includes('[x]');
    }
  }
  
  return data;
}

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default router;