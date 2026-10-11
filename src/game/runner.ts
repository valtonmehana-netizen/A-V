import { Sfx } from "./audio";
import { DEFAULT_LOOK, drawCoupleBack, drawCoupleFront, type Look } from "./couple";
import { buildSprite, setSpriteTheme } from "./sprites";
import { clamp, heartPath, lerp, mixHex, rand, type ParkTheme } from "./util";

export type GameState = "menu" | "playing" | "paused" | "over";
export interface GameResult {
  score: number;
  height: number;
  hearts: number;
  snacks: number;
  jumped: number;
  slid: number;
  dodged: number;
}
export interface GameCallbacks {
  onState: (s: GameState) => void;
  onGameOver: (r: GameResult) => void;
}
export type SnackKind = "cola" | "milka" | "coffee" | "pizza";
type ObType = "fence" | "bench" | "arch" | "logs" | "cart" | "hedge";
const isBlockType = (t: ObType) => t === "logs" || t === "cart" || t === "hedge";
type PropKind =
  | "tree0"
  | "tree1"
  | "tree2"
  | "tree3"
  | "tall0"
  | "tall1"
  | "tall2"
  | "lamp"
  | "bush"
  | "sign"
  | "logtrees"
  | "gate"
  | "signpost"
  | "board"
  | "mushroom"
  | "crystal";
const TREES: PropKind[] = ["tree0", "tree1", "tree2", "tree3", "tall0", "tall1", "tall2", "tall0", "tall1"];

interface Ob {
  type: ObType;
  lane: number;
  z: number;
  len: number;
  y0: number;
  y1: number;
  gone: boolean;
  passed: boolean;
  counted: boolean;
}
interface Pick {
  kind: "heart" | SnackKind;
  x: number;
  y: number;
  z: number;
  taken: boolean;
  fly: boolean;
  ph: number;
}
interface Prop {
  kind: PropKind;
  x: number;
  z: number;
}
interface Leaf {
  x: number;
  z: number;
  r: number;
  c: number;
  s: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 0 | 1 | 2;
  g: number;
  rot: number;
  vr: number;
}
interface FText {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface Bird {
  ox: number;
  oy: number;
  hx: number;
  hy: number;
  ph: number;
  sp: number;
}

interface ThemeCfg {
  sky: [number, string, string][];
  ground: [string, string, string];
  leaves: string[];
  pavers: [string, string, string, string];
  hills: [string, string];
  sunHalo: [string, string, string];
  sunDisc: [string, string, string];
  sunY: number;
  band: string;
  grade: string;
  gradeA: number;
  snow: boolean;
  welcome: string;
  motes: string[];
  day: [string, string];
  nightSky: [string, string];
}

export type TimeOfDay = "day" | "evening" | "night";
/** Cozy ambient lighting per time of day: how dim the world is, how strong the yellow park lights are. */
const AMBIENT: Record<TimeOfDay, { col: string; sky: number; ground: number; grade: number; lamp: number; couple: number }> = {
  day: { col: "60,35,20", sky: 0.1, ground: 0.14, grade: 0.6, lamp: 0.35, couple: 0 },
  evening: { col: "45,18,30", sky: 0.22, ground: 0.4, grade: 1.2, lamp: 0.9, couple: 0.12 },
  night: { col: "8,8,32", sky: 0.12, ground: 0.56, grade: 0, lamp: 1.2, couple: 0.32 },
};
const TOD_WORD: Record<TimeOfDay, string> = { day: "day", evening: "evening", night: "night" };

const THEMES: Record<ParkTheme, ThemeCfg> = {
  autumn: {
    sky: [
      [0, "#ff6a1a", "#ffc23a"],
      [1100, "#f24e1e", "#ffa024"],
      [2000, "#c23a3a", "#ff7a1e"],
      [3000, "#5a2244", "#e8582a"],
      [4200, "#1e1030", "#6a2a3a"],
    ],
    ground: ["#9a8a46", "#7a7a36", "#4e5a26"],
    leaves: ["#d2621e", "#ee8f30", "#e8bc30", "#f2a830", "#c98a22"],
    pavers: ["#c9b8a6", "#b39f8c", "#a08a78", "#bba895"],
    hills: ["#d0662a", "#b8701e"],
    sunHalo: ["rgba(255,215,110,0.95)", "rgba(255,140,40,0.5)", "rgba(255,100,30,0)"],
    sunDisc: ["#fff1c2", "#ffb347", "#f26b2a"],
    sunY: 26,
    band: "255,180,60",
    grade: "255,130,50",
    gradeA: 0.1,
    snow: false,
    welcome: "🍂 an October",
    day: ["#5aa8e6", "#ffe6b8"],
    nightSky: ["#0e0a24", "#3a1e3a"],
    motes: ["moteGold", "motePeach", "moteGold"],
  },
  winter: {
    sky: [
      [0, "#f7a6a0", "#ffd9c2"],
      [1100, "#d98aa8", "#ffc4b0"],
      [2000, "#7a6aa8", "#e8a6b8"],
      [3000, "#2e2a5a", "#8a6a9a"],
      [4200, "#0c1028", "#2a2a4a"],
    ],
    ground: ["#f4f7fc", "#e2eaf4", "#c8d4e4"],
    leaves: ["#ffffff", "#eef3fa", "#dfe8f3", "#ffffff", "#d4dfec"],
    pavers: ["#d8dce4", "#c4cad6", "#eef2f8", "#d2d8e2"],
    hills: ["#e8eef8", "#9aaac0"],
    sunHalo: ["rgba(255,225,200,0.85)", "rgba(255,170,170,0.4)", "rgba(255,150,170,0)"],
    sunDisc: ["#fff8ee", "#ffd2b0", "#f4a08a"],
    sunY: 18,
    band: "255,200,190",
    grade: "200,210,255",
    gradeA: 0.08,
    snow: true,
    welcome: "❄️ a snowy winter",
    day: ["#8ec5f0", "#eef6ff"],
    nightSky: ["#0a1030", "#2a3560"],
    motes: ["moteCyan", "moteWhite", "moteLilac"],
  },
  spring: {
    sky: [
      [0, "#ff9ab8", "#ffe1a8"],
      [1100, "#f77aa8", "#ffc8a0"],
      [2000, "#b45aa0", "#ff9aa0"],
      [3000, "#4a2a6a", "#c06a9a"],
      [4200, "#140c30", "#3a2050"],
    ],
    ground: ["#a8d878", "#86c460", "#5a9e44"],
    leaves: ["#ffc2dc", "#ffffff", "#ffd9e8", "#fff2a8", "#f7a8c8"],
    pavers: ["#d4c8c0", "#c2b4aa", "#e8b8c8", "#cabdb2"],
    hills: ["#d888b0", "#6aaa58"],
    sunHalo: ["rgba(255,230,170,0.9)", "rgba(255,160,170,0.45)", "rgba(255,140,170,0)"],
    sunDisc: ["#fff6d8", "#ffd090", "#ff9aa0"],
    sunY: 34,
    band: "255,200,170",
    grade: "255,170,200",
    gradeA: 0.07,
    snow: false,
    welcome: "🌸 a spring blossom",
    day: ["#6ec2f2", "#fde6f0"],
    nightSky: ["#120c30", "#3a2050"],
    motes: ["motePink", "moteLilac", "moteWhite"],
  },
  summer: {
    sky: [
      [0, "#ffa63a", "#ffe08a"],
      [1100, "#ff8a2a", "#ffd070"],
      [2000, "#e85a4a", "#ffb058"],
      [3000, "#4a2a6a", "#e8784a"],
      [4200, "#101030", "#3a2a4a"],
    ],
    ground: ["#8acc5a", "#62b044", "#3e8a30"],
    leaves: ["#ffd23f", "#ffffff", "#ff7aa6", "#b48cf2", "#7cc458"],
    pavers: ["#d2c2ae", "#bfac96", "#b09c86", "#c8b8a2"],
    hills: ["#e88a4a", "#3e8a40"],
    sunHalo: ["rgba(255,240,150,0.95)", "rgba(255,190,60,0.5)", "rgba(255,160,40,0)"],
    sunDisc: ["#ffffe0", "#ffe070", "#ffb030"],
    sunY: 48,
    band: "255,210,90",
    grade: "255,190,80",
    gradeA: 0.08,
    snow: false,
    welcome: "☀️ a warm summer",
    day: ["#2f9cf0", "#c4ecff"],
    nightSky: ["#0a0e2a", "#22305a"],
    motes: ["moteGold", "moteMint", "motePink"],
  },
};

export const W = 400;
const SPEED_MIN = 11;
const SPEED_MAX = 22;
const SPEED_TIERS = 6;
const FX_DUR = 1.1;
const FX_COL: Record<string, { rgb: string; rgb2: string; icon: string }> = {
  cola: { rgb: "228,30,43", rgb2: "255,255,255", icon: "🥤" },
  milka: { rgb: "160,135,230", rgb2: "235,225,255", icon: "🍫" },
  coffee: { rgb: "255,205,120", rgb2: "200,235,255", icon: "🧋" },
  pizza: { rgb: "255,150,40", rgb2: "255,220,90", icon: "🍕" },
};
const LANE_PX = 112;
const CAM_D = 6;
const FOCAL = LANE_PX * CAM_D;
const GRAV = 34;
const JUMP_V = 10.5;
const ROLL_T = 0.62;
const VIEW_Z = 80;
const STEP = 1 / 120;
const NEAR = -CAM_D + 0.35;
const SNACKS: SnackKind[] = ["cola", "milka", "coffee", "pizza"];

const SNACK_INFO: Record<SnackKind, { title: string; base: number; colors: string[]; perk: string; step: number }> = {
  cola: { title: "COCA-COLA ZERO RUSH!", base: 4, colors: ["#e41e2b", "#1a1a1a", "#ffffff"], perk: "colaLen", step: 0.75 },
  milka: { title: "MILKA SHIELD!", base: 7, colors: ["#8f7cc8", "#ffffff", "#c9bdf0"], perk: "milkaLen", step: 1.5 },
  coffee: { title: "ICED COFFEE FLIGHT!", base: 5.5, colors: ["#c58a4a", "#ffffff", "#9ad8ff"], perk: "coffeeLen", step: 1 },
  pizza: { title: "PIZZA MAGNET!", base: 9, colors: ["#ffcf4a", "#e8452c", "#f4a340"], perk: "pizzaLen", step: 2 },
};

const SIZES: Record<PropKind, [number, number]> = {
  tree0: [2.2, 3.2],
  tree1: [2.2, 3.2],
  tree2: [2.2, 3.2],
  tree3: [2.2, 3.2],
  tall0: [2.6, 5.0],
  tall1: [2.6, 5.0],
  tall2: [2.6, 5.0],
  lamp: [0.4, 2.6],
  bush: [1.2, 0.7],
  sign: [2.2, 1.7],
  logtrees: [4.2, 3.3],
  gate: [4.6, 3.4],
  signpost: [0.9, 1.7],
  board: [2.4, 1.95],
  mushroom: [0.95, 0.74],
  crystal: [0.75, 1.05],
};
const OB_W: Record<ObType, number> = { fence: 1.0, bench: 1.0, arch: 1.05, logs: 1.05, cart: 0.98, hedge: 0.96 };
const OB_H: Record<ObType, number> = { fence: 0.6, bench: 0.66, arch: 1.75, logs: 1.82, cart: 2.0, hedge: 2.0 };

const PHRASES = [
  "Sweethearts!",
  "Running to you!",
  "Love is in the air!",
  "Cloud nine!",
  "Hand in hand!",
  "Over the moon!",
  "Soulmates!",
  "Forever & always!",
  "Written in the stars!",
  "Infinite love!",
];
const SKY_TEXT = "TE DUA GIRL";
const UFO_LINE = "Hallall ju koft o ju dy!!";
const UFO_DUR = 7.2;

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cb: GameCallbacks;
  sfx = new Sfx();
  state: GameState = "menu";
  previewMode = false;

  H = 700;
  scale = 1;
  dpr = 1;
  raf = 0;
  last = 0;
  acc = 0;
  time = 0;

  showTouchUI = false;
  look: Look = { ...DEFAULT_LOOK };
  perks: Record<string, number> = {};
  best = 0;
  runPowers = 0;
  multiplier = 1;
  stats = { jumped: 0, slid: 0, dodged: 0 };

  safeTop = 0;
  safeBottom = 0;
  cssW = 400;
  cssH = 700;
  // phones have 3x screens; 1.5x is visually near-identical and ~4x cheaper to fill
  dprCap = 1.5;
  lowFx = false;
  slowFrames = 0;
  fastFrames = 0;
  qualityT = 0;

  horizon = 250;
  playerY = 600;
  camH = 3;
  camX = 0;
  view = 0;

  p = { lane: 1, x: 0, y: 0, vy: 0, roll: 0, phase: 0, squash: 0, crashed: false, crashT: 0 };
  stumbles: number[] = [];

  dist = 0;
  speed = 0;
  startRamp = 0;
  obs: Ob[] = [];
  picks: Pick[] = [];
  props: Prop[] = [];
  leaves: Leaf[] = [];
  leafZ = 0;
  nextSignZ = 55;
  boardCount = 0;
  nextLampZ = 4;
  lampSide = 1;
  nextRowZ = 0;
  nextPropZ = 0;
  rowCount = 0;
  hedgeUntil = [-1, -1, -1];

  pw: Record<SnackKind, number> = { cola: 0, milka: 0, coffee: 0, pizza: 0 };
  pwMax: Record<SnackKind, number> = { cola: 1, milka: 1, coffee: 1, pizza: 1 };
  invT = 0;
  angelLeft = 0;
  angelFx = 0;

  bonus = 0;
  hearts = 0;
  combo = 0;
  comboT = 0;
  nextMilestone = 500;
  milestoneIdx = 0;
  banner: { text: string; sub: string; life: number; max: number } | null = null;

  parts: Particle[] = [];
  texts: FText[] = [];
  trauma = 0;
  hitStop = 0;
  flash = 0;
  flashColor = "255,255,255";
  emitT = 0;
  dustT = 0;
  snowT = 0;
  lampSpots: { x: number; y: number; s: number; gx: number; gy: number; gw: number }[] = [];
  magicSpots: { x: number; y: number; s: number; k: string }[] = [];
  motes: { x: number; y: number; vx: number; vy: number; ph: number; c: number; s: number }[] = [];
  stars: { x: number; y: number; s: number; ph: number }[] = [];

  cloudX = 0;
  smoke: { x: number; y: number; age: number; r: number; life: number }[] = [];
  smokePts: { x: number; y: number }[] | null = null;
  smokeW = 0;
  plane: { x: number; y: number; t: number; idx: number; textX: number; textY: number } | null = null;
  planeT = 8;
  birds: {
    x: number;
    y: number;
    vx: number;
    t: number;
    heart: boolean;
    form: number;
    formStart: number;
    birds: Bird[];
    chirped: boolean;
  } | null = null;
  birdT = 5;
  ufo: { t: number; y: number; dir: number } | null = null;
  ufoT = 4;

  // shop preview bounce
  pvY = 0;
  pvV = 0;

  spr = new Map<string, HTMLCanvasElement>();
  theme: ParkTheme = "autumn";
  T: ThemeCfg = THEMES.autumn;

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks, preview = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.cb = cb;
    this.previewMode = preview;
    for (let i = 0; i < 120; i++) this.stars.push({ x: Math.random(), y: Math.random(), s: rand(0.6, 2), ph: rand(0, 6.28) });

    try {
      void document.fonts?.ready.then(() => {
        this.spr.clear();
        this.smokePts = null;
      });
    } catch {
      /* ignore */
    }
    this.resetWorld();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  /** Sprites that are pure light sources / UI and must NOT be dimmed by the ambient light. */
  static UNLIT = new Set([
    "warmLight",
    "lampGlow",
    "lampPool",
    "glow",
    "redGlow",
    "lilacGlow",
    "shroomGlow",
    "crystalGlow",
    "heartGlow",
    "vignette",
    "cola",
    "milka",
    "coffee",
    "pizza",
    "heart",
    "cloudHeart",
    "cloudWordV",
    "cloudWordA",
  ]);

  /** Cached sprite, with the current time-of-day ambient dimming baked in (computed once). */
  S(name: string) {
    let c = this.spr.get(name);
    if (!c) {
      c = buildSprite(name);
      if (!Game.UNLIT.has(name)) this.tint(c);
      this.spr.set(name, c);
    }
    return c;
  }

  /** Bake the ambient dim + colour grade into a sprite (source-atop keeps transparency). */
  tint(c: HTMLCanvasElement) {
    const amb = AMBIENT[this.tod];
    const g = c.getContext("2d");
    if (!g) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = `rgba(${amb.col},${amb.ground})`;
    g.fillRect(0, 0, c.width, c.height);
    const gA = this.T.gradeA * amb.grade;
    if (gA > 0) {
      g.fillStyle = `rgba(${this.T.grade},${gA})`;
      g.fillRect(0, 0, c.width, c.height);
    }
    g.restore();
  }

  /** Composite an ambient overlay colour onto a base colour (for procedurally drawn things). */
  lit(hex: string) {
    const key = hex + this.tod + this.theme;
    let v = this.litCache.get(key);
    if (!v) {
      const amb = AMBIENT[this.tod];
      const [r, gg, b] = amb.col.split(",").map(Number);
      const n = parseInt(hex.slice(1), 16);
      let R = (n >> 16) & 255;
      let G = (n >> 8) & 255;
      let B = n & 255;
      const a = amb.ground;
      R = R * (1 - a) + r * a;
      G = G * (1 - a) + gg * a;
      B = B * (1 - a) + b * a;
      const gA = this.T.gradeA * amb.grade;
      if (gA > 0) {
        const [gr, g2, gb] = this.T.grade.split(",").map(Number);
        R = R * (1 - gA) + gr * gA;
        G = G * (1 - gA) + g2 * gA;
        B = B * (1 - gA) + gb * gA;
      }
      v = `rgb(${Math.round(R)},${Math.round(G)},${Math.round(B)})`;
      this.litCache.set(key, v);
    }
    return v;
  }
  litCache = new Map<string, string>();


  tod: TimeOfDay = "evening";
  setTimeOfDay(t: TimeOfDay) {
    this.tod = t === "day" || t === "night" ? t : "evening";
    this.spr.clear(); // re-bake ambient into sprites
    this.litCache.clear();
    if (this.state !== "playing") this.render();
  }
  lampA() {
    return this.tod === "day" ? 0.15 : this.tod === "evening" ? 0.6 : 0.95;
  }

  setTheme(t: ParkTheme) {
    if (!THEMES[t]) t = "autumn";
    this.theme = t;
    this.T = THEMES[t];
    setSpriteTheme(t);
    this.spr.clear();
    this.litCache.clear();
    if (this.state !== "playing") this.render();
  }

  // ------------------------------------------------------------------ layout
  setSafeArea(topPx: number, bottomPx: number) {
    const k = W / Math.max(1, this.cssW);
    this.safeTop = topPx * k;
    this.safeBottom = bottomPx * k;
  }

  resize(cw: number, ch: number) {
    this.cssW = cw;
    this.cssH = ch;
    this.dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), Math.max(0.75, this.dprCap));
    this.canvas.width = Math.max(1, Math.round(cw * this.dpr));
    this.canvas.height = Math.max(1, Math.round(ch * this.dpr));
    this.canvas.style.width = cw + "px";
    this.canvas.style.height = ch + "px";
    this.scale = (cw / W) * this.dpr;
    this.H = (ch / Math.max(1, cw)) * W;
    this.updateCamera();
    if (this.state !== "playing") this.render();
  }

  updateCamera() {
    const v = this.view;
    const H = this.H;
    this.horizon = lerp(H * 0.27, H * 0.36, v);
    this.playerY = lerp(H * 0.5, H * 0.84 - this.safeBottom * 0.4, v);
    this.camH = (this.playerY - this.horizon) / LANE_PX;
  }

  P(x: number, y: number, rel: number) {
    const zz = rel + CAM_D;
    if (zz < 0.25) return null;
    const s = FOCAL / zz;
    return { x: W / 2 + (x - this.camX) * s, y: this.horizon + (this.camH - y) * s, s };
  }

  zToY(rel: number) {
    const zz = rel + CAM_D;
    if (zz < 0.25) return this.H + 60;
    return this.horizon + (this.camH * FOCAL) / zz;
  }

  night() {
    return this.tod === "night" ? 1 : 0;
  }

  // ------------------------------------------------------------------ state
  setState(s: GameState) {
    this.state = s;
    this.cb.onState(s);
  }

  start() {
    this.sfx.unlock();
    this.resetWorld();
    this.setState("playing");
    this.angelLeft = this.perks.angel || 0;
    const cs = this.perks.coffeeStart || 0;
    if (cs > 0) this.activate("coffee", 3 * cs, true);
    this.burst(W / 2, this.playerY - 40, 18, ["#ff5c93", "#ffd1e3", "#fff"], 1);
    this.banner = {
      text: "Welcome to Taukbashqe",
      sub: `${this.T.welcome} ${TOD_WORD[this.tod]} · our first date 💕`,
      life: 2.8,
      max: 2.8,
    };
  }
  pause() {
    if (this.state === "playing") this.setState("paused");
  }
  resume() {
    if (this.state === "paused") {
      this.last = performance.now();
      this.setState("playing");
    }
  }
  toMenu() {
    this.resetWorld();
    this.setState("menu");
  }
  setMuted(m: boolean) {
    this.sfx.muted = m;
  }
  boost() {
    this.jump();
  }
  vibrate(ms: number) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* ignore */
    }
  }

  get score() {
    return Math.floor((Math.floor(this.dist) + this.bonus) * this.multiplier);
  }

  revive() {
    if (this.state !== "over") return;
    const p = this.p;
    p.crashed = false;
    p.crashT = 0;
    p.y = 0;
    p.vy = 0;
    p.roll = 0;
    this.stumbles = [];
    for (const o of this.obs) if (o.z - this.dist < 16 && o.z + o.len - this.dist > -3) o.gone = true;
    this.invT = 3;
    this.angelFx = 1.6;
    this.startRamp = 0.4;
    this.trauma = 0.3;
    this.sfx.milestone();
    const s = this.P(p.x, 0.6, 0);
    if (s) this.burst(s.x, s.y, 36, ["#ffffff", "#ffd1e3", "#ff5c93", "#ffd36e"], 1.4, 0.6);
    this.addText(W / 2, this.H * 0.32, "Love never gives up! 💖", "#ffffff", 24);
    this.last = performance.now();
    this.setState("playing");
  }

  resetWorld() {
    const p = this.p;
    Object.assign(p, { lane: 1, x: 0, y: 0, vy: 0, roll: 0, squash: 0, crashed: false, crashT: 0 });
    this.camX = 0;
    this.stumbles = [];
    this.dist = 0;
    this.speed = 0;
    this.startRamp = 0;
    this.obs = [];
    this.picks = [];
    this.props = [
      { kind: "gate", x: 0, z: 4.5 },
      { kind: "sign", x: -3.3, z: 10 },
      { kind: "logtrees", x: 4.1, z: 14 },
      { kind: "lamp", x: -1.95, z: 1.5 },
      { kind: "lamp", x: 1.95, z: 1.5 },
      { kind: "lamp", x: 1.95, z: 9 },
      { kind: "mushroom", x: -2.1, z: 6.5 },

    ];
    this.leaves = [];
    this.leafZ = -CAM_D;
    this.nextSignZ = 55;
    this.boardCount = 0;
    this.nextLampZ = 4;
    this.lampSide = 1;
    this.nextPropZ = 19;
    this.nextRowZ = 36;
    this.rowCount = 0;
    this.hedgeUntil = [-1, -1, -1];
    for (const k of SNACKS) this.pw[k] = 0;
    this.invT = 0;
    this.angelFx = 0;
    this.runPowers = 0;
    this.stats = { jumped: 0, slid: 0, dodged: 0 };
    this.streak = 0;
    this.bestStreak = 0;
    this.lastTier = 0;
    this.tierFx = 0;
    this.fx = null;
    this.bonus = 0;
    this.hearts = 0;
    this.combo = 0;
    this.nextMilestone = 500;
    this.milestoneIdx = 0;
    this.banner = null;
    this.parts = [];
    this.texts = [];
    this.trauma = 0;
    this.hitStop = 0;
    this.flash = 0;
    this.acc = 0;
    this.plane = null;
    this.smoke = [];
    this.planeT = 8;
    this.ufo = null;
    this.ufoT = 4;
    for (let i = 0; i < 12; i++) this.picks.push({ kind: "heart", x: 0, y: 0.45, z: 9 + i * 1.5, taken: false, fly: false, ph: i * 0.5 });
    for (let i = 0; i < 6; i++)
      this.picks.push({ kind: "heart", x: -Math.min(1, i * 0.25), y: 0.45, z: 27 + i * 1.5, taken: false, fly: false, ph: i * 0.5 });
    this.genWorld();
  }

  // ------------------------------------------------------------------ generation
  /**
   * Subway-Surfers-style speed curve: quick early ramp, then it keeps creeping up
   * but levels off at a playable cap (never becomes impossible).
   *   0m → 11 · 500m → ~13.9 · 1000m → ~16 · 2000m → ~18.9 · 3000m → ~20.3 · cap 22
   */
  baseSpeed() {
    return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * (1 - Math.exp(-this.dist / 1600));
  }
  speedTier() {
    return Math.min(SPEED_TIERS, Math.floor(((this.baseSpeed() - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * SPEED_TIERS + 0.0001));
  }
  lastTier = 0;
  tierFx = 0;

  // booster activation effect
  fx: { kind: SnackKind; t: number } | null = null;

  streak = 0;
  bestStreak = 0;
  addStreak() {
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.bonus += Math.min(50, 5 * this.streak);
    if (this.streak % 10 === 0) {
      const extra = this.streak * 10;
      this.bonus += extra;
      this.addText(W / 2, this.H * 0.34, `🔥 ${this.streak} STREAK! +${extra}`, "#ffd36e", 26);
      this.sfx.milestone();
      this.trauma = Math.min(1, this.trauma + 0.25);
      this.flash = 0.22;
      this.flashColor = "255,210,120";
      this.vibrate(30);
    } else {
      const f = 760 + Math.min(this.streak, 24) * 28;
      this.sfx.tone(f, f * 1.25, 0.06, "triangle", 0.07);
    }
  }

  closeCall(o: Ob) {
    o.counted = true;
    this.stats.dodged++;
    this.bonus += 25;
    this.hitStop = 0.035;
    this.addStreak();
    this.sfx.tone(1200, 1700, 0.1, "sine", 0.12);
    const s = this.P(this.p.x, 1.4, 0);
    if (s) {
      this.addText(s.x, s.y - 20, "CLOSE CALL! +25", "#9ae6ff", 20);
      this.burst(s.x, s.y + 20, 10, ["#9ae6ff", "#ffffff", "#ffd36e"], 0.6, 0);
    }
  }

  genWorld() {
    while (this.leafZ < this.dist + 34) {
      for (let i = 0; i < 5; i++) {
        const onRoad = Math.random() < 0.45;
        this.leaves.push({
          x: onRoad ? rand(-1.6, 1.6) : (Math.random() < 0.5 ? -1 : 1) * rand(1.7, 4.5),
          z: this.leafZ + rand(0, 1),
          r: rand(0, Math.PI),
          c: Math.floor(Math.random() * 5),
          s: rand(0.05, 0.09),
        });
      }
      this.leafZ += 1;
    }
    while (this.nextSignZ < this.dist + VIEW_Z) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.boardCount++;
      if (this.boardCount % 3 === 0) this.props.push({ kind: "signpost", x: side * 2.15, z: this.nextSignZ });
      else {
        this.props.push({ kind: "board", x: side * 2.75, z: this.nextSignZ });
        this.props.push({ kind: "lamp", x: side * 1.95, z: this.nextSignZ - 1.2 });
      }
      this.nextSignZ += rand(70, 100);
    }
    // a steady, cozy row of yellow park lamps lining both sides of the path
    while (this.nextLampZ < this.dist + VIEW_Z) {
      this.lampSide = -this.lampSide;
      this.props.push({ kind: "lamp", x: this.lampSide * 1.95, z: this.nextLampZ });
      this.nextLampZ += 5.5;
    }
    const pickTree = () => TREES[Math.floor(Math.random() * TREES.length)];
    while (this.nextPropZ < this.dist + VIEW_Z) {
      for (const side of [-1, 1]) {
        const r = Math.random();
        let kind: PropKind = pickTree();
        let x = side * rand(2.7, 3.5);
        if (r < 0.08) {
          kind = "bush";
          x = side * rand(2.3, 2.7);
        } else if (r < 0.16) {
          kind = "bush";
          x = side * rand(2.2, 2.7);
        } else if (r < 0.26) {
          kind = "mushroom";
          x = side * rand(2.25, 2.6);
        }
        this.props.push({ kind, x, z: this.nextPropZ + rand(-0.6, 0.6) });
        this.props.push({ kind: pickTree(), x: side * rand(4.2, 5.3), z: this.nextPropZ + rand(0.4, 1.6) });
        if (Math.random() < 0.35) this.props.push({ kind: pickTree(), x: side * rand(5.8, 7.2), z: this.nextPropZ + rand(-1, 1) });
      }
      this.nextPropZ += rand(2.3, 3.2);
    }
    while (this.nextRowZ < this.dist + VIEW_Z) {
      this.genRow(this.nextRowZ);
      const sp = Math.max(11, this.baseSpeed());
      let gap = sp * rand(0.85, 1.2);
      // quick back-to-back rows keep you on your toes
      if (this.dist > 400 && Math.random() < 0.24) gap = sp * 0.62;
      this.nextRowZ += Math.max(7, gap);
    }
  }

  genRow(z: number) {
    const d = clamp(this.dist / 2200, 0, 1);
    this.rowCount++;
    const kinds: (ObType | null)[] = [null, null, null];
    const hedgeActive = [0, 1, 2].map((l) => this.hedgeUntil[l] > z - 1);
    const pHedge = 0.06 + d * 0.08;
    const pBox = 0.08 + d * 0.1;
    const pLow = 0.22;
    const pArch = 0.15 + d * 0.06;
    for (let l = 0; l < 3; l++) {
      if (hedgeActive[l]) continue;
      const r = Math.random();
      if (r < pHedge && l !== 1) kinds[l] = "hedge";
      else if (r < pHedge + pBox) kinds[l] = Math.random() < 0.6 ? "logs" : "cart";
      else if (r < pHedge + pBox + pLow) kinds[l] = Math.random() < 0.55 ? "bench" : "fence";
      else if (r < pHedge + pBox + pLow + pArch) kinds[l] = "arch";
    }
    const isBlock = (l: number) => hedgeActive[l] || (kinds[l] !== null && isBlockType(kinds[l]!));
    if (isBlock(1) && (isBlock(0) || isBlock(2))) kinds[1] = Math.random() < 0.5 ? "bench" : null;
    let guard = 0;
    while ([0, 1, 2].filter(isBlock).length >= 3 && guard++ < 5) {
      const l = [0, 2].find((q) => !hedgeActive[q] && kinds[q] !== null && isBlockType(kinds[q]!));
      if (l === undefined) break;
      kinds[l] = null;
    }
    if (this.rowCount <= 3) {
      let kept = false;
      for (let l = 0; l < 3; l++) {
        if (!kinds[l]) continue;
        if (kept || kinds[l] === "hedge") kinds[l] = null;
        else kept = true;
      }
      if (!kept) kinds[Math.floor(Math.random() * 3)] = "bench";
    }
    for (let l = 0; l < 3; l++) {
      const k = kinds[l];
      if (!k) continue;
      let len = 0.35;
      if (k === "logs" || k === "cart") len = 0.9;
      if (k === "hedge") {
        len = rand(6, 10);
        this.hedgeUntil[l] = z + len + 3;
      }
      this.obs.push({
        type: k,
        lane: l,
        z,
        len,
        y0: k === "arch" ? 1.0 : 0,
        y1: k === "fence" ? 0.55 : k === "bench" ? 0.6 : k === "arch" ? 1.75 : 2.1,
        gone: false,
        passed: false,
        counted: false,
      });
    }
    const open = [0, 1, 2].filter((l) => !isBlock(l));
    if (open.length && Math.random() < 0.85) {
      const l = open[Math.floor(Math.random() * open.length)];
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const hz = z - (n - 1) * 0.7 + i * 1.4;
        let y = 0.45;
        if (kinds[l] === "fence" || kinds[l] === "bench") {
          const u = (hz - z) / 3;
          if (Math.abs(u) < 1) y = 0.45 + 1.1 * (1 - u * u);
        } else if (kinds[l] === "arch") y = 0.32;
        this.picks.push({ kind: "heart", x: l - 1, y, z: hz, taken: false, fly: false, ph: i * 0.6 });
      }
    }
    const luck = 1 + (this.perks.lucky || 0) * 0.35;
    if (this.rowCount === 4 || (this.rowCount > 6 && Math.random() < 0.065 * luck)) {
      const sz = z - 4.5;
      const free = [0, 1, 2].filter(
        (l) => this.hedgeUntil[l] < sz - 1 && !this.obs.some((o) => o.lane === l && o.z - 2.5 < sz && o.z + o.len + 2.5 > sz),
      );
      if (free.length) {
        const l = free[Math.floor(Math.random() * free.length)];
        const kind: SnackKind = this.rowCount === 4 ? "cola" : SNACKS[Math.floor(Math.random() * SNACKS.length)];
        this.picks.push({ kind, x: l - 1, y: 0.62, z: sz, taken: false, fly: false, ph: rand(0, 6) });
      }
    }
  }

  // ------------------------------------------------------------------ controls
  moveLane(dir: number) {
    if (this.state !== "playing" || this.p.crashed) return;
    const t = this.p.lane + dir;
    if (t < 0 || t > 2) {
      this.trauma = Math.min(1, this.trauma + 0.12);
      this.sfx.bump();
      return;
    }
    const safe = this.pw.cola > 0 || this.pw.milka > 0 || this.pw.coffee > 0 || this.invT > 0;
    if (!safe && this.blockedAt(t)) {
      this.stumble();
      return;
    }
    const from = this.p.lane;
    this.p.lane = t;
    this.sfx.lane(dir);
    // dodging at the last moment = close call bonus
    if (!safe) {
      const near = this.obs.find(
        (o) => !o.gone && !o.counted && o.lane === from && isBlockType(o.type) && o.z - this.dist > 0 && o.z - this.dist < 1.6 && this.p.y < o.y1,
      );
      if (near) this.closeCall(near);
    }
  }

  blockedAt(l: number) {
    return this.obs.some(
      (o) => !o.gone && o.lane === l && isBlockType(o.type) && o.z - this.dist < 0.6 && o.z + o.len - this.dist > -0.5 && this.p.y < o.y1,
    );
  }

  jump() {
    if (this.state !== "playing" || this.p.crashed || this.pw.coffee > 0) return;
    const p = this.p;
    if (p.y <= 0.001) {
      p.vy = JUMP_V;
      p.roll = 0;
      p.squash = 0.3;
      this.sfx.jump(1);
      this.dust(5);
    }
  }

  roll() {
    if (this.state !== "playing" || this.p.crashed || this.pw.coffee > 0) return;
    const p = this.p;
    if (p.y > 0.01) p.vy = Math.min(p.vy, -20);
    p.roll = ROLL_T;
    this.sfx.slide();
  }

  stumble() {
    const now = this.time;
    this.stumbles = this.stumbles.filter((t) => now - t < 5);
    this.stumbles.push(now);
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.flash = 0.35;
    this.flashColor = "255,60,90";
    this.sfx.hurt();
    this.vibrate(60);
    const s = this.P(this.p.x, 1, 0);
    if (s) this.addText(s.x, s.y - 30, this.streak >= 5 ? `Streak lost (${this.streak}) 💔` : "Careful! 💔", "#ffd36e", 22);
    this.streak = 0;
    if (this.stumbles.length >= 2) this.crash();
  }

  // ------------------------------------------------------------------ loop
  adaptQuality(rawDt: number) {
    if (this.state !== "playing") return;
    this.qualityT += rawDt;
    if (rawDt > 1 / 45) this.slowFrames++;
    else this.fastFrames++;
    if (this.qualityT < 1.5) return;
    const total = this.slowFrames + this.fastFrames;
    if (total && this.slowFrames / total > 0.2) {
      if (this.dprCap > 1) {
        this.dprCap = Math.max(1, this.dprCap - 0.25);
        this.resize(this.cssW, this.cssH);
      } else if (!this.lowFx) {
        this.lowFx = true; // last resort: fewer particles / no aurora
      } else if (this.dprCap > 0.75) {
        this.dprCap = 0.75;
        this.resize(this.cssW, this.cssH);
      }
    }
    this.qualityT = 0;
    this.slowFrames = 0;
    this.fastFrames = 0;
  }

  loop = (now: number) => {
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, Math.max(0, raw));
    this.last = now;
    if (raw < 0.25) this.adaptQuality(raw);
    if (this.state !== "paused") {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 8) {
        this.update(STEP);
        this.acc -= STEP;
        n++;
      }
    }
    try {
      this.render();
    } catch (e) {
      console.error(e);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    this.time += dt;
    if (this.previewMode) {
      this.pvV += 1300 * dt;
      this.pvY += this.pvV * dt;
      if (this.pvY >= 0) {
        this.pvY = 0;
        this.pvV = -420;
        this.p.squash = 0.35;
      }
      this.p.squash = Math.max(0, this.p.squash - dt * 2.2);
      this.updateParticles(dt);
      return;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    this.updateParticles(dt);
    this.updateSky(dt);
    if (this.T.snow) {
      this.snowT -= dt;
      if (this.snowT <= 0 && this.parts.length < (this.lowFx ? 100 : 200)) {
        this.snowT = this.lowFx ? 0.1 : 0.06;
        const life = rand(3, 5);
        this.parts.push({ x: rand(-20, W + 20), y: rand(-10, this.H * 0.4), vx: rand(-14, 6), vy: rand(30, 60), life, max: life, size: rand(1.2, 2.8), color: "rgba(255,255,255,0.9)", kind: 0, g: 0, rot: 0, vr: 0 });
      }
    }
    const target = this.state === "menu" ? 0 : 1;
    this.view += (target - this.view) * (1 - Math.exp(-dt * 3.2));
    this.updateCamera();

    if (this.state === "menu") {
      const p = this.p;
      p.phase += dt * 7;
      p.y = Math.abs(Math.sin(p.phase)) * 0.05;
      this.camX += (0 - this.camX) * (1 - Math.exp(-dt * 6));
      this.emitTrail(dt);
      return;
    }
    if (this.state === "over") {
      this.p.crashT += dt;
      return;
    }
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    this.updatePlay(dt);
  }

  updateMotes(dt: number, run: number) {
    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(this.time * 0.7 + m.ph) * 10) * dt;
      m.y += (m.vy + Math.cos(this.time * 0.9 + m.ph) * 6) * dt;
      if (run > 0 && m.y > this.horizon) {
        m.x += (m.x - W / 2) * run * 0.012 * dt;
        m.y += (m.y - this.horizon) * run * 0.01 * dt;
      }
      if (m.y < -20 || m.y > this.H + 20 || m.x < -30 || m.x > W + 30) {
        m.x = rand(20, W - 20);
        m.y = run > 0 ? rand(this.horizon - 30, this.horizon + 80) : rand(this.H * 0.2, this.H);
      }
    }
  }

  updatePlay(dt: number) {
    const p = this.p;
    this.startRamp = Math.min(1, this.startRamp + dt * 1.3);
    // booster effect timer
    if (this.fx) {
      this.fx.t += dt;
      if (this.fx.t >= FX_DUR) this.fx = null;
    }
    // speed-up announcements (Subway style)
    const tier = this.speedTier();
    if (tier > this.lastTier) {
      this.lastTier = tier;
      this.tierFx = 1;
      this.addText(W / 2, this.H * 0.42, tier >= SPEED_TIERS ? "⚡ MAX SPEED! ⚡" : "⚡ SPEED UP!", "#9ae6ff", tier >= SPEED_TIERS ? 28 : 24);
      this.sfx.tone(300, 1400, 0.45, "sawtooth", 0.06);
      this.sfx.tone(600, 1800, 0.35, "sine", 0.1, 0.05);
      this.trauma = Math.min(1, this.trauma + 0.2);
    }
    if (this.tierFx > 0) this.tierFx = Math.max(0, this.tierFx - dt * 1.2);
    this.powerParticles(dt);
    const mult = this.pw.cola > 0 ? 1.75 : 1;
    const tgt = this.baseSpeed() * mult * this.startRamp;
    this.speed += (tgt - this.speed) * (1 - Math.exp(-dt * 4));
    this.dist += this.speed * dt;

    p.x += (p.lane - 1 - p.x) * (1 - Math.exp(-dt * 16));
    this.camX += (p.x * 0.55 - this.camX) * (1 - Math.exp(-dt * 8));

    if (this.pw.coffee > 0) {
      p.vy = 0;
      p.y += (3.1 - p.y) * (1 - Math.exp(-dt * 5));
    } else if (p.y > 0 || p.vy > 0) {
      p.vy -= GRAV * dt;
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        if (p.vy < -5) {
          p.squash = 0.35;
          this.dust(6);
        }
        p.vy = 0;
      }
    }
    if (p.roll > 0) p.roll -= dt;
    p.phase += dt * (8 + this.speed * 0.45);
    p.squash = Math.max(0, p.squash - dt * 3);

    for (const k of SNACKS) {
      if (this.pw[k] > 0) {
        this.pw[k] -= dt;
        if (this.pw[k] <= 0) {
          this.pw[k] = 0;
          if (k === "coffee") this.invT = Math.max(this.invT, 1.3);
          if (k === "cola" || k === "milka") this.invT = Math.max(this.invT, 0.8);
        }
      }
    }
    if (this.invT > 0) this.invT -= dt;
    if (this.angelFx > 0) this.angelFx -= dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;

    this.collide();
    if (this.state !== "playing") return;
    this.collectPicks(dt);

    for (const o of this.obs) {
      if (o.counted || o.gone) continue;
      if (o.z + o.len - this.dist > -0.4) continue;
      o.counted = true;
      if (o.lane !== p.lane) {
        if (isBlockType(o.type) && Math.abs(o.lane - p.lane) === 1) this.stats.dodged++;
        continue;
      }
      if (o.type === "fence" || o.type === "bench") this.stats.jumped++;
      else if (o.type === "arch") this.stats.slid++;
    }

    const d = this.dist;
    this.obs = this.obs.filter((o) => !o.gone && o.z + o.len - d > -CAM_D);
    this.picks = this.picks.filter((k) => !k.taken && k.z - d > -3);
    this.props = this.props.filter((pr) => pr.z - d > -CAM_D);
    if (this.leaves.length && this.leaves[0].z - d < -CAM_D) this.leaves = this.leaves.filter((l) => l.z - d > -CAM_D);
    this.genWorld();

    if (this.dist >= this.nextMilestone) {
      this.banner = {
        text: PHRASES[Math.min(this.milestoneIdx, PHRASES.length - 1)],
        sub: `${this.nextMilestone}m through Taukbashqe`,
        life: 1.8,
        max: 1.8,
      };
      this.milestoneIdx++;
      this.nextMilestone += 500;
      this.bonus += 100;
      this.sfx.milestone();
      this.trauma = Math.min(1, this.trauma + 0.2);
      for (let i = 0; i < 3; i++) this.burst(rand(60, W - 60), this.H * rand(0.2, 0.35), 14, ["#ffd36e", "#ff5c93", "#9ae6ff", "#fff"], 1.2);
    }

    this.emitTrail(dt);
    if (p.y <= 0.01 && p.roll <= 0) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.12;
        this.dust(1);
      }
    }
  }

  collide() {
    const p = this.p;
    if (this.pw.coffee > 0 && p.y > 2.2) return;
    const top = p.y + (p.roll > 0 ? 0.5 : 1.15);
    for (const o of this.obs) {
      if (o.gone) continue;
      const rel = o.z - this.dist;
      if (rel > 0.35 || rel + o.len < -0.35) continue;
      if (Math.abs(p.x - (o.lane - 1)) > 0.5) continue;
      if (p.y >= o.y1 - 0.03 || top <= o.y0) continue;
      if (this.pw.cola > 0) {
        this.smash(o);
        continue;
      }
      if (this.pw.milka > 0 || this.invT > 0 || this.pw.coffee > 0) {
        if (!o.passed) {
          o.passed = true;
          if (this.pw.milka > 0) this.sfx.tone(700, 1100, 0.1, "sine", 0.15);
        }
        continue;
      }
      if (this.angelLeft > 0) {
        this.angelRescue();
        return;
      }
      this.crash();
      return;
    }
  }

  smash(o: Ob) {
    o.gone = true;
    this.bonus += 25;
    this.trauma = Math.min(1, this.trauma + 0.3);
    this.hitStop = 0.03;
    this.sfx.stomp();
    this.vibrate(20);
    const s = this.P(o.lane - 1, 0.7, 0.6);
    if (s) {
      const cols =
        o.type === "hedge"
          ? ["#6a4428", "#c8925a", "#8a5e3a"]
          : o.type === "logs"
            ? ["#c8925a", "#5a3418", "#f2cf96"]
            : o.type === "cart"
              ? ["#ff8fbf", "#89cff0", "#ffd36e"]
              : o.type === "arch"
                ? ["#ff4f8b", "#ffffff", "#4f9e57"]
                : ["#c98a4f", "#ffffff", "#ff8fbf"];
      this.burst(s.x, s.y, 24, cols, 1.4, 0.2);
      this.addText(s.x, s.y - 30, "+25 💥", "#ffffff", 20);
    }
  }

  angelRescue() {
    this.angelLeft--;
    this.angelFx = 1.8;
    this.invT = 2.4;
    for (const o of this.obs) if (o.z - this.dist < 12 && o.z + o.len - this.dist > -2) o.gone = true;
    this.trauma = 0.6;
    this.hitStop = 0.08;
    this.sfx.spring();
    this.sfx.milestone();
    this.vibrate(60);
    const s = this.P(this.p.x, 0.8, 0);
    if (s) this.burst(s.x, s.y, 36, ["#ffffff", "#fff4c2", "#ffd36e", "#ffd1e3"], 1.5, 0.5);
    this.addText(W / 2, this.H * 0.32, "Guardian Angel! 😇", "#fff4c2", 26);
  }

  crash() {
    if (this.state !== "playing") return;
    const p = this.p;
    p.crashed = true;
    p.crashT = 0;
    this.sfx.die();
    this.trauma = 1;
    this.flash = 0.6;
    this.flashColor = "255,255,255";
    this.vibrate(150);
    const s = this.P(p.x, 0.7, 0);
    if (s) this.burst(s.x, s.y, 30, ["#ff5c93", "#ffd1e3", "#fff"], 1.4, 0.7);
    const res: GameResult = {
      score: this.score,
      height: Math.floor(this.dist),
      hearts: this.hearts,
      snacks: this.runPowers,
      jumped: this.stats.jumped,
      slid: this.stats.slid,
      dodged: this.stats.dodged,
    };
    this.best = Math.max(this.best, res.score);
    this.setState("over");
    this.cb.onGameOver(res);
  }

  collectPicks(dt: number) {
    const p = this.p;
    const magnet = this.pw.pizza > 0;
    const top = p.y + (p.roll > 0 ? 0.5 : 1.15) + 0.25;
    const k14 = Math.min(1, dt * 14);
    for (const k of this.picks) {
      if (k.taken) continue;
      const rel = k.z - this.dist;
      if (k.fly) {
        k.x += (p.x - k.x) * k14;
        k.y += (p.y + 0.6 - k.y) * k14;
        k.z += (this.dist + 0.1 - k.z) * k14;
        if (Math.abs(k.z - this.dist) < 0.35) this.take(k);
        continue;
      }
      if (magnet && k.kind === "heart" && rel < 10 && rel > -1) {
        k.fly = true;
        continue;
      }
      if (rel > 0.6 || rel < -0.6) continue;
      if (Math.abs(k.x - p.x) > 0.5) continue;
      if (k.y < p.y - 0.35 || k.y > top) continue;
      this.take(k);
    }
  }

  take(k: Pick) {
    k.taken = true;
    const s = this.P(k.x, k.y, Math.max(0, k.z - this.dist));
    if (k.kind === "heart") {
      const v = this.pw.pizza > 0 ? 2 : 1;
      this.hearts += v;
      this.bonus += 5 * v;
      this.combo = Math.min(this.combo + 1, 8);
      this.comboT = 0.6;
      this.sfx.heart(this.combo - 1);
      if (s) this.burst(s.x, s.y, 5, ["#ff3d7f", "#ff9ac1", "#fff"], 0.45, 0.3);
      return;
    }
    this.activate(k.kind);
  }

  activate(kind: SnackKind, durOverride?: number, quiet = false) {
    const info = SNACK_INFO[kind];
    const dur = durOverride ?? info.base + (this.perks[info.perk] || 0) * info.step;
    this.pw[kind] = dur;
    this.pwMax[kind] = dur;
    if (!quiet) {
      this.runPowers++;
      this.bonus += 50;
      this.trauma = Math.min(1, this.trauma + 0.22);
      this.hitStop = 0.04;
      this.vibrate(30);
      this.fx = { kind, t: 0 };
      this.flash = 0.22;
      this.flashColor = FX_COL[kind].rgb2;
      // small ring of sparkles around the couple
      const s0 = this.P(this.p.x, this.p.y + 0.6, 0);
      if (s0) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const sp = 150 + Math.random() * 40;
          const life = 0.7 + Math.random() * 0.3;
          this.parts.push({
            x: s0.x,
            y: s0.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp * 0.7,
            life,
            max: life,
            size: i % 3 === 0 ? 7 : 3,
            color: i % 2 ? `rgb(${FX_COL[kind].rgb})` : `rgb(${FX_COL[kind].rgb2})`,
            kind: i % 3 === 0 ? 1 : 2,
            g: 0,
            rot: 0,
            vr: 3,
          });
        }
      }
    }
    if (kind === "cola") this.sfx.fizz();
    else if (kind === "milka") this.sfx.boost();
    else if (kind === "coffee") {
      this.sfx.spring();
      this.p.roll = 0;
      const len = dur * Math.max(10, this.baseSpeed()) * 0.95;
      let lane = this.p.lane;
      for (let zz = 5, i = 0; zz < len; zz += 1.3, i++) {
        if (i % 9 === 8) lane = clamp(lane + (Math.random() < 0.5 ? -1 : 1), 0, 2);
        this.picks.push({ kind: "heart", x: lane - 1, y: 3.2, z: this.dist + zz, taken: false, fly: false, ph: i * 0.4 });
      }
    } else this.sfx.pizza();
    const s = this.P(this.p.x, this.p.y + 0.7, 0);
    if (s) this.burst(s.x, s.y, 12, info.colors, 0.8, 0.3);
  }

  /** Continuous particle effects while a power is active. */
  powerParticles(dt: number) {
    const s = this.P(this.p.x, this.p.y + 0.5, 0);
    if (!s || this.parts.length > (this.lowFx ? 120 : 220)) return;
    if (this.lowFx) dt *= 0.5;
    const u = s.s;
    const push = (x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, kind: 0 | 1 | 2, g: number) =>
      this.parts.push({ x, y, vx, vy, life, max: life, size, color, kind, g, rot: rand(0, 6), vr: rand(-4, 4) });
    if (this.pw.cola > 0 && Math.random() < dt * 24) {
      // fizzy bubbles + red/white streaks bursting from behind the couple
      push(s.x + rand(-0.4, 0.4) * u, s.y + rand(-0.2, 0.3) * u, rand(-80, 80), rand(60, 200), rand(0.4, 0.7), rand(2, 5), Math.random() < 0.5 ? "rgba(255,255,255,0.9)" : "#e41e2b", 0, -300);
    }
    if (this.pw.milka > 0 && Math.random() < dt * 14) {
      // lilac sparkles orbiting the shield
      const a = rand(0, Math.PI * 2);
      push(s.x + Math.cos(a) * 0.75 * u, s.y + Math.sin(a) * 0.65 * u, Math.cos(a) * 20, Math.sin(a) * 20, rand(0.4, 0.8), rand(3, 6), Math.random() < 0.5 ? "#ffffff" : "#c9bdf0", 2, 0);
    }
    if (this.pw.coffee > 0 && Math.random() < dt * 16) {
      // little cloud puffs trailing under the flying couple
      push(s.x + rand(-0.5, 0.5) * u, s.y + 0.3 * u, rand(-40, 40), rand(120, 220), rand(0.5, 0.9), rand(4, 8), "rgba(255,255,255,0.75)", 0, 0);
    }
    if (this.pw.pizza > 0 && Math.random() < dt * 12) {
      // golden sparkles spiralling inwards (magnet)
      const a = rand(0, Math.PI * 2);
      const r = rand(1.2, 1.8) * u;
      push(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.6, -Math.cos(a) * r * 2.2, -Math.sin(a) * r * 1.3, 0.45, rand(3, 5), Math.random() < 0.5 ? "#ffd36e" : "#ff9a3d", 2, 0);
    }
  }

  /** Big booster activation sequence + active-power screen effects. */
  drawBoostFx(ctx: CanvasRenderingContext2D) {
    const H = this.H;
    const s = this.P(this.p.x, this.p.y + 0.55, 0);
    const active = (["cola", "milka", "coffee", "pizza"] as SnackKind[]).filter((k) => this.pw[k] > 0);
    // 1) pulsing coloured edge aura while a power is active
    for (const k of active) {
      const c = FX_COL[k];
      const ending = this.pw[k] < 1.5;
      const pulse = ending ? 0.6 + Math.sin(this.time * 12) * 0.4 : 0.8 + Math.sin(this.time * 3) * 0.2;
      const g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.45, W / 2, H * 0.55, Math.max(W, H) * 0.8);
      g.addColorStop(0, `rgba(${c.rgb},0)`);
      g.addColorStop(1, `rgba(${c.rgb},${0.13 * pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // 2) coffee flight: wind streaks rushing past
    if (this.pw.coffee > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ph = (this.time * 1.8 + i * 0.137) % 1;
        const x = ((i * 97) % W) + Math.sin(i) * 20;
        const y = this.horizon + ph * (H - this.horizon) * 1.2 - 40;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (x - W / 2) * 0.08, y + 30 + ph * 50);
      }
      ctx.stroke();
    }
    // 3) activation sequence
    const fx = this.fx;
    if (!fx || !s) return;
    const c = FX_COL[fx.kind];
    const t = fx.t;
    // one gentle expanding ring around the couple
    if (t < 0.6) {
      const e = 1 - Math.pow(1 - t / 0.6, 3);
      ctx.globalAlpha = 0.55 * (1 - t / 0.6);
      ctx.strokeStyle = `rgb(${c.rgb2})`;
      ctx.lineWidth = 4 * (1 - e) + 1.5;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, e * W * 0.32, e * W * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // big title card: icon + name, pops in, wobbles, flies up & fades
    const info = SNACK_INFO[fx.kind];
    const inT = Math.min(1, t / 0.18);
    const pop = inT < 1 ? 0.6 + inT * 0.45 : 1.05 - Math.min(0.05, (t - 0.18) * 0.3);
    const out = t > FX_DUR - 0.3 ? (FX_DUR - t) / 0.3 : 1;
    const cy = H * 0.3 + this.safeTop * 0.5 - Math.max(0, t - FX_DUR + 0.3) * 60;
    ctx.save();
    ctx.globalAlpha = Math.max(0, out) * 0.95;
    ctx.translate(W / 2, cy);
    ctx.scale(pop * 0.75, pop * 0.75);
    // soft badge glow
    const bg = ctx.createRadialGradient(0, -24, 4, 0, -24, 60);
    bg.addColorStop(0, `rgba(${c.rgb2},0.55)`);
    bg.addColorStop(1, `rgba(${c.rgb},0)`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, -24, 60, 0, Math.PI * 2);
    ctx.fill();
    const img = this.S(fx.kind);
    ctx.drawImage(img, -24, -56, 48, 61);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 24px Fredoka, sans-serif";
    ctx.lineWidth = 6;
    ctx.strokeStyle = `rgba(${c.rgb},0.95)`;
    ctx.strokeText(info.title, 0, 30, W - 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(info.title, 0, 30, W - 30);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ fx
  burst(x: number, y: number, n: number, colors: string[], power = 1, hearts = 0.35) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > (this.lowFx ? 140 : 260)) break;
      const a = Math.random() * Math.PI * 2;
      const sp = rand(80, 320) * power;
      const isHeart = Math.random() < hearts;
      const life = rand(0.5, 1.0);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life,
        max: life,
        size: isHeart ? rand(8, 14) : rand(2.5, 5.5),
        color: colors[(Math.random() * colors.length) | 0],
        kind: isHeart ? 1 : Math.random() < 0.3 ? 2 : 0,
        g: 500,
        rot: rand(-0.5, 0.5),
        vr: rand(-4, 4),
      });
    }
  }

  dust(n: number) {
    const s = this.P(this.p.x, 0, 0);
    if (!s) return;
    for (let i = 0; i < n; i++) {
      const life = rand(0.3, 0.55);
      this.parts.push({ x: s.x + rand(-22, 22), y: s.y + rand(-2, 3), vx: rand(-60, 60), vy: rand(20, 90), life, max: life, size: rand(3, 6), color: "rgba(235,225,230,0.85)", kind: 0, g: 60, rot: 0, vr: 0 });
    }
  }

  addText(x: number, y: number, text: string, color: string, size = 18) {
    this.texts.push({ x, y, text, life: 1.2, max: 1.2, color, size });
  }

  emitTrailAt(x: number, y: number, headY: number) {
    const tr = this.look.trail;
    const premium = tr !== "t_hearts";
    const life = rand(0.7, 1.1);
    let color = "#ff5c93";
    let kind: 0 | 1 | 2 = 1;
    let size = rand(7, 11);
    let g = -10;
    let vy = rand(-70, -40);
    let yy = headY;
    let vx = rand(-20, 20);
    if (premium) {
      yy = y - rand(0, 12);
      vy = rand(120, 220);
      vx = rand(-50, 50);
      if (tr === "t_petals") {
        color = Math.random() < 0.5 ? "#ffb3d0" : "#ffd1e3";
        kind = 0;
        size = rand(2.5, 4.5);
        g = 60;
      } else if (tr === "t_stars") {
        color = Math.random() < 0.5 ? "#ffe36e" : "#ffffff";
        kind = 2;
        size = rand(3, 6);
        g = 0;
      } else if (tr === "t_bubbles") {
        color = Math.random() < 0.3 ? "#e41e2b" : "rgba(255,255,255,0.85)";
        kind = 0;
        size = rand(2, 4.5);
        g = -200;
        vy = rand(40, 120);
      } else if (tr === "t_rainbow") {
        const rc = ["#ff5c5c", "#ffa94d", "#ffe36e", "#7ee36b", "#5cc8ff", "#b48cf2"];
        color = rc[Math.floor((this.time * 12) % rc.length)];
        kind = 0;
        size = rand(4, 6.5);
        g = 0;
        vx = rand(-15, 15);
      } else if (tr === "t_fire") {
        color = ["#ff3d3d", "#ff8a3d", "#ffd23f", "#ff5c93"][(Math.random() * 4) | 0];
        kind = Math.random() < 0.25 ? 1 : 0;
        size = kind === 1 ? rand(6, 9) : rand(3, 5.5);
        g = -260;
        vy = rand(60, 140);
      }
    }
    this.parts.push({ x: x + rand(-16, 16), y: yy, vx, vy, life, max: life, size, color, kind, g, rot: rand(-0.3, 0.3), vr: rand(-1, 1) });
  }

  emitTrail(dt: number) {
    this.emitT -= dt;
    if (this.emitT > 0) return;
    this.emitT = this.look.trail !== "t_hearts" ? 0.05 : 0.4;
    const s = this.P(this.p.x, this.p.y, 0);
    if (s) this.emitTrailAt(s.x, s.y, s.y - 1.1 * s.s);
  }

  updateParticles(dt: number) {
    const ps = this.parts;
    let j = 0;
    for (let i = 0; i < ps.length; i++) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) continue;
      q.vy += q.g * dt;
      q.vx *= 1 - dt * 1.5;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
      ps[j++] = q;
    }
    ps.length = j;
    let k = 0;
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 40 * dt;
      if (t.life > 0) this.texts[k++] = t;
    }
    this.texts.length = k;
  }

  // ------------------------------------------------------------------ sky actors
  buildSmokePoints() {
    const c = document.createElement("canvas");
    c.width = 460;
    c.height = 80;
    const g = c.getContext("2d")!;
    g.font = "700 50px Fredoka, sans-serif";
    g.textBaseline = "middle";
    const tw = Math.max(40, Math.min(440, Math.ceil(g.measureText(SKY_TEXT).width)));
    g.fillStyle = "#fff";
    g.fillText(SKY_TEXT, 4, 40, 440);
    const data = g.getImageData(0, 0, c.width, c.height).data;
    const pts: { x: number; y: number }[] = [];
    for (let x = 0; x < c.width; x += 4)
      for (let y = 0; y < c.height; y += 4)
        if (data[(y * c.width + x) * 4 + 3] > 120) pts.push({ x: x - 4 + rand(-0.8, 0.8), y: y - 40 + rand(-0.8, 0.8) });
    this.smokePts = pts;
    this.smokeW = tw;
  }

  updateSky(dt: number) {
    this.cloudX += dt * 8.4;
    let j = 0;
    for (let i = 0; i < this.smoke.length; i++) {
      const s = this.smoke[i];
      s.age += dt;
      if (s.age < s.life) this.smoke[j++] = s;
    }
    this.smoke.length = j;

    if (this.state === "playing") {
      if (!this.plane) {
        this.planeT -= dt;
        if (this.planeT <= 0 && this.smoke.length === 0) {
          if (!this.smokePts) this.buildSmokePoints();
          const sc = Math.min(1, (W - 40) / this.smokeW);
          const y = clamp(this.horizon * 0.6, this.safeTop + 125, this.horizon - 45);
          this.plane = { x: -60, y, t: 0, idx: 0, textX: (W - this.smokeW * sc) / 2, textY: y + 2 };
          this.planeT = rand(18, 28);
          this.sfx.plane();
        }
      } else {
        const pl = this.plane;
        pl.t += dt;
        pl.x += 135 * dt;
        const pts = this.smokePts || [];
        const sc = Math.min(1, (W - 40) / this.smokeW);
        const tail = pl.x - 26;
        while (pl.idx < pts.length && pl.textX + pts[pl.idx].x * sc <= tail) {
          const q = pts[pl.idx++];
          this.smoke.push({ x: pl.textX + q.x * sc, y: pl.textY + q.y * sc, age: 0, r: rand(2.2, 3.1) * sc, life: rand(6.5, 7.5) });
        }
        if (pl.x > W + 80) this.plane = null;
      }
    }

    if (this.state !== "over") {
      const f = this.birds;
      if (!f) {
        this.birdT -= dt;
        if (this.birdT <= 0) {
          const n = 18;
          const birds: Bird[] = [];
          for (let i = 0; i < n; i++) {
            const t = (i / n) * Math.PI * 2;
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            birds.push({ ox: rand(-60, 60), oy: rand(-22, 22), hx: hx * 3.2, hy: hy * 3.2, ph: rand(0, 6.28), sp: rand(9, 13) });
          }
          const dir = Math.random() < 0.5 ? 1 : -1;
          this.birds = {
            x: dir > 0 ? -110 : W + 110,
            y: Math.max(this.safeTop + 110, this.horizon * rand(0.45, 0.6)),
            vx: dir * rand(55, 70),
            t: 0,
            heart: Math.random() < 0.65,
            form: 0,
            formStart: rand(0.4, 0.6),
            birds,
            chirped: false,
          };
          this.birdT = rand(11, 18);
        }
      } else {
        f.t += dt;
        const prog = f.vx > 0 ? (f.x + 110) / (W + 220) : (W + 110 - f.x) / (W + 220);
        f.x += f.vx * dt * (f.heart && f.form > 0.6 ? 0.35 : 1);
        if (f.heart) {
          const tg = prog > f.formStart - 0.25 && prog < f.formStart + 0.22 ? 1 : 0;
          f.form += (tg - f.form) * (1 - Math.exp(-dt * 2.2));
          if (f.form > 0.85 && !f.chirped) {
            f.chirped = true;
            this.sfx.chirp();
          }
        }
        if (prog > 1.02) this.birds = null;
      }
    }

    if (this.state === "playing") {
      if (this.ufo) {
        this.ufo.t += dt;
        if (this.ufo.t >= UFO_DUR) this.ufo = null;
      } else if (this.night() > 0.7) {
        this.ufoT -= dt;
        if (this.ufoT <= 0) {
          this.ufo = { t: 0, y: clamp(this.horizon * 0.55, this.safeTop + 150, this.horizon - 30), dir: Math.random() < 0.5 ? 1 : -1 };
          this.ufoT = rand(16, 26);
          this.sfx.ufo();
          this.sfx.alienTalk(1.7);
        }
      }
    }
  }

  // ------------------------------------------------------------------ render
  render() {
    if (this.previewMode) {
      this.renderPreview();
      return;
    }
    const ctx = this.ctx;
    const H = this.H;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    this.drawSky(ctx);
    const amb = AMBIENT[this.tod];
    let shakeX = 0;
    let shakeY = 0;
    if (this.trauma > 0) {
      const t = this.trauma * this.trauma;
      shakeX = (Math.random() * 2 - 1) * 10 * t;
      shakeY = (Math.random() * 2 - 1) * 10 * t;
    }
    // small zoom nudge on booster / speed-up (applied as a single transform, no extra layers)
    let zoom = 1;
    if (this.fx) {
      const t = this.fx.t;
      zoom += t < 0.12 ? (t / 0.12) * 0.03 : 0.03 * Math.max(0, 1 - (t - 0.12) / 0.5);
    }
    zoom += this.tierFx * 0.015;
    const zc = this.P(this.p.x, this.p.y + 0.5, 0);
    const zx = zc ? zc.x : W / 2;
    const zy = zc ? zc.y : H * 0.7;
    ctx.save();
    ctx.translate(zx * (1 - zoom) + shakeX, zy * (1 - zoom) + shakeY);
    ctx.scale(zoom, zoom);
    // the park is drawn straight onto the screen. Ambient dimming is baked into cached
    // sprites (see S()) and the ground colours, so no full-screen offscreen layers are needed.
    this.gctx = ctx;
    this.drawGround(ctx);
    this.drawWorld(ctx);
    this.gctx = null;
    ctx.restore();
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.globalCompositeOperation = "lighter";
    const warm = this.S("warmLight");
    // the couple carries a little warm glow so they stay readable at night
    if (amb.couple > 0) {
      const cs = this.P(this.p.x, this.p.y + 0.55, 0);
      if (cs) {
        ctx.globalAlpha = amb.couple;
        const r = cs.s * 2.2;
        ctx.drawImage(warm, cs.x - r / 2, cs.y - r / 2, r, r);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    this.drawParticles(ctx);
    this.drawTexts(ctx);
    ctx.restore();

    const fast = clamp((this.speed - 15) / (SPEED_MAX - 15), 0, 1);
    if ((this.pw.cola > 0 || fast > 0 || this.tierFx > 0) && this.state === "playing") {
      const cola = this.pw.cola > 0;
      const lineCol = cola ? "255,90,90" : this.pw.coffee > 0 ? "220,240,255" : "255,255,255";
      ctx.strokeStyle = `rgba(${lineCol},${cola ? 0.32 : 0.1 + fast * 0.18 + this.tierFx * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < (cola ? 12 : 4 + Math.round(fast * 6 + this.tierFx * 6)); i++) {
        const a = Math.random() * Math.PI * 2;
        const r1 = rand(120, 220);
        const r2 = r1 + rand(60, 160);
        const cy = this.horizon + 40;
        ctx.moveTo(W / 2 + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(W / 2 + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      }
      ctx.stroke();
    }
    // cozy warm vignette (darker at night)
    ctx.globalAlpha = this.tod === "night" ? 1 : this.tod === "evening" ? 0.85 : 0.5;
    ctx.drawImage(this.S("vignette"), 0, 0, W, H);
    ctx.globalAlpha = 1;
    if (this.state === "playing" || this.state === "paused") this.drawBoostFx(ctx);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.state === "playing" || this.state === "paused") this.drawHud(ctx);
    if (this.banner && this.state === "playing") this.drawBanner(ctx);
  }

  renderPreview() {
    const ctx = this.ctx;
    const H = this.H;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const bg = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    bg.addColorStop(0, "#ffe6f4");
    bg.addColorStop(0.55, "#e6b8ff");
    bg.addColorStop(1, "#8a6ad0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const z = Math.min(H / 125, W / 120);
    ctx.save();
    ctx.translate(W / 2, H * 0.86);
    ctx.scale(z, z);
    ctx.fillStyle = "rgba(120,40,110,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 42, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 3, 40, 7, 0, 0, Math.PI * 2);
    ctx.arc(-22, 0, 9, 0, Math.PI * 2);
    ctx.arc(4, -2, 11, 0, Math.PI * 2);
    ctx.arc(26, 1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(0, this.pvY / 20);
    const sq = this.p.squash;
    ctx.scale(1 + sq * 0.4, 1 - sq * 0.35);
    drawCoupleFront(ctx, this.look, this.time, this.pvV < 0);
    ctx.restore();
    ctx.restore();
    this.emitT -= 1 / 60;
    if (this.emitT <= 0) {
      this.emitT = this.look.trail !== "t_hearts" ? 0.06 : 0.35;
      this.emitTrailAt(W / 2, H * 0.86 + this.pvY / 20 * z, H * 0.86 - 50 * z);
    }
    this.drawParticles(ctx);
  }

  skyAt(d: number): [string, string] {
    if (this.tod === "day") return this.T.day;
    if (this.tod === "night") return this.T.nightSky;
    // evening: sunset slowly deepens as you run
    const s = this.T.sky;
    const k = clamp(d / 2500, 0, 1) * 0.6;
    if (s.length > 1) return [mixHex(s[0][1], s[1][1], k), mixHex(s[0][2], s[1][2], k)];
    const SKY = this.T.sky;
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i];
      const b = SKY[i + 1];
      if (d < b[0]) {
        const t = clamp((d - a[0]) / (b[0] - a[0]), 0, 1);
        const e = t * t * (3 - 2 * t);
        return [mixHex(a[1], b[1], e), mixHex(a[2], b[2], e)];
      }
    }
    const l = SKY[SKY.length - 1];
    return [l[1], l[2]];
  }

  skyCache: HTMLCanvasElement | null = null;
  skyT = -1;
  skyKey = "";

  /** Static sky backdrop is cached and only refreshed ~6x/sec (it changes very slowly). */
  drawSky(ctx: CanvasRenderingContext2D) {
    const c = this.canvas;
    if (!this.skyCache) this.skyCache = document.createElement("canvas");
    const sc = this.skyCache;
    const hz = this.horizon;
    const hPx = Math.ceil((hz + 8) * this.scale);
    const key = `${this.tod}|${this.theme}|${c.width}|${hPx}|${this.lowFx}`;
    if (sc.width !== c.width || sc.height !== hPx) {
      sc.width = c.width;
      sc.height = Math.max(1, hPx);
    }
    if (key !== this.skyKey || this.time - this.skyT > 0.16) {
      this.skyKey = key;
      this.skyT = this.time;
      const g = sc.getContext("2d")!;
      g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      this.drawSkyBackdrop(g);
      const amb = AMBIENT[this.tod];
      g.fillStyle = `rgba(${amb.col},${amb.sky})`;
      g.fillRect(0, 0, W, hz + 8);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(sc, 0, 0);
    ctx.restore();
    this.drawSkyLive(ctx);
  }

  drawSkyBackdrop(ctx: CanvasRenderingContext2D) {
    const hz = this.horizon;
    const T = this.T;
    const [c1, c2] = this.skyAt(this.dist);
    const g = ctx.createLinearGradient(0, 0, 0, hz + 4);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hz + 6);
    const night = this.night();

    if (night > 0.02) {
      ctx.fillStyle = "#fff";
      for (const s of this.stars) {
        ctx.globalAlpha = night * (0.55 + 0.45 * Math.sin(this.time * 2.2 + s.ph));
        ctx.fillRect(s.x * W, s.y * hz * 0.95, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }
    // pastel aurora ribbons
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const acol = ["150,255,220", "205,175,255", "255,185,235"];
    const aur = this.tod === "day" || this.lowFx ? 0 : 0.09 + night * 0.22;
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(${acol[k]},${aur * 0.55})`;
      ctx.lineWidth = 16 + k * 7;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 20) {
        const y = this.safeTop + 60 + hz * (0.12 + k * 0.08) + Math.sin(x * 0.012 + this.time * 0.3 + k * 2) * 16 + Math.sin(x * 0.031 + k) * 7;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // sun
    const isDay = this.tod === "day";
    const sunX = W * 0.66 - this.camX * 6;
    const sunY = isDay ? Math.max(this.safeTop + 120, hz * 0.42) : hz - T.sunY + Math.min(this.dist * 0.02, 60);
    const sHalo = isDay ? ["rgba(255,255,235,0.95)", "rgba(255,250,200,0.35)", "rgba(255,250,200,0)"] : T.sunHalo;
    const sDisc = isDay ? ["#ffffff", "#fffbe0", "#ffe98a"] : T.sunDisc;
    if (this.tod !== "night") {
      const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 230);
      halo.addColorStop(0, sHalo[0]);
      halo.addColorStop(0.35, sHalo[1]);
      halo.addColorStop(1, sHalo[2]);
      ctx.fillStyle = halo;
      ctx.fillRect(sunX - 230, sunY - 230, 460, 460);
      const disc = ctx.createRadialGradient(sunX, sunY - 6, 2, sunX, sunY, 34);
      disc.addColorStop(0, sDisc[0]);
      disc.addColorStop(0.55, sDisc[1]);
      disc.addColorStop(1, sDisc[2]);
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    const band = ctx.createLinearGradient(0, hz - 60, 0, hz + 2);
    const bandCol = isDay ? "255,250,235" : T.band;
    const bandA = isDay ? 0.3 : this.tod === "evening" ? 0.6 : 0;
    band.addColorStop(0, `rgba(${bandCol},0)`);
    band.addColorStop(1, `rgba(${bandCol},${bandA})`);
    ctx.fillStyle = band;
    ctx.fillRect(0, hz - 60, W, 62);
    // soft fantasy light rays
    const rayA = isDay ? 0.045 : this.tod === "evening" ? 0.075 : 0;
    if (rayA > 0.005) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const len = this.H * 1.3;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.33 + Math.sin(this.time * 0.15 + i) * 0.05;
        const w = 0.05 + (i % 3) * 0.025;
        ctx.fillStyle = `rgba(255,244,220,${rayA * (0.55 + 0.45 * Math.sin(this.time * 0.6 + i * 1.7))})`;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(a - w) * len, sunY + Math.sin(a - w) * len);
        ctx.lineTo(sunX + Math.cos(a + w) * len, sunY + Math.sin(a + w) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // moon
    if (night > 0) {
      const mx = W * 0.24;
      const my = Math.max(this.safeTop + 120, hz * 0.42);
      ctx.globalAlpha = night;
      const r = ctx.createRadialGradient(mx, my, 18, mx, my, 80);
      r.addColorStop(0, "rgba(255,240,210,0.5)");
      r.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = r;
      ctx.fillRect(mx - 80, my - 80, 160, 160);
      ctx.fillStyle = "#fff4d6";
      ctx.beginPath();
      ctx.arc(mx, my, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** Moving sky elements drawn every frame (cheap sprite blits). */
  drawSkyLive(ctx: CanvasRenderingContext2D) {
    const hz = this.horizon;
    const T = this.T;
    const night = this.night();
    // clouds: Valton, Ardiana & hearts on separate lanes
    const clouds: [string, number, number, number, number][] = [
      ["cloudWordV", 210, 120 / 340, 0.24, 0],
      ["cloudHeart", 62, 150 / 160, 0.62, 0.36],
      ["cloudWordA", 225, 120 / 380, 0.5, 0.56],
      ["cloudHeart", 50, 150 / 160, 0.16, 0.86],
    ];
    const span = W + 420;
    const topLimit = this.safeTop + 74;
    const usable = Math.max(60, hz - topLimit - 30);
    for (let i = 0; i < clouds.length; i++) {
      const [name, cw, ar, yf, slot] = clouds[i];
      const x = ((this.cloudX + slot * span) % span) - 230;
      const ch = cw * ar;
      const y = topLimit + usable * yf - ch * 0.5 + Math.sin(this.time * 0.5 + i) * 3;
      ctx.globalAlpha = 1 - night * 0.4;
      ctx.drawImage(this.S(name), x, y, cw, ch);
    }
    ctx.globalAlpha = 1;
    if (this.smoke.length) {
      ctx.fillStyle = "#fff";
      for (const s of this.smoke) {
        const a = s.age;
        ctx.globalAlpha = 0.85 * Math.min(1, a * 5) * (1 - clamp((a - (s.life - 1.6)) / 1.6, 0, 1));
        ctx.beginPath();
        ctx.arc(s.x + a * 2.5, s.y, s.r + a * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (this.plane) this.drawPlane(ctx);
    if (this.birds) this.drawBirds(ctx, night);
    if (this.ufo) this.drawUfo(ctx);
    // hills
    ctx.fillStyle = mixHex(T.hills[0], "#2a1a3a", night);
    ctx.beginPath();
    ctx.moveTo(0, hz + 2);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, hz - 14 - Math.sin(x * 0.018 + 1.3 - this.camX * 0.15) * 10);
    ctx.lineTo(W, hz + 2);
    ctx.fill();
    ctx.fillStyle = mixHex(T.hills[1], "#1e1a2a", night);
    ctx.beginPath();
    ctx.moveTo(0, hz + 2);
    for (let x = 0; x <= W; x += 7) ctx.lineTo(x, hz - 6 - Math.abs(Math.sin(x * 0.11 - this.camX * 0.3)) * 9 - Math.abs(Math.sin(x * 0.37)) * 3);
    ctx.lineTo(W, hz + 2);
    ctx.fill();
  }

  drawGround(ctx: CanvasRenderingContext2D) {
    const hz = this.horizon;
    const H = this.H;
    const T = this.T;
    const gg = ctx.createLinearGradient(0, hz, 0, H);
    gg.addColorStop(0, this.lit(T.ground[0]));
    gg.addColorStop(0.4, this.lit(T.ground[1]));
    gg.addColorStop(1, this.lit(T.ground[2]));
    ctx.fillStyle = gg;
    ctx.fillRect(-20, hz, W + 40, H - hz + 30);
    ctx.fillStyle = "rgba(0,40,0,0.06)";
    const B = 2.4;
    for (let k = Math.floor((this.dist - CAM_D) / B); ; k++) {
      const rel = k * B - this.dist;
      if (rel > 60) break;
      if (k % 2) continue;
      const y1 = this.zToY(rel);
      const y2 = this.zToY(rel + B);
      ctx.fillRect(-20, y2, W + 40, y1 - y2);
    }
    const cx = W / 2;
    const camX = this.camX;
    const camHF = this.camH * FOCAL;
    const quad = (path: Path2D | CanvasRenderingContext2D, xa: number, xb: number, n: number, f: number) => {
      const sN = FOCAL / n;
      const sF = FOCAL / f;
      const yN = hz + camHF / n;
      const yF = hz + camHF / f;
      path.moveTo(cx + (xa - camX) * sN, yN);
      path.lineTo(cx + (xb - camX) * sN, yN);
      path.lineTo(cx + (xb - camX) * sF, yF);
      path.lineTo(cx + (xa - camX) * sF, yF);
      path.closePath();
    };
    // ---------- road ----------
    // near plane = bottom edge of the screen (avoids huge off-screen polygons & jitter)
    const zNear = Math.max(0.3, camHF / Math.max(1, H + 30 - hz));
    const zFar = VIEW_Z + CAM_D;
    const pv = T.pavers.map((c) => this.lit(c));
    // 1) solid road base in the average paver colour (this is what you see in the distance)
    ctx.fillStyle = pv[3];
    ctx.beginPath();
    quad(ctx, -1.5, 1.5, zNear, zFar);
    ctx.fill();
    // 2) cobblestones up close, fading smoothly into the base with distance (no hard seam / shimmer)
    const ROW = 0.34;
    const BW = 0.375;
    const GAP = 0.022;
    const DETAIL_END = 14;
    const FADE = 6;
    const BUCKETS = 2;
    const mortar: Path2D[] = [];
    const stones: Path2D[][] = [];
    for (let i = 0; i < BUCKETS; i++) {
      mortar.push(new Path2D());
      stones.push([new Path2D(), new Path2D(), new Path2D()]);
    }
    for (let k = Math.floor((this.dist + zNear - CAM_D) / ROW); ; k++) {
      const rel = k * ROW - this.dist;
      if (rel > DETAIL_END) break;
      const n0 = rel + CAM_D;
      const f0 = n0 + ROW;
      if (f0 <= zNear) continue;
      const fade = clamp((DETAIL_END - rel) / FADE, 0, 1);
      if (fade <= 0) continue;
      const bucket = Math.min(BUCKETS - 1, Math.floor(fade * BUCKETS - 1e-6));
      const n = Math.max(zNear, n0);
      mortar[bucket] && quad(mortar[bucket], -1.5, 1.5, n, f0);
      const sn = Math.max(zNear, n0 + GAP);
      const sf = f0 - GAP;
      if (sf <= sn) continue;
      const off = (k & 1) * (BW / 2);
      let bi = 0;
      for (let b = -1.5 - off; b < 1.5; b += BW, bi++) {
        const xa = Math.max(-1.5, b) + GAP;
        const xb = Math.min(1.5, b + BW) - GAP;
        if (xb <= xa) continue;
        const h = ((k * 7 + bi * 13) % 11 + 11) % 11;
        quad(stones[bucket][h === 0 ? 2 : h < 5 ? 1 : 0], xa, xb, sn, sf);
      }
    }
    for (let i = 0; i < BUCKETS; i++) {
      ctx.globalAlpha = (i + 1) / BUCKETS;
      ctx.fillStyle = "rgba(40,32,42,0.45)";
      ctx.fill(mortar[i]);
      ctx.fillStyle = pv[0];
      ctx.fill(stones[i][0]);
      ctx.fillStyle = pv[1];
      ctx.fill(stones[i][1]);
      ctx.fillStyle = pv[2];
      ctx.fill(stones[i][2]);
    }
    ctx.globalAlpha = 1;
    // 3) subtle lane guides, fading with distance
    const lg = ctx.createLinearGradient(0, hz, 0, H);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.35, "rgba(255,255,255,0.08)");
    lg.addColorStop(1, "rgba(255,255,255,0.28)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    for (const lx of [-0.5, 0.5]) quad(ctx, lx - 0.012, lx + 0.012, zNear, zFar);
    ctx.fill();
    // 4) stone curbs
    ctx.fillStyle = "#d9d0d6";
    ctx.beginPath();
    quad(ctx, -1.66, -1.5, zNear, zFar);
    quad(ctx, 1.5, 1.66, zNear, zFar);
    ctx.fill();
    ctx.fillStyle = "rgba(60,40,50,0.35)";
    ctx.beginPath();
    quad(ctx, -1.52, -1.5, zNear, zFar);
    quad(ctx, 1.5, 1.52, zNear, zFar);
    ctx.fill();

    // fallen leaves / petals / snow
    const cols = T.leaves.map((c) => this.lit(c));
    const paths = cols.map(() => new Path2D());
    for (const l of this.leaves) {
      const rel = l.z - this.dist;
      if (rel < NEAR || rel > 40) continue;
      const zz = rel + CAM_D;
      const sc = FOCAL / zz;
      const x = cx + (l.x - camX) * sc;
      if (x < -10 || x > W + 10) continue;
      const y = hz + camHF / zz;
      const r = l.s * sc;
      paths[l.c].moveTo(x + r, y);
      paths[l.c].ellipse(x, y, r, r * 0.42, l.r, 0, Math.PI * 2);
    }
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fill(paths[i]);
    });
    // soft distance haze in the sky colour (fades to the same colour, not to white)
    const [, c2] = this.skyAt(this.dist);
    const hg = ctx.createLinearGradient(0, hz - 2, 0, hz + 36);
    hg.addColorStop(0, c2);
    hg.addColorStop(1, c2);
    ctx.save();
    ctx.fillStyle = hg;
    for (let i = 0; i < 6; i++) {
      const y0 = hz - 2 + (i * 38) / 6;
      ctx.globalAlpha = 0.8 * (1 - i / 6);
      ctx.fillRect(-20, y0, W + 40, 38 / 6 + 0.5);
    }
    ctx.restore();
  }

  drawWorld(ctx: CanvasRenderingContext2D) {
    const items: { r: number; k: number; i: number }[] = [];
    const d = this.dist;
    for (let i = 0; i < this.props.length; i++) {
      const r = this.props[i].z - d;
      if (r < VIEW_Z && r > NEAR) items.push({ r, k: 0, i });
    }
    for (let i = 0; i < this.obs.length; i++) {
      const o = this.obs[i];
      if (o.gone) continue;
      const r = o.z - d;
      if (r < VIEW_Z && r + o.len > NEAR) items.push({ r: Math.max(r, NEAR), k: 1, i });
    }
    for (let i = 0; i < this.picks.length; i++) {
      const pk = this.picks[i];
      if (pk.taken) continue;
      const r = pk.z - d;
      if (r < VIEW_Z && r > NEAR) items.push({ r, k: 2, i });
    }
    items.push({ r: 0, k: 3, i: 0 });
    items.sort((a, b) => b.r - a.r);
    for (const it of items) {
      ctx.globalAlpha = clamp((VIEW_Z - it.r) / 14, 0, 1);
      if (it.k === 0) this.drawProp(ctx, this.props[it.i], it.r);
      else if (it.k === 1) this.drawOb(ctx, this.obs[it.i]);
      else if (it.k === 2) this.drawPick(ctx, this.picks[it.i], it.r);
      else {
        ctx.globalAlpha = 1;
        this.drawCouple(ctx);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawProp(ctx: CanvasRenderingContext2D, pr: Prop, rel: number) {
    const s = this.P(pr.x, 0, rel);
    if (!s) return;
    const [w, h] = SIZES[pr.kind];
    const pw = w * s.s;
    const ph = h * s.s;
    if (s.x + pw / 2 < -10 || s.x - pw / 2 > W + 10) return;
    if (pr.kind !== "gate" && pr.kind !== "lamp") {
      if (this.tod === "night") {
        // no sun at night: just a soft contact shadow right underneath
        ctx.fillStyle = "rgba(10,8,25,0.28)";
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, pw * 0.3, pw * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // long sun shadow; shorter at midday
        const day = this.tod === "day";
        ctx.fillStyle = day ? "rgba(40,25,20,0.18)" : "rgba(40,15,30,0.22)";
        ctx.beginPath();
        ctx.ellipse(s.x - pw * (day ? 0.1 : 0.28), s.y, pw * (day ? 0.34 : 0.42), pw * 0.07, -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.blit(ctx, this.S(pr.kind), s.x - pw / 2, s.y - ph, pw, ph);
    if (pr.kind === "lamp") {
      // glow is added at this exact depth, so anything nearer drawn later hides it
      const hs = 0.55 * s.s * 3.2;
      const flick = 0.94 + Math.sin(this.time * 7 + pr.z) * 0.04 + Math.sin(this.time * 23 + pr.z * 3) * 0.02;
      this.addGlow("warmLight", s.x, s.y - 2.38 * s.s, hs, AMBIENT[this.tod].lamp * flick);
    } else if (pr.kind === "mushroom") {
      const pulse = 0.75 + Math.sin(this.time * 2.2 + pr.z) * 0.2;
      this.addGlow("shroomGlow", s.x, s.y - ph * 0.45, pw * 1.5, pulse * 0.4 * (0.5 + AMBIENT[this.tod].lamp * 0.5));
    }
  }

  // ---------------------------------------------------------------- depth-correct glow
  glow: HTMLCanvasElement | null = null;
  gctx: CanvasRenderingContext2D | null = null;
  glowRects: number[] = [];

  /**
   * Draw a glow directly onto the screen at the current depth. Because the world is drawn
   * back-to-front, anything nearer is painted afterwards and naturally covers the glow —
   * no offscreen glow layer or occlusion pass needed.
   */
  addGlow(name: string, x: number, y: number, size: number, alpha: number) {
    const g = this.gctx;
    if (!g || alpha <= 0.01) return;
    if (x + size / 2 < 0 || x - size / 2 > W || y + size / 2 < 0 || y - size / 2 > this.H) return;
    const prevA = g.globalAlpha;
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = Math.min(1, alpha) * prevA;
    g.drawImage(this.S(name), x - size / 2, y - size / 2, size, size);
    g.globalAlpha = prevA;
    g.globalCompositeOperation = "source-over";
  }

  blit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
    ctx.drawImage(img, x, y, w, h);
  }

  occludeRect(_x: number, _y: number, _w: number, _h: number) {
    /* no-op: depth ordering handles occlusion now */
  }

  drawOb(ctx: CanvasRenderingContext2D, o: Ob) {
    const rel = o.z - this.dist;
    const lx = o.lane - 1;
    if (o.type === "hedge") {
      this.drawHedge(ctx, o, rel, lx);
      return;
    }
    const s = this.P(lx, 0, rel);
    if (!s || rel < NEAR) return;
    const w = OB_W[o.type] * s.s;
    const h = OB_H[o.type] * s.s;
    ctx.fillStyle = "rgba(40,20,40,0.22)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, w * 0.52, w * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    this.blit(ctx, this.S(o.type), s.x - w / 2, s.y - h, w, h);
  }

  drawHedge(ctx: CanvasRenderingContext2D, o: Ob, rel: number, lx: number) {
    const hw = 0.47;
    const hgt = 2.05;
    const near = Math.max(rel, NEAR);
    const far = rel + o.len;
    if (far < NEAR) return;
    const pr = (x: number, y: number, z: number) => this.P(x, y, z) || { x: 0, y: 0, s: 1 };
    const q = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = "rgba(40,20,40,0.22)";
    q(pr(lx - hw - 0.05, 0, near), pr(lx + hw + 0.05, 0, near), pr(lx + hw + 0.05, 0, far), pr(lx - hw - 0.05, 0, far));
    // fallen tree trunk lying along the lane (tapers toward the far end)
    const sideX = this.camX > lx ? lx + hw : lx - hw;
    const topAt = (z: number) => lerp(1.25, 0.75, clamp((z - rel) / Math.max(1, o.len), 0, 1));
    // bark side
    ctx.fillStyle = this.lit("#6a4428");
    q(pr(sideX, 0.12, near), pr(sideX, topAt(near), near), pr(sideX, topAt(far), far), pr(sideX, 0.12, far));
    // bark grooves
    ctx.strokeStyle = "rgba(40,22,10,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let wz = near + 0.35; wz < far; wz += 0.55) {
      const a = pr(sideX, 0.18, wz);
      const b = pr(sideX, topAt(wz) - 0.06, wz + 0.15);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    // trunk top (lighter bark)
    ctx.fillStyle = this.lit("#8a5e3a");
    q(pr(lx - hw * 0.8, topAt(near), near), pr(lx + hw * 0.8, topAt(near), near), pr(lx + hw * 0.6, topAt(far), far), pr(lx - hw * 0.6, topAt(far), far));
    // broken branches sticking up, with seasonal leaves / snow
    const leafCols = (
      this.theme === "winter" ? ["#ffffff", "#e4ecf6"] : this.theme === "spring" ? ["#f7a8c8", "#92d47c"] : this.theme === "summer" ? ["#4aa04e", "#62b862"] : ["#ee8f30", "#e8bc30"]
    ).map((c) => this.lit(c));
    for (let wz = near + 1.2, i = 0; wz < far - 0.6; wz += 1.9, i++) {
      const base = pr(lx + (i % 2 ? 0.2 : -0.2), topAt(wz), wz);
      const tip = pr(lx + (i % 2 ? 0.45 : -0.45), topAt(wz) + 0.75, wz + 0.3);
      ctx.strokeStyle = this.lit("#5a3a22");
      ctx.lineWidth = Math.max(1.5, 0.06 * base.s);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      const r = Math.max(3, 0.2 * tip.s);
      ctx.fillStyle = leafCols[0];
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = leafCols[1];
      ctx.beginPath();
      ctx.arc(tip.x + r * 0.6, tip.y + r * 0.3, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // moss patches on top
    ctx.fillStyle = this.lit(this.theme === "winter" ? "#f2f6fb" : "#6e9a3e");
    for (let wz = near + 0.7; wz < far - 0.3; wz += 1.3) {
      const a = pr(lx, topAt(wz), wz);
      ctx.beginPath();
      ctx.ellipse(a.x, a.y, Math.max(2, 0.18 * a.s), Math.max(1, 0.05 * a.s), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    {
      const a = pr(lx - hw, 1.3, near);
      const b = pr(lx + hw, 0, far);
      const c = pr(lx + hw, 0, near);
      this.occludeRect(Math.min(a.x, b.x), a.y, Math.abs(c.x - a.x) + 4, c.y - a.y);
    }
    if (rel >= NEAR) {
      const f = pr(lx, 0, rel);
      const w = OB_W.hedge * f.s;
      const h = OB_H.hedge * f.s;
      this.blit(ctx, this.S("hedge"), f.x - w / 2, f.y - h, w, h);
    }
  }

  drawPick(ctx: CanvasRenderingContext2D, k: Pick, rel: number) {
    const bob = k.kind === "heart" ? Math.sin(this.time * 4 + k.ph) * 0.05 : Math.sin(this.time * 3 + k.ph) * 0.08;
    const s = this.P(k.x, k.y + bob, rel);
    if (!s) return;
    if (k.kind === "heart") {
      const sz = 0.42 * s.s;
      // soft pink glow behind each heart (added at this depth so nearer objects still hide it)
      // just a faint soft halo (subtle — not a big bloom)
      if (rel < 40) {
        const nightBoost = this.tod === "night" ? 1.2 : this.tod === "evening" ? 1 : 0.7;
        this.addGlow("heartGlow", s.x, s.y, sz * 1.7, 0.28 * nightBoost);
      }
      const spin = 0.25 + 0.75 * Math.abs(Math.cos(this.time * 3 + k.ph));
      ctx.drawImage(this.S("heart"), s.x - (sz * spin) / 2, s.y - sz / 2, sz * spin, sz);
    } else {
      const sz = 0.62 * s.s;
      const gl = k.kind === "cola" ? "redGlow" : k.kind === "milka" ? "lilacGlow" : k.kind === "coffee" ? "lampGlow" : "glow";
      const gs = sz * (1.9 + Math.sin(this.time * 5 + k.ph) * 0.15);
      ctx.drawImage(this.S(gl), s.x - gs / 2, s.y - gs / 2, gs, gs);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.sin(this.time * 2.5 + k.ph) * 0.18);
      ctx.drawImage(this.S(k.kind), -sz / 2, -sz * 0.63, sz, sz * 1.27);
      ctx.restore();
    }
  }

  drawCouple(ctx: CanvasRenderingContext2D) {
    const p = this.p;
    const s = this.P(p.x, p.y, 0);
    const g = this.P(p.x, 0, 0);
    if (!s || !g) return;
    const t = this.time;
    const u = s.s;
    const sh = Math.max(0.25, 1 - p.y * 0.22);
    ctx.fillStyle = "rgba(40,20,40,0.28)";
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 2, 0.48 * u * sh, 0.1 * u * sh, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.pw.cola > 0) {
      const gs = u * (2.4 + Math.sin(t * 20) * 0.15);
      ctx.drawImage(this.S("redGlow"), s.x - gs / 2, s.y - 0.6 * u - gs / 2, gs, gs);
    }
    if (this.pw.coffee > 0) {
      const gs = u * 2.2;
      ctx.drawImage(this.S("lampGlow"), s.x - gs / 2, s.y - 0.6 * u - gs / 2, gs, gs);
    }
    // the couple hides any lamp glow behind them
    this.occludeRect(s.x - 0.42 * u, s.y - 1.05 * u, 0.84 * u, 1.05 * u);
    ctx.save();
    ctx.translate(s.x, s.y);
    const k = u / 54;
    ctx.globalAlpha = this.invT > 0 && this.pw.milka <= 0 && Math.sin(t * 30) > 0 ? 0.45 : 1;
    let sx = 1 + p.squash * 0.4;
    let sy = 1 - p.squash * 0.35;
    if (p.roll > 0 && !p.crashed) {
      sx *= 1.08;
      sy *= 0.58;
    }
    ctx.scale(k * sx, k * sy);
    if (p.crashed) ctx.rotate(-Math.min(1.35, p.crashT * 6));
    ctx.rotate(clamp((p.lane - 1 - p.x) * 0.4, -0.25, 0.25));
    const air = p.y > 0.05 || this.pw.coffee > 0;
    if (this.pw.coffee > 0 || this.angelFx > 0) {
      const flap = Math.sin(t * 18) * 0.35;
      ctx.fillStyle = "#ffffff";
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(sd * 16, -26);
        ctx.rotate(sd * (0.3 + flap));
        ctx.beginPath();
        ctx.ellipse(sd * 10, -4, 12, 6.5, sd * -0.4, 0, Math.PI * 2);
        ctx.ellipse(sd * 14, 3, 9, 4.5, sd * -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    // draw the couple into a small cached canvas, then tint it with the ambient light
    this.drawCoupleLit(ctx, t, p.phase, air);
    if (this.pw.coffee > 0) {
      ctx.save();
      ctx.translate(0, -64 + Math.sin(t * 4) * 2);
      ctx.drawImage(this.S("coffee"), -10, -13, 20, 25);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.pw.milka > 0) {
      const r = 0.7 * u;
      ctx.globalAlpha = this.pw.milka < 1.5 && Math.sin(t * 22) > 0 ? 0.35 : 1;
      ctx.fillStyle = "rgba(170,150,230,0.22)";
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y - 0.5 * u, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (this.pw.pizza > 0) {
      for (let i = 0; i < 2; i++) {
        const a = t * 4 + i * Math.PI;
        const px = s.x + Math.cos(a) * 0.7 * u;
        const py = s.y - 0.55 * u + Math.sin(a) * 0.2 * u;
        const sz = 0.28 * u;
        ctx.drawImage(this.S("pizza"), px - sz / 2, py - sz * 0.63, sz, sz * 1.27);
      }
    }
  }

  coupleCv: HTMLCanvasElement | null = null;
  /** Couple drawn into an offscreen canvas in local units, ambient-tinted, then blitted. */
  drawCoupleLit(ctx: CanvasRenderingContext2D, t: number, phase: number, air: boolean) {
    const amb = AMBIENT[this.tod];
    // local couple space: x ∈ [-40,40], y ∈ [-60,6] → 80×66 units, rendered at 3px/unit
    const R = 3;
    if (!this.coupleCv) {
      this.coupleCv = document.createElement("canvas");
      this.coupleCv.width = 80 * R;
      this.coupleCv.height = 70 * R;
    }
    const cv = this.coupleCv;
    const g = cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(R, 0, 0, R, 40 * R, 62 * R);
    drawCoupleBack(g, this.look, t, phase, air);
    // tint (keeps the couple slightly brighter than the world so they stay readable)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = `rgba(${amb.col},${amb.ground * 0.7})`;
    g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = "source-over";
    ctx.drawImage(cv, -40, -62, 80, 70);
  }

  drawPlane(ctx: CanvasRenderingContext2D) {
    const pl = this.plane!;
    const y = pl.y + Math.sin(pl.t * 3) * 2;
    ctx.save();
    ctx.translate(pl.x, y);
    ctx.fillStyle = "#ff4f8b";
    ctx.beginPath();
    ctx.moveTo(-22, -1);
    ctx.lineTo(-28, -14);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-12, -1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4f8b";
    ctx.fillRect(-20, 1, 38, 3);
    ctx.fillStyle = "#89cff0";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-6 + i * 7, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffb7d5";
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(-14, 14);
    ctx.lineTo(-6, 14);
    ctx.lineTo(8, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    heartPath(ctx, -21, -8, 6);
    ctx.fill();
    ctx.restore();
  }

  drawBirds(ctx: CanvasRenderingContext2D, night: number) {
    const f = this.birds!;
    const e = f.form * f.form * (3 - 2 * f.form);
    const dir = f.vx > 0 ? 1 : -1;
    ctx.strokeStyle = night > 0.5 ? "rgba(255,225,240,0.9)" : "rgba(70,30,80,0.8)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const b of f.birds) {
      const lx = b.ox + Math.sin(f.t * 1.3 + b.ph) * 8;
      const ly = b.oy + Math.cos(f.t * 1.7 + b.ph) * 6;
      const x = f.x + lerp(lx, b.hx, e);
      const y = f.y + lerp(ly, b.hy, e);
      const wy = Math.sin(f.t * b.sp + b.ph) * 3.5;
      ctx.moveTo(x - 5, y - wy);
      ctx.quadraticCurveTo(x - 2, y - 1.5 - wy * 0.3, x + dir * 0.5, y + 1);
      ctx.quadraticCurveTo(x + 2, y - 1.5 - wy * 0.3, x + 5, y - wy);
    }
    ctx.stroke();
  }

  drawUfo(ctx: CanvasRenderingContext2D) {
    const u = this.ufo!;
    const t = u.t;
    const ease = (k: number) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
    const startX = u.dir > 0 ? -70 : W + 70;
    const holdX = u.dir > 0 ? W * 0.36 : W * 0.64;
    let x: number;
    let y = u.y + Math.sin(t * 2.4) * 6;
    if (t < 1.4) x = lerp(startX, holdX, ease(t / 1.4));
    else if (t < UFO_DUR - 1.1) x = holdX + Math.sin((t - 1.4) * 1.3) * 10;
    else {
      const k = (t - (UFO_DUR - 1.1)) / 1.1;
      x = holdX + u.dir * k * k * 420;
      y -= k * k * 260;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(190,240,255,0.35)";
    ctx.beginPath();
    ctx.arc(0, -8, 20, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#7ee36b";
    ctx.beginPath();
    ctx.ellipse(0, -17, 10, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(0, -6, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#14102a";
    ctx.beginPath();
    ctx.ellipse(-4, -17, 3.2, 4.2, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4, -17, 3.2, 4.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7ee36b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -25);
    ctx.lineTo(-7, -31);
    ctx.moveTo(4, -25);
    ctx.lineTo(7, -31);
    ctx.stroke();
    ctx.fillStyle = "#ff5c93";
    ctx.beginPath();
    ctx.arc(-7, -31, 2, 0, Math.PI * 2);
    ctx.arc(7, -31, 2, 0, Math.PI * 2);
    ctx.fill();
    const sg = ctx.createLinearGradient(0, -6, 0, 10);
    sg.addColorStop(0, "#e6e3f2");
    sg.addColorStop(1, "#5e5878");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const lights = ["#ff5c93", "#ffe36e", "#7ee3ff", "#7ee36b", "#ff9a5c"];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = Math.floor(t * 8 + i) % 2 === 0 ? lights[i] : "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(-28 + i * 14, 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (t > 1.2 && t < UFO_DUR - 1.0) {
      const shown = UFO_LINE.slice(0, Math.min(UFO_LINE.length, Math.floor((t - 1.2) * 22)));
      ctx.save();
      ctx.globalAlpha = Math.min(1, (UFO_DUR - 1.0 - t) * 3);
      ctx.font = "700 15px Fredoka, sans-serif";
      const bw = ctx.measureText(UFO_LINE).width + 22;
      const bh = 32;
      const bx = clamp(x - bw / 2, 8, W - bw - 8);
      const by = y - 78;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#7ee36b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1446";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(shown, bx + 11, by + bh / 2 + 1);
      ctx.restore();
    }
  }

  drawParticles(ctx: CanvasRenderingContext2D) {
    const hs = this.S("heart");
    for (const q of this.parts) {
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a;
      if (q.kind === 1) {
        const s = q.size * (0.6 + a * 0.6) * 1.6;
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.drawImage(hs, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else if (q.kind === 2) {
        ctx.fillStyle = q.color;
        const s = q.size * (0.5 + a);
        ctx.beginPath();
        ctx.moveTo(q.x, q.y - s);
        ctx.lineTo(q.x + s * 0.3, q.y - s * 0.3);
        ctx.lineTo(q.x + s, q.y);
        ctx.lineTo(q.x + s * 0.3, q.y + s * 0.3);
        ctx.lineTo(q.x, q.y + s);
        ctx.lineTo(q.x - s * 0.3, q.y + s * 0.3);
        ctx.lineTo(q.x - s, q.y);
        ctx.lineTo(q.x - s * 0.3, q.y - s * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(0.3, q.size * (0.4 + a * 0.6)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.texts) {
      const a = clamp(t.life / t.max, 0, 1);
      const pop = t.life > t.max - 0.12 ? 1 + (t.life - (t.max - 0.12)) * 4 : 1;
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = `700 ${Math.round(t.size * pop)}px Fredoka, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(120,20,80,0.6)";
      ctx.strokeText(t.text, t.x, t.y, W - 20);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y, W - 20);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(0, this.safeTop);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = "700 32px Fredoka, sans-serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(90,20,70,0.45)";
    const sc = String(this.score);
    ctx.strokeText(sc, 16, 42);
    ctx.fillStyle = "#fff";
    ctx.fillText(sc, 16, 42);
    if (this.multiplier > 1) {
      const sw = ctx.measureText(sc).width;
      ctx.font = "800 18px Fredoka, sans-serif";
      ctx.fillStyle = "#ffd36e";
      ctx.strokeText(`x${this.multiplier}`, 22 + sw, 40);
      ctx.fillText(`x${this.multiplier}`, 22 + sw, 40);
    }
    ctx.font = "600 14px Fredoka, sans-serif";
    ctx.lineWidth = 3;
    const line = `${Math.floor(this.dist)}m  ·  ♥ ${this.hearts}`;
    ctx.strokeText(line, 17, 62);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(line, 17, 62);
    let y = 80;
    if (this.best > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`Best ${Math.max(this.best, this.score)}`, 17, y);
      y += 18;
    }
    ctx.fillStyle = "#fff0c8";
    ctx.strokeText("📍 Taukbashqe Park", 17, y);
    ctx.fillText("📍 Taukbashqe Park", 17, y);
    y += 18;
    if (this.streak >= 2) {
      ctx.save();
      ctx.translate(17, y + 4);
      const pop = this.streak >= 10 ? 1 + Math.max(0, Math.sin(this.time * 10)) * 0.08 : 1;
      ctx.scale(pop, pop);
      ctx.font = "800 18px Fredoka, sans-serif";
      ctx.lineWidth = 4;
      const txt = `🔥 Streak ${this.streak}`;
      ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = this.streak >= 10 ? "#ffd36e" : "#ffb37a";
      ctx.fillText(txt, 0, 0);
      ctx.restore();
      ctx.font = "600 14px Fredoka, sans-serif";
      ctx.lineWidth = 3;
      y += 24;
    }
    if (this.angelLeft > 0) {
      ctx.fillStyle = "#fff4c2";
      ctx.fillText(`😇 x${this.angelLeft}`, 17, y);
      y += 18;
    }
    if (this.stumbles.length && this.time - this.stumbles[this.stumbles.length - 1] < 5) {
      ctx.fillStyle = "#ffd36e";
      ctx.fillText("💔 careful…", 17, y);
      y += 18;
    }
    y += 4;
    for (const k of SNACKS) {
      if (this.pw[k] <= 0) continue;
      const f = this.pw[k] / this.pwMax[k];
      ctx.globalAlpha = this.pw[k] < 1.5 && Math.sin(this.time * 20) > 0 ? 0.45 : 1;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.roundRect(10, y - 2, 118, 32, 12);
      ctx.fill();
      ctx.drawImage(this.S(k), 14, y, 22, 28);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.roundRect(42, y + 10, 78, 9, 4.5);
      ctx.fill();
      ctx.fillStyle = SNACK_INFO[k].colors[0];
      ctx.beginPath();
      ctx.roundRect(42, y + 10, Math.max(4, 78 * f), 9, 4.5);
      ctx.fill();
      ctx.globalAlpha = 1;
      y += 36;
    }
    ctx.restore();
  }

  drawBanner(ctx: CanvasRenderingContext2D) {
    const b = this.banner!;
    const age = b.max - b.life;
    const s = age < 0.25 ? 0.5 + (age / 0.25) * 0.6 : age < 0.4 ? 1.1 - ((age - 0.25) / 0.15) * 0.1 : 1;
    ctx.save();
    ctx.globalAlpha = b.life < 0.4 ? b.life / 0.4 : 1;
    ctx.translate(W / 2, this.H * 0.22 + this.safeTop * 0.5);
    ctx.scale(s, s);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "400 30px Pacifico, cursive";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(120,20,80,0.55)";
    ctx.strokeText(b.text, 0, 0, W - 30);
    ctx.fillStyle = "#fff";
    ctx.fillText(b.text, 0, 0, W - 30);
    ctx.font = "700 15px Fredoka, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeText(b.sub, 0, 34, W - 30);
    ctx.fillStyle = "#ffd36e";
    ctx.fillText(b.sub, 0, 34, W - 30);
    ctx.restore();
  }
}
