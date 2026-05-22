export interface DiaryMeta {
  date: string; // YYYY-MM-DD
  hasImages: boolean;
  firstImage?: string; // 图片文件名
  quickNotesCount: number;
  exists: boolean; // 文件是否存在
  hasContent: boolean; // 是否有随手记/小确幸/觉察/焦虑时刻的内容
}

export interface MonthData {
  year: number;
  month: number;
  diaries: DiaryMeta[];
}