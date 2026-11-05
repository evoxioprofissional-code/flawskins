// Datas do módulo E-Sports. Tudo é armazenado/trafegado em UTC (ISO-8601) e
// só é convertido para o fuso do usuário na apresentação.
// Módulo puro (sem imports) — testável com `node --test`.

export const DEFAULT_TZ = "America/Sao_Paulo";

/** Retorna o fuso se for um IANA válido; senão, o padrão (São Paulo). */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

type Ymd = { y: number; m: number; d: number };

function partsIn(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(date)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Diferença (ms) entre o relógio local do fuso e o UTC naquele instante. */
function offsetMs(instant: number, tz: string): number {
  const p = partsIn(new Date(instant), tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Dia civil (no fuso) de um instante. */
export function ymdIn(date: Date, tz: string): Ymd {
  const p = partsIn(date, tz);
  return { y: p.year, m: p.month, d: p.day };
}

/** Instante UTC da meia-noite do dia `ymd` no fuso (trata horário de verão). */
export function startOfDayUtc(ymd: Ymd, tz: string): Date {
  const guess = Date.UTC(ymd.y, ymd.m - 1, ymd.d);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz); // segunda passada corrige transições de DST
  return new Date(t);
}

/**
 * Janela [início, fim] em UTC do dia `now + offsetDays` no fuso.
 * Ex.: offsetDays=0 → "hoje" em São Paulo.
 */
export function dayRangeUtc(now: Date, tz: string, offsetDays = 0): { start: Date; end: Date } {
  const today = ymdIn(now, tz);
  const base = new Date(Date.UTC(today.y, today.m - 1, today.d + offsetDays));
  const day = { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1, d: base.getUTCDate() };
  const next = new Date(Date.UTC(day.y, day.m - 1, day.d + 1));
  const start = startOfDayUtc(day, tz);
  const end = new Date(
    startOfDayUtc({ y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() }, tz).getTime() - 1000,
  );
  return { start, end };
}

/** Chave "AAAA-MM-DD" do dia no fuso — usada para agrupar partidas. */
export function dayKey(iso: string, tz: string): string {
  const { y, m, d } = ymdIn(new Date(iso), tz);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Diferença em dias civis entre dois instantes, no fuso. */
export function calendarDayDiff(iso: string, now: Date, tz: string): number {
  const a = ymdIn(new Date(iso), tz);
  const b = ymdIn(now, tz);
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000);
}

export function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatShortDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

/** "Hoje", "Amanhã", "Ontem" ou "qua., 05/11". */
export function relativeDayLabel(iso: string, now: Date, tz: string): string {
  const diff = calendarDayDiff(iso, now, tz);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "short" }).format(new Date(iso));
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatShortDate(iso, tz)}`;
}

/** Rótulo curto do fuso (ex.: "BRT", "GMT-3"). */
export function timeZoneLabel(tz: string, at = new Date()): string {
  const part = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? tz;
}
