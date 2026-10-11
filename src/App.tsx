import { useCallback, useEffect, useRef, useState } from "react";
import Shop, { Coin } from "./components/Shop";
import { Game, type GameResult, type GameState } from "./game/runner";
import {
  COSMETICS,
  DAILY_REWARDS,
  MAX_MULTIPLIER,
  PERKS,
  itemsUnlockedAt,
  levelFromXp,
  lookFrom,
  makeMissions,
  reviveCost,
  type CosmeticItem,
  type Mission,
  type PerkDef,
} from "./game/shop";
import {
  clearScores,
  loadMuted,
  loadName,
  loadProgress,
  loadScores,
  loadTheme,
  loadTod,
  saveTod,
  type TimeOfDayId,
  saveMuted,
  saveName,
  saveProgress,
  saveScore,
  saveTheme,
  todayKey,
  yesterdayKey,
  type Progress,
  type ScoreEntry,
} from "./game/storage";
import type { ParkTheme } from "./game/util";

const THEME_OPTS: { id: ParkTheme; icon: string; label: string; grad: string }[] = [
  { id: "autumn", icon: "🍂", label: "Autumn", grad: "from-orange-400 to-amber-300" },
  { id: "winter", icon: "❄️", label: "Winter", grad: "from-sky-300 to-indigo-300" },
  { id: "spring", icon: "🌸", label: "Spring", grad: "from-pink-400 to-lime-300" },
  { id: "summer", icon: "☀️", label: "Summer", grad: "from-yellow-400 to-green-400" },
];
const TOD_OPTS: { id: TimeOfDayId; icon: string; label: string; grad: string }[] = [
  { id: "day", icon: "☀️", label: "Day", grad: "from-sky-400 to-cyan-300" },
  { id: "evening", icon: "🌅", label: "Evening", grad: "from-orange-400 to-rose-400" },
  { id: "night", icon: "🌙", label: "Night", grad: "from-indigo-600 to-purple-500" },
];
const THEME_BG: Record<ParkTheme, string> = {
  autumn: "from-[#4a2a3a] via-[#8a4a4a] to-[#e0904a]",
  winter: "from-[#2a2a55] via-[#6a6aa0] to-[#c8b0d8]",
  spring: "from-[#4a2a5a] via-[#9a4a8a] to-[#f0a0c0]",
  summer: "from-[#3a2a5a] via-[#9a5a5a] to-[#f0b060]",
};

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.4 2.5h1.8c.8-1.3 2.3-2.5 4.4-2.5 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function ScoreTable({ scores, highlight, compact }: { scores: ScoreEntry[]; highlight?: number; compact?: boolean }) {
  if (scores.length === 0) return <p className="py-2 text-center text-sm text-pink-100/70">No love stories yet — be the first ♥</p>;
  return (
    <ol className={compact ? "space-y-1" : "space-y-1.5"}>
      {scores.map((s, i) => (
        <li
          key={s.date + "_" + i}
          className={`flex items-center gap-2 rounded-xl px-3 ${compact ? "py-1.5" : "py-2"} text-[15px] ${
            i === highlight ? "animate-pop bg-amber-300/90 text-rose-900" : "bg-white/10 text-white"
          }`}
        >
          <span className="w-6 font-bold opacity-80">{i === 0 ? "👑" : i + 1}</span>
          <span className="min-w-0 flex-1 truncate font-semibold">{s.name || "Valton & Ardiana"}</span>
          <span className="text-xs opacity-75">{s.height}m</span>
          <span className="w-14 text-right font-bold tabular-nums">{s.score}</span>
        </li>
      ))}
    </ol>
  );
}

const btn =
  "min-h-[52px] rounded-2xl px-6 py-3 font-bold shadow-lg transition active:scale-95 select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60";

const haptic = (ms = 10) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true);
const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

interface RewardInfo {
  coins: number;
  xp: number;
  fromLevel: number;
  toLevel: number;
  startPct: number;
  endPct: number;
  unlocks: string[];
}
interface MissionNews {
  done: Mission[];
  coins: number;
  setComplete: boolean;
  newMult: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const stateRef = useRef<GameState>("menu");
  const overAtRef = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const swipeRef = useRef<{ id: number; x: number; y: number; t: number; used: boolean } | null>(null);

  const [state, setState] = useState<GameState>("menu");
  const [result, setResult] = useState<GameResult | null>(null);
  const [rank, setRank] = useState(-1);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [name, setName] = useState(() => loadName());
  const [muted, setMuted] = useState(() => loadMuted());
  const [theme, setThemeState] = useState<ParkTheme>(() => loadTheme());
  const [tod, setTodState] = useState<TimeOfDayId>(() => loadTod());
  const [isTouch] = useState(() => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  const [hint, setHint] = useState(false);
  const [canRestart, setCanRestart] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [standalone] = useState(isStandalone);
  const nameRef = useRef(name);
  nameRef.current = name;

  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [xpAnim, setXpAnim] = useState(0);
  const [missionNews, setMissionNews] = useState<MissionNews | null>(null);
  const [daily, setDaily] = useState<{ day: number; amount: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const revivesRef = useRef(0);
  const pendingRef = useRef<GameResult | null>(null);
  const finalizeRef = useRef<(r: GameResult) => void>(() => {});
  const [reviveOffer, setReviveOffer] = useState<{ cost: number; until: number } | null>(null);
  const [reviveLeft, setReviveLeft] = useState(4);

  const updateProgress = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(progressRef.current);
    progressRef.current = next;
    saveProgress(next);
    setProgress(next);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  }, []);

  // ---------- engine ----------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const game = new Game(canvas, {
      onState: (s) => {
        stateRef.current = s;
        setState(s);
      },
      onGameOver: (r) => {
        const cost = reviveCost(revivesRef.current);
        if (revivesRef.current < 3 && progressRef.current.coins >= cost && r.height > 60) {
          pendingRef.current = r;
          setReviveOffer({ cost, until: Date.now() + 4000 });
          return;
        }
        finalizeRef.current(r);
      },
    });
    finalizeRef.current = (r: GameResult) => {
      setReviveOffer(null);
      pendingRef.current = null;
      overAtRef.current = performance.now();
      setResult(r);
      setCanRestart(false);
      window.setTimeout(() => setCanRestart(true), 650);
      const { rank: rk, scores: sc } = saveScore({
        name: nameRef.current.trim() || "Valton & Ardiana",
        score: r.score,
        height: r.height,
        hearts: r.hearts,
        date: Date.now(),
      });
      setRank(rk);
      setScores(sc);

      const prev = progressRef.current;
      const coinMul = 1 + (prev.perks.coinBoost || 0) * 0.2;
      const coins = Math.round((r.hearts / 3 + r.score / 60 + r.snacks * 5) * coinMul);
      const xp = Math.round(r.score * 0.5 + r.height);
      const before = levelFromXp(prev.xp);
      const after = levelFromXp(prev.xp + xp);
      const unlocks: string[] = [];
      for (let l = before.level + 1; l <= after.level; l++) unlocks.push(...itemsUnlockedAt(l));

      const doneNow: Mission[] = [];
      let missions = prev.missions.map((m) => {
        if (m.done) return m;
        const v = (r as unknown as Record<string, number>)[m.stat] ?? 0;
        if (v >= m.target) {
          doneNow.push(m);
          return { ...m, done: true };
        }
        return m;
      });
      let missionSet = prev.missionSet;
      let missionCoins = doneNow.length * (25 + prev.missionSet * 10);
      let setComplete = false;
      if (missions.every((m) => m.done)) {
        setComplete = true;
        missionSet = prev.missionSet + 1;
        missionCoins += 100 + prev.missionSet * 50;
        missions = makeMissions(missionSet);
      }
      const totalCoins = coins + missionCoins;
      const next: Progress = {
        ...prev,
        coins: prev.coins + totalCoins,
        xp: prev.xp + xp,
        totalRuns: prev.totalRuns + 1,
        missions,
        missionSet,
      };
      progressRef.current = next;
      saveProgress(next);
      setProgress(next);
      game.multiplier = Math.min(MAX_MULTIPLIER, missionSet + 1);
      setMissionNews({ done: doneNow, coins: missionCoins, setComplete, newMult: game.multiplier });
      setReward({
        coins: totalCoins,
        xp,
        fromLevel: before.level,
        toLevel: after.level,
        startPct: before.into / before.need,
        endPct: after.into / after.need,
        unlocks,
      });
      setXpAnim(0);
      window.setTimeout(() => setXpAnim(1), 350);
      if (after.level > before.level || setComplete) window.setTimeout(() => game.sfx.milestone(), 700);
    };
    game.best = loadScores()[0]?.score ?? 0;
    game.setMuted(loadMuted());
    game.showTouchUI = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    game.look = lookFrom(progressRef.current.equipped);
    game.perks = { ...progressRef.current.perks };
    game.multiplier = Math.min(MAX_MULTIPLIER, progressRef.current.missionSet + 1);
    game.setTheme(loadTheme());
    game.setTimeOfDay(loadTod());
    gameRef.current = game;

    const wrap = wrapRef.current!;
    const measure = () => {
      const r = wrap.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      game.resize(r.width, r.height);
      const cs = safeRef.current ? getComputedStyle(safeRef.current) : null;
      game.setSafeArea(cs ? parseFloat(cs.paddingTop) || 0 : 0, cs ? parseFloat(cs.paddingBottom) || 0 : 0);
      game.updateCamera();
      setLandscape(window.innerWidth > window.innerHeight && window.innerHeight < 540);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("orientationchange", measure);
    measure();

    const onVis = () => {
      if (document.hidden) game.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onVis);
    const stopGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stopGesture);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onVis);
      document.removeEventListener("gesturestart", stopGesture);
      game.destroy();
    };
  }, []);

  // keep engine in sync with cosmetics & perks
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    g.look = lookFrom(progress.equipped);
    g.perks = { ...progress.perks };
  }, [progress]);

  // daily gift
  useEffect(() => {
    const p = progressRef.current;
    if (p.lastDaily === todayKey()) return;
    const streak = p.lastDaily === yesterdayKey() ? p.streak + 1 : 1;
    const day = ((streak - 1) % DAILY_REWARDS.length) + 1;
    setDaily({ day, amount: DAILY_REWARDS[day - 1] });
  }, []);

  // install prompt
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // pause if turned sideways
  useEffect(() => {
    if (landscape && isTouch) gameRef.current?.pause();
  }, [landscape, isTouch]);

  // screen wake lock while running
  useEffect(() => {
    const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (state === "playing" && nav.wakeLock && !wakeRef.current) {
      nav.wakeLock
        .request("screen")
        .then((l) => (wakeRef.current = l))
        .catch(() => {});
    } else if (state !== "playing" && wakeRef.current) {
      void wakeRef.current.release().catch(() => {});
      wakeRef.current = null;
    }
  }, [state]);

  // revive countdown
  useEffect(() => {
    if (!reviveOffer) return;
    const tick = () => {
      const left = Math.max(0, reviveOffer.until - Date.now());
      setReviveLeft(Math.ceil(left / 1000));
      if (left <= 0 && pendingRef.current) finalizeRef.current(pendingRef.current);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [reviveOffer]);

  const start = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    haptic(15);
    setRank(-1);
    setShowScores(false);
    setShowShop(false);
    setShowMissions(false);
    setReviveOffer(null);
    setMissionNews(null);
    setResult(null);
    pendingRef.current = null;
    revivesRef.current = 0;
    g.start();
    if (isTouch) {
      setHint(true);
      window.setTimeout(() => setHint(false), 2800);
    }
  }, [isTouch]);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    haptic();
    if (stateRef.current === "playing") g.pause();
    else if (stateRef.current === "paused") g.resume();
  }, []);

  const toMenu = useCallback(() => {
    haptic();
    gameRef.current?.toMenu();
    setScores(loadScores());
  }, []);

  const toggleMute = useCallback(() => {
    haptic();
    setMuted((m) => {
      const n = !m;
      saveMuted(n);
      gameRef.current?.setMuted(n);
      return n;
    });
  }, []);

  const chooseTheme = (t: ParkTheme) => {
    haptic(12);
    gameRef.current?.sfx.unlock();
    gameRef.current?.sfx.click();
    setThemeState(t);
    saveTheme(t);
    gameRef.current?.setTheme(t);
  };

  const chooseTod = (t: TimeOfDayId) => {
    haptic(12);
    gameRef.current?.sfx.unlock();
    gameRef.current?.sfx.click();
    setTodState(t);
    saveTod(t);
    gameRef.current?.setTimeOfDay(t);
  };

  const doRevive = () => {
    const g = gameRef.current;
    if (!g || !reviveOffer) return;
    haptic(40);
    const cost = reviveOffer.cost;
    updateProgress((p) => ({ ...p, coins: Math.max(0, p.coins - cost) }));
    revivesRef.current++;
    pendingRef.current = null;
    setReviveOffer(null);
    g.revive();
  };
  const skipRevive = () => {
    haptic();
    if (pendingRef.current) finalizeRef.current(pendingRef.current);
  };

  const claimDaily = () => {
    if (!daily) return;
    haptic(30);
    gameRef.current?.sfx.unlock();
    gameRef.current?.sfx.milestone();
    updateProgress((p) => ({
      ...p,
      coins: p.coins + daily.amount,
      lastDaily: todayKey(),
      streak: p.lastDaily === yesterdayKey() ? p.streak + 1 : 1,
    }));
    setDaily(null);
  };

  const buyItem = (it: CosmeticItem) => {
    const p = progressRef.current;
    if (p.coins < it.price || p.owned.includes(it.id)) return;
    haptic(25);
    gameRef.current?.sfx.unlock();
    gameRef.current?.sfx.heart(4);
    updateProgress((pr) => ({
      ...pr,
      coins: pr.coins - it.price,
      owned: [...pr.owned, it.id],
      equipped: { ...pr.equipped, [it.slot]: it.id },
    }));
    flash(`${it.icon} ${it.name} unlocked!`);
  };
  const equipItem = (it: CosmeticItem) => {
    haptic();
    gameRef.current?.sfx.unlock();
    gameRef.current?.sfx.click();
    updateProgress((pr) => ({ ...pr, equipped: { ...pr.equipped, [it.slot]: it.id } }));
  };
  const buyPerk = (pk: PerkDef) => {
    const p = progressRef.current;
    const lvl = p.perks[pk.id] || 0;
    if (lvl >= pk.max) return;
    const price = pk.prices[lvl];
    if (p.coins < price || levelFromXp(p.xp).level < pk.levels[lvl]) return;
    haptic(25);
    gameRef.current?.sfx.unlock();
    gameRef.current?.sfx.milestone();
    updateProgress((pr) => ({ ...pr, coins: pr.coins - price, perks: { ...pr.perks, [pk.id]: lvl + 1 } }));
    flash(`${pk.icon} ${pk.name} upgraded!`);
  };

  const doInstall = async () => {
    haptic();
    if (installEvt) {
      await installEvt.prompt();
      setInstallEvt(null);
    } else if (isIOS()) setShowIOSHint(true);
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" && e.key !== "Enter") return;
      if (tag === "BUTTON" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
      const s = stateRef.current;
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        e.preventDefault();
        if (!e.repeat) g.moveLane(-1);
      } else if (k === "ArrowRight" || k === "d" || k === "D") {
        e.preventDefault();
        if (!e.repeat) g.moveLane(1);
      } else if (k === "ArrowDown" || k === "s" || k === "S") {
        e.preventDefault();
        if (s === "playing") g.roll();
      } else if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
        e.preventDefault();
        if (s === "playing") g.jump();
        else if (!e.repeat && (s === "menu" || (s === "over" && !pendingRef.current && performance.now() - overAtRef.current > 400))) start();
        else if (s === "paused" && k === " ") g.resume();
      } else if (k === "Enter" || k === "r" || k === "R") {
        if (e.repeat) return;
        if (s === "menu" || (s === "over" && !pendingRef.current) || (s === "paused" && (k === "r" || k === "R"))) {
          e.preventDefault();
          start();
        } else if (s === "paused") g.resume();
      } else if (k === "p" || k === "P" || k === "Escape") {
        if (s === "playing" || s === "paused") togglePause();
      } else if (k === "m" || k === "M") toggleMute();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [start, togglePause, toggleMute]);

  // ---------- touch: swipe ← → lanes, ↑ jump, ↓ slide ----------
  const onPointerDown = (e: React.PointerEvent) => {
    if (stateRef.current !== "playing") return;
    e.preventDefault();
    gameRef.current?.sfx.unlock();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), used: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    const g = gameRef.current;
    if (!s || !g || s.id !== e.pointerId || s.used) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    s.used = true;
    if (Math.abs(dx) > Math.abs(dy)) g.moveLane(dx > 0 ? 1 : -1);
    else if (dy < 0) g.jump();
    else g.roll();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    const g = gameRef.current;
    swipeRef.current = null;
    if (!s || !g || s.id !== e.pointerId || s.used) return;
    if (performance.now() - s.t > 350 || stateRef.current !== "playing") return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    if (fx < 0.33) g.moveLane(-1);
    else if (fx > 0.67) g.moveLane(1);
    else g.jump();
  };

  const lvlInfo = levelFromXp(progress.xp);
  const mult = Math.min(MAX_MULTIPLIER, progress.missionSet + 1);
  const shopHasNew =
    COSMETICS.some((c) => !progress.owned.includes(c.id) && c.level <= lvlInfo.level && c.price <= progress.coins) ||
    PERKS.some((pk) => {
      const l = progress.perks[pk.id] || 0;
      return l < pk.max && pk.levels[l] <= lvlInfo.level && pk.prices[l] <= progress.coins;
    });
  const best = scores[0]?.score ?? 0;
  const isNewBest = rank === 0 && result !== null;
  const canInstall = !standalone && (installEvt !== null || isIOS());
  const themeIcon = THEME_OPTS.find((o) => o.id === theme)?.icon;

  return (
    <div
      className={`relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-gradient-to-b ${
        tod === "night" ? "from-[#05040f] via-[#120e2a] to-[#2a1e40]" : tod === "day" ? "from-[#4a8ac8] via-[#8ab8e0] to-[#e8d8b8]" : THEME_BG[theme]
      }`}
    >
      <div
        ref={safeRef}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      />

      <div
        ref={wrapRef}
        className="relative h-[100dvh] overflow-hidden md:shadow-[0_0_80px_rgba(255,200,240,0.45)]"
        style={{ width: "min(100vw, calc(100dvh * 0.6))" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />

        {(state === "playing" || state === "menu") && (
          <div className="absolute right-3 z-20 flex gap-2" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
            <button
              onClick={toggleMute}
              className="grid h-12 w-12 place-items-center rounded-full bg-black/20 text-xl text-white ring-1 ring-white/30 backdrop-blur-sm transition active:scale-90"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            {state === "playing" && (
              <button
                onClick={togglePause}
                className="grid h-12 w-12 place-items-center rounded-full bg-black/20 text-white ring-1 ring-white/30 backdrop-blur-sm transition active:scale-90"
                aria-label="Pause"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              </button>
            )}
          </div>
        )}

        {state === "playing" && hint && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-4 text-white"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 110px)" }}
          >
            <div className="animate-pulse rounded-2xl bg-black/40 px-5 py-3 text-center text-base font-semibold leading-snug backdrop-blur-sm">
              👈 👉 Swipe to switch lanes
              <br />
              👆 Swipe up to jump · 👇 down to slide
            </div>
          </div>
        )}

        {/* ================= MENU ================= */}
        {state === "menu" && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center overflow-y-auto overscroll-contain px-4"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 64px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="sparkle-field pointer-events-none absolute inset-0">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} style={{ left: `${(i * 47 + 11) % 100}%`, top: `${(i * 29 + 7) % 60}%`, animationDelay: `${(i * 0.37) % 2.6}s` }} />
              ))}
            </div>

            <div className="absolute left-3 flex items-center gap-2" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
              <div className="flex items-center gap-2 rounded-full bg-black/25 py-1 pl-1 pr-3 ring-1 ring-white/30 backdrop-blur-sm">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-rose-400 to-pink-600 text-sm font-black text-white ring-2 ring-white/70">
                  {lvlInfo.level}
                </span>
                <div className="w-20">
                  <div className="text-[11px] font-bold leading-none text-white/90">LEVEL</div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-200" style={{ width: `${(lvlInfo.into / lvlInfo.need) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="animate-floaty relative text-center">
              <HeartIcon className="animate-heartbeat mx-auto h-8 w-8 text-rose-400 drop-shadow" />
              <h1 className="font-script fantasy-title text-[clamp(44px,14vw,64px)] leading-tight">Love Leap</h1>
              <p className="text-[15px] font-semibold text-white drop-shadow">Hold hands. Run together. Never let go.</p>
              <div className="mx-auto mt-2 w-fit rounded-full bg-black/30 px-3 py-1 text-[13px] font-bold text-amber-100 ring-1 ring-amber-100/40 backdrop-blur-sm">
                📍 Taukbashqe Park · where we had our first date {themeIcon}
              </div>
            </div>

            <div className="min-h-4 flex-1" />

            <div className="animate-pop glass-fantasy relative w-full max-w-sm rounded-3xl p-4 backdrop-blur-md">
              <button
                onClick={start}
                className={`${btn} w-full bg-gradient-to-r from-rose-500 to-pink-500 py-4 text-2xl text-white shadow-[0_6px_0_#9d1c52] active:translate-y-1 active:shadow-[0_2px_0_#9d1c52]`}
              >
                ♥ Play
              </button>

              <div className="mt-3">
                <div className="mb-1.5 text-center text-xs font-bold uppercase tracking-wider text-white/85">Taukbashqe Park · season &amp; time</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEME_OPTS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => chooseTheme(o.id)}
                      className={`flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[12px] font-bold transition active:scale-95 ${
                        theme === o.id ? `bg-gradient-to-b ${o.grad} text-white shadow-lg ring-2 ring-white` : "bg-white/10 text-white/80 ring-1 ring-white/15"
                      }`}
                    >
                      <span className="text-2xl leading-none">{o.icon}</span>
                      <span className="mt-1">{o.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {TOD_OPTS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => chooseTod(o.id)}
                      className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl text-[13px] font-bold transition active:scale-95 ${
                        tod === o.id ? `bg-gradient-to-b ${o.grad} text-white shadow-lg ring-2 ring-white` : "bg-white/10 text-white/80 ring-1 ring-white/15"
                      }`}
                    >
                      <span className="text-lg leading-none">{o.icon}</span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  haptic();
                  setShowMissions(true);
                }}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/10 p-2.5 text-left ring-1 ring-white/20 transition active:scale-[0.98]"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-amber-300 to-yellow-400 text-lg font-black text-rose-900 shadow">x{mult}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-white">🎯 Missions · raise your multiplier</div>
                  <div className="truncate text-[12px] text-white/75">{progress.missions.find((m) => !m.done)?.text ?? "All done!"}</div>
                  <div className="mt-1 flex gap-1">
                    {progress.missions.map((m) => (
                      <span key={m.id} className={`h-1.5 flex-1 rounded-full ${m.done ? "bg-amber-300" : "bg-white/20"}`} />
                    ))}
                  </div>
                </div>
              </button>

              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold leading-tight text-white">
                {[
                  ["🥤", "Cola Zero", "speed"],
                  ["🍫", "Milka", "shield"],
                  ["🧋", "Iced Coffee", "fly"],
                  ["🍕", "Pizza", "magnet"],
                ].map(([i, n, d]) => (
                  <div key={n} className="rounded-xl bg-white/10 px-1 py-1.5">
                    <div className="text-xl">{i}</div>
                    {n}
                    <div className="font-semibold text-white/70">{d}</div>
                  </div>
                ))}
              </div>

              <details className="group mt-3 rounded-2xl bg-white/10 px-3 py-2 text-white">
                <summary className="flex min-h-[36px] cursor-pointer list-none items-center justify-between text-[15px] font-semibold">
                  <span>💑 Couple name</span>
                  <span className="truncate pl-2 text-sm text-white/70 group-open:hidden">{name.trim() || "Valton & Ardiana"}</span>
                </summary>
                <input
                  value={name}
                  maxLength={20}
                  enterKeyHint="done"
                  autoComplete="off"
                  onChange={(e) => {
                    setName(e.target.value);
                    saveName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  placeholder="Valton & Ardiana"
                  className="mb-1 mt-2 w-full rounded-xl bg-white/95 px-3 py-3 text-base font-semibold text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-4 focus:ring-pink-300"
                />
              </details>

              <button
                onClick={() => {
                  haptic();
                  gameRef.current?.sfx.unlock();
                  setShowShop(true);
                }}
                className="relative mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-200 text-lg font-bold text-rose-900 shadow-[0_4px_0_#c58a12] transition active:translate-y-0.5 active:scale-[0.98]"
              >
                🛍️ Love Shop
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-sm">
                  <Coin /> {progress.coins}
                </span>
                {shopHasNew && (
                  <span className="absolute -right-1 -top-2 animate-bounce rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-black text-white ring-2 ring-white">NEW</span>
                )}
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    haptic();
                    setShowScores(true);
                  }}
                  className="min-h-[48px] rounded-2xl bg-white/15 text-[15px] font-bold text-white ring-1 ring-white/20 transition active:scale-95"
                >
                  🏆 Scores{best > 0 ? ` · ${best}` : ""}
                </button>
                {canInstall ? (
                  <button onClick={() => void doInstall()} className="min-h-[48px] rounded-2xl bg-amber-300 text-[15px] font-bold text-rose-900 transition active:scale-95">
                    📲 Install app
                  </button>
                ) : (
                  <div className="flex min-h-[48px] items-center justify-center rounded-2xl bg-white/10 px-2 text-center text-xs font-semibold text-white/80">💘 Run together!</div>
                )}
              </div>

              <p className="mt-3 text-center text-[13px] leading-snug text-white/85">
                {isTouch ? "Swipe ← → lanes · ↑ jump · ↓ slide" : "← → lanes · ↑/Space jump · ↓ slide · P pause"}
                <br />
                Jump benches · slide under rose arches · dodge log piles &amp; fallen trees
              </p>
            </div>
          </div>
        )}

        {/* ================= SCORES ================= */}
        {state === "menu" && showScores && (
          <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowScores(false)}>
            <div
              className="animate-pop w-full rounded-t-3xl bg-gradient-to-b from-[#5a3a86] to-[#3a2560] px-4 pt-3 ring-1 ring-white/25"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/30" />
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">💞 Sweetest Runs</h2>
                {scores.length > 0 && (
                  <button
                    onClick={() => {
                      if (!window.confirm("Reset all scores?")) return;
                      clearScores();
                      setScores([]);
                      if (gameRef.current) gameRef.current.best = 0;
                    }}
                    className="min-h-[40px] px-2 text-sm text-white/60 underline"
                  >
                    reset
                  </button>
                )}
              </div>
              <div className="max-h-[55dvh] overflow-y-auto">
                <ScoreTable scores={scores} />
              </div>
              <button onClick={() => setShowScores(false)} className={`${btn} mt-4 w-full bg-white/15 text-white`}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* ================= MISSIONS ================= */}
        {showMissions && state === "menu" && (
          <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowMissions(false)}>
            <div
              className="animate-pop w-full rounded-t-3xl bg-gradient-to-b from-[#5a3a86] to-[#3a2560] px-4 pt-3 ring-1 ring-white/25"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/30" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">🎯 Missions</h2>
                <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-black text-rose-900">Score x{mult}</span>
              </div>
              <p className="mt-1 text-[13px] text-white/75">
                Finish all 3 to raise your score multiplier to x{Math.min(MAX_MULTIPLIER, mult + 1)} and earn a big coin bonus!
              </p>
              <div className="mt-3 space-y-2">
                {progress.missions.map((m) => (
                  <div key={m.id} className={`flex items-center gap-3 rounded-2xl p-3 ${m.done ? "bg-amber-300/90 text-rose-900" : "bg-white/10 text-white"}`}>
                    <span className="text-2xl">{m.done ? "✅" : "🎯"}</span>
                    <span className="flex-1 text-[15px] font-semibold">{m.text}</span>
                    <span className="text-sm font-bold">
                      +{25 + progress.missionSet * 10} <Coin />
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowMissions(false)} className={`${btn} mt-4 w-full bg-white/15 text-white`}>
                Let's go!
              </button>
            </div>
          </div>
        )}

        {/* ================= REVIVE ================= */}
        {reviveOffer && state === "over" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#2a1446]/55 px-6 backdrop-blur-[2px]">
            <div className="animate-pop w-full max-w-xs rounded-3xl bg-gradient-to-b from-[#ff9ac8] to-[#b48cf2] p-5 text-center text-white shadow-2xl ring-2 ring-white/50">
              <div className="animate-heartbeat text-6xl">💖</div>
              <h3 className="font-script mt-1 text-3xl">Keep running?</h3>
              <p className="text-sm text-white/90">Love never gives up!</p>
              <div className="mx-auto mt-3 grid h-16 w-16 place-items-center rounded-full bg-white/25 text-3xl font-black ring-4 ring-amber-200">{reviveLeft}</div>
              <button onClick={doRevive} className={`${btn} mt-4 w-full bg-white text-xl text-rose-600 shadow-[0_5px_0_rgba(120,20,80,0.4)]`}>
                Revive · {reviveOffer.cost} <Coin />
              </button>
              <button onClick={skipRevive} className="mt-3 min-h-[44px] w-full text-sm font-semibold text-white/85 underline">
                No thanks
              </button>
            </div>
          </div>
        )}

        {/* ================= SHOP ================= */}
        {showShop && (state === "menu" || state === "over") && (
          <Shop progress={progress} onBuy={buyItem} onEquip={equipItem} onBuyPerk={buyPerk} onClose={() => setShowShop(false)} />
        )}

        {/* ================= DAILY GIFT ================= */}
        {daily && state === "menu" && !showShop && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
            <div className="animate-pop w-full max-w-xs rounded-3xl bg-gradient-to-b from-[#ff9ac8] to-[#b48cf2] p-5 text-center text-white shadow-2xl ring-2 ring-white/50">
              <div className="animate-heartbeat text-6xl">🎁</div>
              <h3 className="font-script mt-1 text-3xl">Daily Love Gift</h3>
              <p className="text-sm text-white/90">Come back every day for bigger gifts!</p>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {DAILY_REWARDS.map((amt, i) => (
                  <div
                    key={i}
                    className={`rounded-lg py-1 text-[10px] font-bold ${
                      i + 1 < daily.day ? "bg-white/40 text-rose-900" : i + 1 === daily.day ? "scale-110 bg-amber-300 text-amber-900 ring-2 ring-white" : "bg-black/20 text-white/70"
                    }`}
                  >
                    D{i + 1}
                    <div className="text-[9px]">{amt}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-4xl font-black">
                +{daily.amount} <Coin />
              </div>
              <button onClick={claimDaily} className={`${btn} mt-4 w-full bg-white text-xl text-rose-600 shadow-[0_5px_0_rgba(120,20,80,0.4)]`}>
                Claim 💞
              </button>
            </div>
          </div>
        )}

        {toast && (
          <div className="animate-pop pointer-events-none absolute inset-x-0 z-[55] flex justify-center px-4" style={{ top: "calc(env(safe-area-inset-top) + 70px)" }}>
            <div className="rounded-full bg-white px-4 py-2 text-[15px] font-bold text-rose-700 shadow-xl">{toast}</div>
          </div>
        )}

        {showIOSHint && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/50" onClick={() => setShowIOSHint(false)}>
            <div
              className="animate-pop w-full rounded-t-3xl bg-white px-5 pt-4 text-rose-900"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-rose-200" />
              <h3 className="text-center text-lg font-bold">Add Love Leap to your Home Screen</h3>
              <ol className="mt-3 space-y-2 text-[15px]">
                <li>
                  1. Tap the <b>Share</b> button <span className="inline-block rounded-md bg-rose-100 px-1.5">⬆︎</span> in Safari
                </li>
                <li>
                  2. Choose <b>“Add to Home Screen”</b> ➕
                </li>
                <li>
                  3. Tap <b>Add</b> — done! 💞
                </li>
              </ol>
              <button onClick={() => setShowIOSHint(false)} className={`${btn} mt-4 w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white`}>
                Got it
              </button>
            </div>
          </div>
        )}

        {/* ================= PAUSED ================= */}
        {state === "paused" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#3a2560]/55 px-6 backdrop-blur-sm">
            <div className="animate-pop glass-fantasy w-full max-w-xs rounded-3xl p-6 text-center">
              <h2 className="font-script text-5xl text-white">Paused</h2>
              <p className="mb-5 text-[15px] text-white/85">Take a breath, lovebirds ♥</p>
              <div className="flex flex-col gap-3">
                <button onClick={togglePause} className={`${btn} bg-gradient-to-r from-rose-500 to-pink-500 py-4 text-xl text-white`}>
                  ▶ Resume
                </button>
                <button onClick={start} className={`${btn} bg-white/90 text-rose-700`}>
                  ↻ Restart
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={toMenu} className={`${btn} bg-white/20 px-3 text-white`}>
                    Menu
                  </button>
                  <button onClick={toggleMute} className={`${btn} bg-white/20 px-3 text-white`}>
                    {muted ? "🔇" : "🔊"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= GAME OVER ================= */}
        {state === "over" && result && !reviveOffer && (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center overflow-y-auto overscroll-contain bg-[#3a2560]/50 px-4 backdrop-blur-[3px]"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="my-auto w-full max-w-sm">
              <div className="animate-pop glass-fantasy rounded-3xl p-5 text-center">
                <h2 className="font-script text-[clamp(30px,9vw,40px)] leading-tight text-white drop-shadow">Oops… you crashed!</h2>
                {isNewBest && (
                  <div className="animate-heartbeat mx-auto mt-2 w-fit rounded-full bg-amber-300 px-3 py-1 text-sm font-bold text-rose-900">✨ NEW BEST! ✨</div>
                )}
                <div className="mt-1 text-7xl font-bold tabular-nums text-white drop-shadow-[0_3px_0_rgba(150,30,100,0.5)]">{result.score}</div>
                <div className="mt-1 flex justify-center gap-5 text-base font-semibold text-pink-100">
                  <span>🏃 {result.height}m</span>
                  <span>♥ {result.hearts}</span>
                  <span>🏆 {Math.max(best, result.score)}</span>
                </div>

                {reward && (
                  <div className="mt-4 rounded-2xl bg-black/20 p-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="animate-pop text-2xl font-black text-amber-200">
                        +{reward.coins} <Coin />
                      </span>
                      <span className="text-sm font-bold text-white/80">+{reward.xp} XP</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-b from-rose-400 to-pink-600 text-xs font-black text-white ring-2 ring-white/70">
                        {xpAnim ? reward.toLevel : reward.fromLevel}
                      </span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 transition-[width] duration-1000 ease-out"
                          style={{ width: `${(xpAnim ? reward.endPct : reward.toLevel > reward.fromLevel ? 0 : reward.startPct) * 100}%` }}
                        />
                      </div>
                    </div>
                    {reward.toLevel > reward.fromLevel && xpAnim > 0 && (
                      <div className="animate-pop mt-3 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-200 p-2 text-center text-rose-900">
                        <div className="text-lg font-black">🎉 LEVEL {reward.toLevel}!</div>
                        {reward.unlocks.length > 0 && (
                          <div className="mt-0.5 text-[12.5px] font-semibold leading-snug">New in shop: {reward.unlocks.slice(0, 4).join(" · ")}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {missionNews && (
                  <div className="mt-3 rounded-2xl bg-black/20 p-3 text-left">
                    {missionNews.setComplete ? (
                      <div className="animate-pop rounded-xl bg-gradient-to-r from-amber-300 to-yellow-200 p-2 text-center text-rose-900">
                        <div className="text-lg font-black">🎯 All missions done!</div>
                        <div className="text-[13px] font-bold">Score multiplier is now x{missionNews.newMult} 🔥</div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-pink-100/80">
                          <span>🎯 Missions</span>
                          <span>Score x{mult}</span>
                        </div>
                        {progress.missions.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 py-0.5 text-[13px] text-white">
                            <span>{m.done ? "✅" : "⬜"}</span>
                            <span className={`flex-1 ${m.done ? "text-white/60 line-through" : ""}`}>{m.text}</span>
                            {missionNews.done.some((d) => d.id === m.id) && (
                              <span className="animate-pop rounded-full bg-amber-300 px-2 text-[11px] font-black text-rose-900">NEW!</span>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <div className="mt-3 text-left">
                  <ScoreTable scores={scores.slice(0, 3)} highlight={rank < 3 ? rank : -1} compact />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  onClick={start}
                  disabled={!canRestart}
                  className={`${btn} w-full bg-gradient-to-r from-rose-500 to-pink-500 py-4 text-2xl text-white shadow-[0_6px_0_#9d1c52] disabled:opacity-60`}
                >
                  ♥ Run Again
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      haptic();
                      setShowShop(true);
                    }}
                    disabled={!canRestart}
                    className={`${btn} relative bg-gradient-to-r from-amber-300 to-yellow-200 px-3 text-rose-900 disabled:opacity-60`}
                  >
                    🛍️ Shop
                    {shopHasNew && (
                      <span className="absolute -right-1 -top-2 animate-bounce rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white ring-2 ring-white">NEW</span>
                    )}
                  </button>
                  <button onClick={toMenu} disabled={!canRestart} className={`${btn} bg-white/20 px-3 text-white disabled:opacity-60`}>
                    Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {landscape && isTouch && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-[#3a2560] text-center text-white">
            <div className="animate-floaty text-6xl">📱</div>
            <p className="text-xl font-bold">Turn your phone upright</p>
            <p className="text-sm text-white/70">Love Leap is made for portrait mode 💞</p>
          </div>
        )}
      </div>
    </div>
  );
}
