export function dotVersionToDash(s: string): string {
  return s.replace(/(\d+)\.(\d+)/g, "$1-$2");
}

export function extractDate8(s: string): { date: string; rest: string } | null {
  const m = s.match(/(^|[-_])(\d{8})($|[-_])/);
  if (!m || m[2] === undefined) return null;
  const year = parseInt(m[2].slice(0, 4));
  if (year < 2020 || year > 2030) return null;
  const start = (m.index ?? 0) + (m[1]?.length ?? 0);
  const end = start + 8;
  const rest = s.slice(0, start > 0 ? start - 1 : start) + s.slice(end);
  return { date: m[2], rest: rest.replace(/^-|-$/g, "") };
}

export function extractDateISO(s: string): { date: string; rest: string } | null {
  const m = s.match(/(^|[-_])(\d{4})-(\d{2})-(\d{2})($|[-_])/);
  if (!m || m[2] === undefined || m[3] === undefined || m[4] === undefined) return null;
  const year = parseInt(m[2]);
  if (year < 2020 || year > 2030) return null;
  const date = `${m[2]}${m[3]}${m[4]}`;
  const full = `${m[2]}-${m[3]}-${m[4]}`;
  const start = (m.index ?? 0) + (m[1]?.length ?? 0);
  const end = start + full.length;
  const rest = s.slice(0, start > 0 ? start - 1 : start) + s.slice(end);
  return { date, rest: rest.replace(/^-|-$/g, "") };
}
