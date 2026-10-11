// ---------------- Catalog: matching couple outfits, wearables, trails, perks ----------------
export type Slot = "outfit" | "wear" | "trail";

export interface CosmeticItem {
  id: string;
  slot: Slot;
  name: string;
  icon: string;
  price: number;
  level: number;
  her?: string;
  his?: string;
  colors?: string[];
}

export interface Equipped {
  outfit: string;
  wear: string;
  trail: string;
}

export const DEFAULT_EQUIPPED: Equipped = { outfit: "o_classic", wear: "w_simple", trail: "t_hearts" };

export const COSMETICS: CosmeticItem[] = [
  // outfits (one purchase dresses both)
  { id: "o_classic", slot: "outfit", name: "Sweethearts", icon: "💞", price: 0, level: 1, her: "a_pink", his: "v_purple", colors: ["#ff4f8b", "#6a5ae0"] },
  { id: "o_baby", slot: "outfit", name: "Baby Blue & Pink", icon: "🩵", price: 120, level: 2, her: "a_babyblue", his: "v_babypink", colors: ["#89cff0", "#ffb7d5"] },
  { id: "o_sunny", slot: "outfit", name: "Sunny Day", icon: "🌻", price: 220, level: 3, her: "a_sunflower", his: "v_hoodie", colors: ["#ffcf4a", "#ff8a5c"] },
  { id: "o_picnic", slot: "outfit", name: "Park Picnic", icon: "🧺", price: 300, level: 4, her: "a_plaid", his: "v_plaid", colors: ["#d9443f", "#ffffff"] },
  { id: "o_cherry", slot: "outfit", name: "Cherry & Denim", icon: "🍒", price: 350, level: 5, her: "a_cherry", his: "v_denim", colors: ["#e8314f", "#4a78b8"] },
  { id: "o_kosovo", slot: "outfit", name: "Game Day Kosova", icon: "⚽", price: 450, level: 6, her: "a_jersey", his: "v_football", colors: ["#2a5bd7", "#ffd23f"] },
  { id: "o_beach", slot: "outfit", name: "Beach Day", icon: "🏖️", price: 520, level: 7, her: "a_beach", his: "v_beach", colors: ["#4fd1c5", "#ffd23f"] },
  { id: "o_lavender", slot: "outfit", name: "Lavender Dream", icon: "💜", price: 600, level: 8, her: "a_lavender", his: "v_lavender", colors: ["#b48cf2", "#efe4ff"] },
  { id: "o_winter", slot: "outfit", name: "Winter Cozy", icon: "❄️", price: 800, level: 10, her: "a_winter", his: "v_winter", colors: ["#ffffff", "#4a78b8"] },
  { id: "o_wedding", slot: "outfit", name: "Wedding Day", icon: "💍", price: 1200, level: 12, her: "a_wedding", his: "v_tux", colors: ["#ffffff", "#1d1a2b"] },
  { id: "o_galaxy", slot: "outfit", name: "Galaxy Lovers", icon: "🌌", price: 2000, level: 16, her: "a_galaxy", his: "v_galaxy", colors: ["#3a1f7a", "#ffd36e"] },

  // wearables (one purchase for both)
  { id: "w_simple", slot: "wear", name: "Simple Love", icon: "💗", price: 0, level: 1, her: "ah_heartclip", his: "vh_none" },
  { id: "w_cute", slot: "wear", name: "Cute Date", icon: "🎀", price: 100, level: 2, her: "ah_bow", his: "vh_cap" },
  { id: "w_spring", slot: "wear", name: "Spring Picnic", icon: "🌸", price: 250, level: 4, her: "ah_flowers", his: "vh_beanie" },
  { id: "w_ears", slot: "wear", name: "Cute Ears", icon: "🐱", price: 320, level: 5, her: "ah_catears", his: "vh_bearears" },
  { id: "w_summer", slot: "wear", name: "Summer Vacation", icon: "😎", price: 400, level: 6, her: "ah_sunhat", his: "vh_shades" },
  { id: "w_royal", slot: "wear", name: "King & Queen", icon: "👑", price: 800, level: 9, her: "ah_tiara", his: "vh_crown" },
  { id: "w_wedding", slot: "wear", name: "Just Married", icon: "🤍", price: 1200, level: 12, her: "ah_veil", his: "vh_tophat" },
  { id: "w_angels", slot: "wear", name: "Little Angels", icon: "😇", price: 1800, level: 15, her: "ah_halo", his: "vh_halo" },

  // trails
  { id: "t_hearts", slot: "trail", name: "Love Hearts", icon: "💕", price: 0, level: 1 },
  { id: "t_petals", slot: "trail", name: "Cherry Petals", icon: "🌸", price: 200, level: 3 },
  { id: "t_stars", slot: "trail", name: "Shooting Stars", icon: "⭐", price: 450, level: 6 },
  { id: "t_bubbles", slot: "trail", name: "Cola Bubbles", icon: "🫧", price: 650, level: 8 },
  { id: "t_rainbow", slot: "trail", name: "Rainbow", icon: "🌈", price: 1000, level: 11 },
  { id: "t_fire", slot: "trail", name: "Burning Love", icon: "🔥", price: 1600, level: 14 },
];

export function lookFrom(eq: Equipped) {
  const o = COSMETICS.find((c) => c.id === eq.outfit) || COSMETICS[0];
  const w = COSMETICS.find((c) => c.id === eq.wear) || COSMETICS.find((c) => c.id === "w_simple")!;
  return {
    herOutfit: o.her || "a_pink",
    hisOutfit: o.his || "v_purple",
    herHat: w.her || "ah_heartclip",
    hisHat: w.his || "vh_none",
    trail: eq.trail || "t_hearts",
  };
}

// ---------------- Perks ----------------
export type PerkId = "colaLen" | "milkaLen" | "coffeeLen" | "pizzaLen" | "coffeeStart" | "lucky" | "coinBoost" | "angel";

export interface PerkDef {
  id: PerkId;
  name: string;
  icon: string;
  desc: (lvl: number) => string;
  max: number;
  prices: number[];
  levels: number[];
}

export const PERKS: PerkDef[] = [
  { id: "colaLen", name: "Coca-Cola Zero Rush", icon: "🥤", desc: (l) => `Super speed + smash everything · ${(4 + l * 0.75).toFixed(2)}s`, max: 3, prices: [150, 400, 900], levels: [2, 5, 9] },
  { id: "milkaLen", name: "Milka Shield", icon: "🍫", desc: (l) => `Invincible bubble · ${(7 + l * 1.5).toFixed(1)}s`, max: 3, prices: [180, 450, 950], levels: [3, 6, 10] },
  { id: "coffeeLen", name: "Iced Coffee Flight", icon: "🧋", desc: (l) => `Fly over everything collecting hearts · ${(5.5 + l).toFixed(1)}s`, max: 3, prices: [200, 500, 1000], levels: [3, 7, 11] },
  { id: "pizzaLen", name: "Pizza Magnet", icon: "🍕", desc: (l) => `Pulls in all hearts, double value · ${9 + l * 2}s`, max: 3, prices: [160, 420, 920], levels: [2, 6, 10] },
  { id: "coffeeStart", name: "Coffee Head Start", icon: "🚀", desc: (l) => (l === 0 ? "Start every run flying on Iced Coffee" : `Start runs with a ${l * 3}s flight`), max: 2, prices: [600, 1400], levels: [5, 11] },
  { id: "lucky", name: "Snack Luck", icon: "🍀", desc: (l) => (l === 0 ? "More Cola, Milka, Coffee & Pizza" : `+${l * 35}% snacks`), max: 3, prices: [250, 600, 1200], levels: [4, 8, 13] },
  { id: "coinBoost", name: "Lucky Coins", icon: "🪙", desc: (l) => (l === 0 ? "Earn more coins every run" : `+${l * 20}% coins`), max: 3, prices: [300, 700, 1500], levels: [4, 8, 12] },
  { id: "angel", name: "Guardian Angel", icon: "😇", desc: (l) => (l === 0 ? "Get saved once when you crash" : l === 1 ? "1 rescue per run" : "2 rescues per run"), max: 2, prices: [800, 2000], levels: [6, 14] },
];

// ---------------- Levels ----------------
export const xpStep = (n: number) => 350 + (n - 1) * 225;

export function levelFromXp(xp: number) {
  let lvl = 1;
  let rest = xp;
  while (rest >= xpStep(lvl) && lvl < 99) {
    rest -= xpStep(lvl);
    lvl++;
  }
  return { level: lvl, into: rest, need: xpStep(lvl) };
}

export function itemsUnlockedAt(level: number) {
  const c = COSMETICS.filter((i) => i.level === level && i.price > 0).map((i) => `${i.icon} ${i.name}`);
  const p = PERKS.filter((pk) => pk.levels.includes(level)).map((pk) => `${pk.icon} ${pk.name}`);
  return [...c, ...p];
}

// ---------------- Missions ----------------
export type MissionStat = "hearts" | "height" | "snacks" | "jumped" | "slid" | "score" | "dodged";
export interface Mission {
  id: string;
  stat: MissionStat;
  target: number;
  text: string;
  done: boolean;
}
const MISSION_TEMPLATES: { stat: MissionStat; base: number; step: number; text: (n: number) => string }[] = [
  { stat: "hearts", base: 40, step: 25, text: (n) => `Collect ${n} hearts in one run` },
  { stat: "height", base: 400, step: 250, text: (n) => `Run ${n}m in one run` },
  { stat: "snacks", base: 1, step: 1, text: (n) => `Grab ${n} snack power-up${n > 1 ? "s" : ""} in one run` },
  { stat: "jumped", base: 5, step: 4, text: (n) => `Jump over ${n} benches or fences` },
  { stat: "slid", base: 3, step: 3, text: (n) => `Slide under ${n} rose arches` },
  { stat: "score", base: 1200, step: 900, text: (n) => `Score ${n} points in one run` },
  { stat: "dodged", base: 6, step: 5, text: (n) => `Dodge ${n} log piles, carts or fallen trees` },
];

export function makeMissions(set: number, keep: Mission[] = []): Mission[] {
  const used = new Set(keep.map((m) => m.stat));
  const out = [...keep];
  const pool = MISSION_TEMPLATES.filter((t) => !used.has(t.stat)).sort(() => Math.random() - 0.5);
  for (const t of pool) {
    if (out.length >= 3) break;
    const target = t.base + t.step * Math.min(set, 25);
    out.push({ id: `${t.stat}_${target}`, stat: t.stat, target, text: t.text(target), done: false });
  }
  return out;
}

export const MAX_MULTIPLIER = 30;
export const reviveCost = (usedThisRun: number) => 40 * Math.pow(2, usedThisRun);
export const DAILY_REWARDS = [50, 75, 100, 150, 200, 275, 400];
