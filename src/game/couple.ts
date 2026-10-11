import { heartPath } from "./util";

export interface Look {
  herOutfit: string;
  hisOutfit: string;
  herHat: string;
  hisHat: string;
  trail: string;
}
export const DEFAULT_LOOK: Look = {
  herOutfit: "a_pink",
  hisOutfit: "v_purple",
  herHat: "ah_heartclip",
  hisHat: "vh_none",
  trail: "t_hearts",
};

interface HerOutfit {
  dress: string;
  trim: string;
  legs: string;
  dots?: string;
  long?: boolean;
  sparkle?: boolean;
}
interface HisOutfit {
  shirt: string;
  accent: string;
  legs: string;
  style: "tee" | "jacket" | "hoodie" | "jersey" | "tux";
  sparkle?: boolean;
}

export const HER_OUTFITS: Record<string, HerOutfit> = {
  a_pink: { dress: "#ff4f8b", trim: "#ffd1e3", legs: "#a63d6b" },
  a_babyblue: { dress: "#89cff0", trim: "#e3f5ff", legs: "#4a7ea8" },
  a_sunflower: { dress: "#ffcf4a", trim: "#ffffff", legs: "#b0802a", dots: "#ff8a3d" },
  a_plaid: { dress: "#d9443f", trim: "#ffffff", legs: "#7a2a2a", dots: "#ffffff" },
  a_cherry: { dress: "#e8314f", trim: "#ffffff", legs: "#8a1f33", dots: "#ffffff" },
  a_jersey: { dress: "#2a5bd7", trim: "#ffd23f", legs: "#ffffff", dots: "#ffd23f" },
  a_beach: { dress: "#4fd1c5", trim: "#fff3a8", legs: "#e0a37a", dots: "#fff3a8" },
  a_lavender: { dress: "#b48cf2", trim: "#efe4ff", legs: "#6a4fa8", long: true },
  a_winter: { dress: "#ffffff", trim: "#ff5c93", legs: "#5a3a6e", long: true },
  a_wedding: { dress: "#ffffff", trim: "#ffd1e3", legs: "#e8d8e0", long: true },
  a_galaxy: { dress: "#3a1f7a", trim: "#ffd36e", legs: "#24124d", long: true, sparkle: true },
};
export const HIS_OUTFITS: Record<string, HisOutfit> = {
  v_purple: { shirt: "#6a5ae0", accent: "#ff4f8b", legs: "#2d2250", style: "tee" },
  v_babypink: { shirt: "#ffb7d5", accent: "#ffffff", legs: "#4a3a5e", style: "tee" },
  v_hoodie: { shirt: "#ff8a5c", accent: "#ffe0cc", legs: "#3a2f4a", style: "hoodie" },
  v_plaid: { shirt: "#d9443f", accent: "#ffffff", legs: "#3a2f4a", style: "jacket" },
  v_denim: { shirt: "#4a78b8", accent: "#ffffff", legs: "#2d2250", style: "jacket" },
  v_football: { shirt: "#2a5bd7", accent: "#ffd23f", legs: "#ffffff", style: "jersey" },
  v_beach: { shirt: "#ffd23f", accent: "#4fd1c5", legs: "#4fd1c5", style: "tee" },
  v_lavender: { shirt: "#b48cf2", accent: "#ffffff", legs: "#3a2f5e", style: "jacket" },
  v_winter: { shirt: "#4a78b8", accent: "#ffffff", legs: "#2d2250", style: "hoodie" },
  v_tux: { shirt: "#1d1a2b", accent: "#ffffff", legs: "#1d1a2b", style: "tux" },
  v_galaxy: { shirt: "#3a1f7a", accent: "#7ee3ff", legs: "#24124d", style: "tux", sparkle: true },
};

const SKIN = "#ffe0cc";
const HER_HAIR = "#2a1610";
const HIS_HAIR = "#2d1b3d";

/** Valton is taller than Ardiana. */
function heightScale(ctx: CanvasRenderingContext2D, ox: number, her: boolean) {
  ctx.translate(ox, 0);
  ctx.scale(her ? 0.96 : 1.04, her ? 0.93 : 1.13);
  ctx.translate(-ox, 0);
}

function drawBody(ctx: CanvasRenderingContext2D, ox: number, her: boolean, look: Look, t: number, sway: number) {
  if (her) {
    const ho = HER_OUTFITS[look.herOutfit] || HER_OUTFITS.a_pink;
    const hem = ho.long ? -2 : -8;
    const flare = ho.long ? 13 : 11;
    ctx.fillStyle = ho.dress;
    ctx.beginPath();
    ctx.moveTo(ox - 6, -25);
    ctx.lineTo(ox + 6, -25);
    ctx.lineTo(ox + flare, hem + sway);
    ctx.lineTo(ox - flare, hem - sway);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ho.trim;
    ctx.fillRect(ox - 6, -20, 12, 2);
    ctx.fillRect(ox - flare + 1, hem - 2, flare * 2 - 2, 1.6);
    if (ho.dots) {
      ctx.fillStyle = ho.dots;
      for (const [dx, dy] of [
        [-3, -15],
        [3, -12],
        [-5, -9],
        [5, -16],
        [0, -10],
      ]) {
        ctx.beginPath();
        ctx.arc(ox + dx, dy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (ho.sparkle) {
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = Math.sin(t * 5 + i * 1.7) * 0.5 + 0.5;
        ctx.fillRect(ox - 8 + i * 5, -18 + ((i * 7) % 12), 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
  } else {
    const mo = HIS_OUTFITS[look.hisOutfit] || HIS_OUTFITS.v_purple;
    ctx.fillStyle = mo.shirt;
    ctx.beginPath();
    ctx.roundRect(ox - 8, -26, 16, 18, 5);
    ctx.fill();
    ctx.fillStyle = mo.accent;
    if (mo.style === "tee") {
      heartPath(ctx, ox, -18, 6);
      ctx.fill();
    } else if (mo.style === "jacket") {
      ctx.fillRect(ox - 0.75, -26, 1.5, 18);
      ctx.fillRect(ox - 8, -10.5, 16, 2);
    } else if (mo.style === "hoodie") {
      ctx.beginPath();
      ctx.arc(ox, -24, 6, 0, Math.PI);
      ctx.fill();
    } else if (mo.style === "jersey") {
      ctx.font = "700 3.6px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("VALTON", ox, -22.5);
      ctx.font = "700 8px Fredoka, sans-serif";
      ctx.fillText("10", ox, -15.5);
    } else if (mo.style === "tux") {
      ctx.beginPath();
      ctx.moveTo(ox - 3, -26);
      ctx.lineTo(ox + 3, -26);
      ctx.lineTo(ox, -14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = mo.sparkle ? "#7ee3ff" : "#e8314f";
      ctx.beginPath();
      ctx.moveTo(ox - 3.5, -24.5);
      ctx.lineTo(ox, -23);
      ctx.lineTo(ox + 3.5, -24.5);
      ctx.lineTo(ox + 3.5, -21.5);
      ctx.lineTo(ox, -23);
      ctx.lineTo(ox - 3.5, -21.5);
      ctx.closePath();
      ctx.fill();
    }
    if (mo.sparkle) {
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = Math.sin(t * 5 + i * 2) * 0.5 + 0.5;
        ctx.fillRect(ox - 6 + i * 5, -19 + i * 2, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function legColor(look: Look, her: boolean) {
  return her
    ? (HER_OUTFITS[look.herOutfit] || HER_OUTFITS.a_pink).legs
    : (HIS_OUTFITS[look.hisOutfit] || HIS_OUTFITS.v_purple).legs;
}

// ================================================================= BACK VIEW (running)
function wearBack(ctx: CanvasRenderingContext2D, id: string, ox: number, hy: number, t: number) {
  switch (id) {
    case "ah_heartclip":
      ctx.fillStyle = "#ff3d7f";
      heartPath(ctx, ox + 6, hy - 5, 6);
      ctx.fill();
      break;
    case "ah_bow": {
      const by = hy + 1;
      ctx.fillStyle = "#ff3d7f";
      ctx.beginPath();
      ctx.moveTo(ox, by);
      ctx.lineTo(ox - 9, by - 5);
      ctx.lineTo(ox - 9, by + 5);
      ctx.closePath();
      ctx.moveTo(ox, by);
      ctx.lineTo(ox + 9, by - 5);
      ctx.lineTo(ox + 9, by + 5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ah_flowers": {
      const cols = ["#ff8fbf", "#fff", "#ffd36e", "#b48cf2", "#ff8fbf", "#fff"];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.arc(ox + Math.cos(a) * 9.5, hy - 5 + Math.sin(a) * 4, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "ah_sunhat":
      ctx.fillStyle = "#f2d29b";
      ctx.beginPath();
      ctx.ellipse(ox, hy - 7, 16, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ox, hy - 8, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff5c93";
      ctx.fillRect(ox - 8, hy - 10, 16, 2.5);
      break;
    case "ah_veil":
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.beginPath();
      ctx.moveTo(ox - 9, hy - 7);
      ctx.quadraticCurveTo(ox, hy - 14, ox + 9, hy - 7);
      ctx.lineTo(ox + 13, hy + 24);
      ctx.lineTo(ox - 13, hy + 24);
      ctx.closePath();
      ctx.fill();
      break;
    case "vh_cap":
      ctx.fillStyle = "#e8314f";
      ctx.beginPath();
      ctx.arc(ox, hy - 3, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(ox - 3, hy - 4.5, 6, 2);
      break;
    case "vh_shades":
      ctx.strokeStyle = "#14102a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ox - 9.5, hy - 1);
      ctx.lineTo(ox + 9.5, hy - 1);
      ctx.stroke();
      break;
    default:
      wearShared(ctx, id, ox, hy, t);
  }
}

/** Wearables that look the same from front and back. */
function wearShared(ctx: CanvasRenderingContext2D, id: string, ox: number, hy: number, t: number) {
  switch (id) {
    case "ah_tiara":
    case "vh_crown": {
      const big = id === "vh_crown";
      const w = big ? 9 : 7;
      const base = hy - (big ? 8 : 9);
      const h = big ? 8 : 6;
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath();
      ctx.moveTo(ox - w, base);
      ctx.lineTo(ox - w, base - h * 0.6);
      ctx.lineTo(ox - w / 2, base - h * 0.3);
      ctx.lineTo(ox, base - h);
      ctx.lineTo(ox + w / 2, base - h * 0.3);
      ctx.lineTo(ox + w, base - h * 0.6);
      ctx.lineTo(ox + w, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = big ? "#e8314f" : "#7ee3ff";
      ctx.beginPath();
      ctx.arc(ox, base - h * 0.55, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "ah_halo":
    case "vh_halo": {
      const fy = hy - 16 + Math.sin(t * 3) * 1.2;
      ctx.strokeStyle = "rgba(255,236,150,0.95)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(ox, fy, 8, 2.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "ah_catears":
    case "vh_bearears": {
      const cat = id === "ah_catears";
      ctx.fillStyle = cat ? "#ff8fbf" : "#8a5a30";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        if (cat) {
          ctx.moveTo(ox + s * 3, hy - 8);
          ctx.lineTo(ox + s * 8, hy - 17);
          ctx.lineTo(ox + s * 10, hy - 5);
          ctx.closePath();
        } else ctx.arc(ox + s * 7, hy - 8, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "vh_beanie":
      ctx.fillStyle = "#4fb3a8";
      ctx.beginPath();
      ctx.arc(ox, hy - 3, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#3a8f86";
      ctx.fillRect(ox - 10.5, hy - 5, 21, 4);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ox, hy - 14, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "vh_tophat":
      ctx.fillStyle = "#1d1a2b";
      ctx.fillRect(ox - 12, hy - 9, 24, 3);
      ctx.fillRect(ox - 7, hy - 23, 14, 15);
      ctx.fillStyle = "#e8314f";
      ctx.fillRect(ox - 7, hy - 12, 14, 2.5);
      break;
    default:
      break;
  }
}

function personBack(ctx: CanvasRenderingContext2D, ox: number, her: boolean, air: boolean, look: Look, t: number, ph: number) {
  ctx.save();
  heightScale(ctx, ox, her);
  const stride = Math.sin(ph + (her ? 0 : Math.PI));
  ctx.strokeStyle = legColor(look, her);
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  let fl: number;
  let fr: number;
  let lx: number;
  ctx.beginPath();
  if (air) {
    fl = -4;
    fr = -5;
    lx = 5;
  } else {
    fl = -1 - Math.max(0, stride) * 4.5;
    fr = -1 - Math.max(0, -stride) * 4.5;
    lx = 3.5;
  }
  ctx.moveTo(ox - 3, -10);
  ctx.lineTo(ox - lx, fl);
  ctx.moveTo(ox + 3, -10);
  ctx.lineTo(ox + lx, fr);
  ctx.stroke();
  ctx.fillStyle = "#3a2a3a";
  ctx.beginPath();
  ctx.ellipse(ox - lx, fl + 0.5, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.ellipse(ox + lx, fr + 0.5, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  drawBody(ctx, ox, her, look, t, air ? 1.5 : stride * 0.8);

  const outer = her ? -1 : 1;
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox + outer * 6, -22);
  if (air) ctx.lineTo(ox + outer * 12, -33);
  else ctx.lineTo(ox + outer * 10, -14 - stride * 3.5);
  ctx.stroke();

  const hy = -34;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(ox, hy, 9, 0, Math.PI * 2);
  ctx.fill();
  if (her) {
    ctx.fillStyle = HER_HAIR;
    ctx.beginPath();
    ctx.arc(ox, hy - 0.5, 10, 0, Math.PI * 2);
    ctx.fill();
    const sw = Math.sin(ph * 0.5 + t) * 1.5;
    ctx.beginPath();
    ctx.moveTo(ox - 9.5, hy);
    ctx.quadraticCurveTo(ox - 10.5 + sw, hy + 12, ox - 6 + sw, hy + 17);
    ctx.lineTo(ox + 6 + sw, hy + 17);
    ctx.quadraticCurveTo(ox + 10.5 + sw, hy + 12, ox + 9.5, hy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,190,140,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ox - 2, hy - 2, 6, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.ellipse(ox - 9, hy + 1, 2, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(ox + 9, hy + 1, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = HIS_HAIR;
    ctx.beginPath();
    ctx.arc(ox, hy - 0.8, 9.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKIN;
    ctx.fillRect(ox - 3, hy + 7.5, 6, 2.5);
  }
  wearBack(ctx, her ? look.herHat : look.hisHat, ox, hy, t);
  ctx.restore();
}

/** Couple seen from behind, feet at (0,0). ~48 units tall. */
export function drawCoupleBack(ctx: CanvasRenderingContext2D, look: Look, t: number, phase: number, air: boolean) {
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -22);
  ctx.quadraticCurveTo(0, -15 + Math.sin(phase) * 1.5, 6, -23.5);
  ctx.stroke();
  personBack(ctx, -11, true, air, look, t, phase);
  personBack(ctx, 11, false, air, look, t, phase);
}

// ================================================================= FRONT VIEW (shop preview)
function wearFront(ctx: CanvasRenderingContext2D, id: string, ox: number, hy: number, t: number) {
  switch (id) {
    case "ah_heartclip":
      ctx.fillStyle = "#ff3d7f";
      heartPath(ctx, ox + 6, hy - 8, 6);
      ctx.fill();
      break;
    case "ah_bow": {
      const by = hy - 11;
      ctx.fillStyle = "#ff3d7f";
      ctx.beginPath();
      ctx.moveTo(ox, by);
      ctx.lineTo(ox - 9, by - 5);
      ctx.lineTo(ox - 9, by + 5);
      ctx.closePath();
      ctx.moveTo(ox, by);
      ctx.lineTo(ox + 9, by - 5);
      ctx.lineTo(ox + 9, by + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c2185b";
      ctx.beginPath();
      ctx.arc(ox, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "ah_flowers": {
      const cols = ["#ff8fbf", "#fff", "#ffd36e", "#b48cf2", "#ff8fbf"];
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.arc(ox + Math.cos(a) * 9, hy - 7 + Math.sin(a) * 4, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "ah_sunhat":
      ctx.fillStyle = "#f2d29b";
      ctx.beginPath();
      ctx.ellipse(ox, hy - 8, 16, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ox, hy - 9, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff5c93";
      ctx.fillRect(ox - 8, hy - 11, 16, 2.5);
      break;
    case "ah_veil":
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.moveTo(ox - 9, hy - 8);
      ctx.quadraticCurveTo(ox, hy - 15, ox + 9, hy - 8);
      ctx.lineTo(ox + 14, hy + 16);
      ctx.lineTo(ox + 9, hy + 2);
      ctx.lineTo(ox - 9, hy + 2);
      ctx.lineTo(ox - 14, hy + 16);
      ctx.closePath();
      ctx.fill();
      break;
    case "vh_cap":
      ctx.fillStyle = "#e8314f";
      ctx.beginPath();
      ctx.arc(ox, hy - 4, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(ox - 11, hy - 5, 22, 2.6);
      break;
    case "vh_shades":
      ctx.fillStyle = "#14102a";
      ctx.beginPath();
      ctx.roundRect(ox - 7, hy - 2.5, 6, 4, 1.5);
      ctx.roundRect(ox + 1, hy - 2.5, 6, 4, 1.5);
      ctx.fill();
      ctx.fillRect(ox - 1, hy - 1.6, 2, 1);
      break;
    default:
      wearShared(ctx, id, ox, hy, t);
  }
}

function personFront(ctx: CanvasRenderingContext2D, ox: number, her: boolean, look: Look, t: number, rising: boolean, happy: boolean) {
  ctx.save();
  heightScale(ctx, ox, her);
  const kick = rising ? Math.sin(t * 22 + (her ? 0 : 1.5)) * 3 : 0;
  ctx.strokeStyle = legColor(look, her);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ox - 3, -10);
  ctx.lineTo(ox - 4 - kick * 0.5, -1);
  ctx.moveTo(ox + 3, -10);
  ctx.lineTo(ox + 4 + kick * 0.5, -1);
  ctx.stroke();
  drawBody(ctx, ox, her, look, t, kick * 0.3);
  const outer = her ? -1 : 1;
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox + outer * 6, -22);
  ctx.lineTo(ox + outer * 12, -22 + (rising ? -10 : 2));
  ctx.stroke();
  const hy = -34;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(ox, hy, 9, 0, Math.PI * 2);
  ctx.fill();
  if (her) {
    ctx.fillStyle = HER_HAIR;
    ctx.beginPath();
    ctx.arc(ox, hy - 1, 10, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.fillRect(ox - 10, hy - 2, 3, 13);
    ctx.fillRect(ox + 7, hy - 2, 3, 13);
  } else {
    ctx.fillStyle = HIS_HAIR;
    ctx.beginPath();
    ctx.arc(ox, hy - 1, 9.8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox - 6, hy - 9);
    ctx.quadraticCurveTo(ox + 4, hy - 13, ox + 9, hy - 5);
    ctx.lineTo(ox, hy - 5);
    ctx.fill();
  }
  // face
  const blink = Math.sin(t * 1.3 + (her ? 0 : 2)) > 0.985;
  ctx.fillStyle = "#3a1d2e";
  ctx.strokeStyle = "#3a1d2e";
  ctx.lineWidth = 1.5;
  if (happy || blink) {
    ctx.beginPath();
    ctx.arc(ox - 3.2, hy + 0.5, 1.8, Math.PI, 0);
    ctx.moveTo(ox + 5, hy + 0.5);
    ctx.arc(ox + 3.2, hy + 0.5, 1.8, Math.PI, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(ox - 3.2, hy, 1.5, 0, Math.PI * 2);
    ctx.arc(ox + 3.2, hy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,110,150,0.55)";
  ctx.beginPath();
  ctx.ellipse(ox - 5.5, hy + 3.5, 2.2, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse(ox + 5.5, hy + 3.5, 2.2, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ox, hy + 3.5, 2, 0.1, Math.PI - 0.1);
  ctx.stroke();
  wearFront(ctx, her ? look.herHat : look.hisHat, ox, hy, t);
  ctx.restore();
}

/** Couple seen from the front (for the shop preview), feet at (0,0). */
export function drawCoupleFront(ctx: CanvasRenderingContext2D, look: Look, t: number, rising: boolean) {
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -22);
  ctx.quadraticCurveTo(0, -14, 6, -23.5);
  ctx.stroke();
  personFront(ctx, -11, true, look, t, rising, rising);
  personFront(ctx, 11, false, look, t, rising, rising);
}
