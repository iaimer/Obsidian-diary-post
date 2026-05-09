// 月份名称映射
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// 生成Obsidian日记路径
// 格式：YYYY/序号.英文月份名/YYYY-MM-DD.md
export function getDiaryPath(date: Date, basePath: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = getDateString(date);

  return `${basePath}/${year}/${month.toString().padStart(2, '0')}.${monthNames[month - 1]}/${day}.md`;
}

// 获取日期字符串 YYYY-MM-DD（使用本地时间，非UTC）
export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 获取中文星期名
export function getWeekdayName(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
}

// 获取时间戳 HH:MM（Asia/Shanghai时区）
export function getTimestamp(): string {
  return new Date().toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// 检查是否是今天
export function isToday(dateStr: string): boolean {
  return dateStr === getDateString(new Date());
}

// 解析日期字符串
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr);
}