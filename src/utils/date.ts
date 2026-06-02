const SHANGHAI_TZ = 'Asia/Shanghai';

const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHANGHAI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const shanghaiTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: SHANGHAI_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getDiaryPath(date: Date, basePath: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = getDateString(date);

  return `${basePath}/${year}/${month.toString().padStart(2, '0')}.${monthNames[month - 1]}/${day}.md`;
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getShanghaiDateString(date = new Date()): string {
  const parts = shanghaiDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getShanghaiCalendarDate(): Date {
  return new Date(`${getShanghaiDateString()}T12:00:00`);
}

export function getShanghaiYearMonth(): { year: string; month: string } {
  const [year, month] = getShanghaiDateString().split('-');
  return {
    year,
    month
  };
}

export function getWeekdayName(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[date.getDay()];
}

export function getTimestamp(): string {
  return shanghaiTimeFormatter.format(new Date());
}

export function isToday(dateStr: string): boolean {
  return dateStr === getShanghaiDateString();
}
