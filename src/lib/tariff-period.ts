import type { Tariff } from '@/types';

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function isPolishPublicHoliday(date: Date) {
  const fixed = new Set(['0-1', '0-6', '4-1', '4-3', '7-15', '10-1', '10-11', '11-25', '11-26']);
  if (fixed.has(`${date.getMonth()}-${date.getDate()}`)) return true;
  const easter = easterSunday(date.getFullYear());
  return sameDay(date, easter) || sameDay(date, addDays(easter, 1)) || sameDay(date, addDays(easter, 60));
}

export function getKrakowTariffPeriod(date: Date): 'day' | 'night' {
  const hour = date.getHours();
  return hour < 6 || hour >= 22 || date.getDay() === 0 || isPolishPublicHoliday(date) ? 'night' : 'day';
}

export function resolveStartingTariff(tariffs: Tariff[], selected: Tariff, date: Date) {
  if (selected.kind !== 'zoned' || !selected.groupId || !selected.zone) return selected;
  const period = getKrakowTariffPeriod(date);
  return tariffs.find((tariff) => tariff.groupId === selected.groupId && tariff.zone === selected.zone && tariff.period === period) ?? selected;
}
