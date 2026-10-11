/**
 * Local-only persistence. No database or server is used:
 * everything is saved in the player's own browser via localStorage.
 */
import { COSMETICS, DEFAULT_EQUIPPED, PERKS, makeMissions, type Equipped, type Mission } from "./shop";
import type { ParkTheme } from "./util";

export interface ScoreEntry {
  name: string;
  score: number;
  height: number;
  hearts: number;
  date: number;
}

const KEY = "loveleap.scores.v1";
const NAME_KEY = "loveleap.name";
const MUTE_KEY = "loveleap.muted";
const THEME_KEY = "loveleap.theme";
const PROG_KEY = "loveleap.progress.v1";
export const MAX_SCORES = 8;

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export function loadScores(): ScoreEntry[] {
  try {
    const arr = JSON.parse(get(KEY) || "[]") as ScoreEntry[];
    return Array.isArray(arr) ? arr.slice(0, MAX_SCORES) : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): { rank: number; scores: ScoreEntry[] } {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score || a.date - b.date);
  const top = scores.slice(0, MAX_SCORES);
  set(KEY, JSON.stringify(top));
  return { rank: top.indexOf(entry), scores: top };
}

export function clearScores() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const loadName = () => get(NAME_KEY) || "";
export const saveName = (n: string) => set(NAME_KEY, n);
export const loadMuted = () => get(MUTE_KEY) === "1";
export const saveMuted = (m: boolean) => set(MUTE_KEY, m ? "1" : "0");
export function loadTheme(): ParkTheme {
  const t = get(THEME_KEY);
  return t === "winter" || t === "spring" || t === "summer" ? t : "autumn";
}
export const saveTheme = (t: ParkTheme) => set(THEME_KEY, t);
export type TimeOfDayId = "day" | "evening" | "night";
export function loadTod(): TimeOfDayId {
  const t = get("loveleap.tod");
  return t === "day" || t === "night" ? t : "evening";
}
export const saveTod = (t: TimeOfDayId) => set("loveleap.tod", t);

// ---------------- Progress ----------------
export interface Progress {
  coins: number;
  xp: number;
  owned: string[];
  equipped: Equipped;
  perks: Record<string, number>;
  lastDaily: string;
  streak: number;
  totalRuns: number;
  missions: Mission[];
  missionSet: number;
}

export const defaultProgress = (): Progress => ({
  coins: 0,
  xp: 0,
  owned: ["o_classic", "w_simple", "t_hearts"],
  equipped: { ...DEFAULT_EQUIPPED },
  perks: {},
  lastDaily: "",
  streak: 0,
  totalRuns: 0,
  missions: makeMissions(0),
  missionSet: 0,
});

export function loadProgress(): Progress {
  try {
    const raw = get(PROG_KEY);
    if (!raw) return defaultProgress();
    const p = JSON.parse(raw) as Partial<Progress>;
    const d = defaultProgress();
    const valid = new Set(COSMETICS.map((c) => c.id));
    const owned = Array.from(new Set([...d.owned, ...(p.owned || []).filter((id) => valid.has(id))]));
    const eq = (p.equipped || {}) as Partial<Equipped>;
    const pick = (id: string | undefined, fallback: string) => (id && owned.includes(id) ? id : fallback);
    const perkIds = new Set(PERKS.map((x) => x.id as string));
    const perks: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.perks || {})) if (perkIds.has(k)) perks[k] = v;
    const missionSet = p.missionSet || 0;
    return {
      coins: Math.max(0, p.coins || 0),
      xp: Math.max(0, p.xp || 0),
      owned,
      equipped: {
        outfit: pick(eq.outfit, d.equipped.outfit),
        wear: pick(eq.wear, d.equipped.wear),
        trail: pick(eq.trail, d.equipped.trail),
      },
      perks,
      lastDaily: p.lastDaily || "",
      streak: p.streak || 0,
      totalRuns: p.totalRuns || 0,
      missions: Array.isArray(p.missions) && p.missions.length === 3 ? p.missions : makeMissions(missionSet),
      missionSet,
    };
  } catch {
    return defaultProgress();
  }
}

export const saveProgress = (p: Progress) => set(PROG_KEY, JSON.stringify(p));

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayKey = () => dayKey(new Date());
export const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};
