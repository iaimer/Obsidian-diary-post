export interface DiaryMeta {
  date: string; // YYYY-MM-DD
  hasImages: boolean;
  firstImage?: string; // 图片文件名
  quickNotesCount: number;
  exists: boolean; // 文件是否存在
}

export interface MonthData {
  year: number;
  month: number;
  diaries: DiaryMeta[];
}