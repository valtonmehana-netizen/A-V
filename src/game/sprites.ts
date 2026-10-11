import { heartPath, rnd, type ParkTheme } from "./util";

// ---------------------------------------------------------------- seasonal palettes
const PALETTES: Record<ParkTheme, string[][]> = {
  autumn: [
    ["#c2561a", "#dc7024", "#ee8f30", "#fbb048"],
    ["#b8861a", "#d4a222", "#e8bc30", "#f8d652"],
    ["#c86e18", "#e08a22", "#f2a830", "#fcc650"],
    ["#c69a20", "#dcb42a", "#eecb3a", "#fbe06a"],
  ],
  winter: [
    ["#2f5a4a", "#c9d6e6", "#e4ecf6", "#ffffff"],
    ["#b8c6d8", "#d2deec", "#e8eff8", "#ffffff"],
    ["#36604e", "#3f6e58", "#dfe8f3", "#ffffff"],
    ["#c4d0e0", "#dae4f0", "#eef3fa", "#ffffff"],
  ],
  spring: [
    ["#f08cb4", "#f7a8c8", "#fcc2da", "#ffe0ec"],
    ["#7cc46a", "#92d47c", "#a8e090", "#c6eeb0"],
    ["#f4a0c0", "#ffffff", "#ffd1e3", "#fff0f6"],
    ["#86c870", "#f7a8c8", "#a8e090", "#ffd1e3"],
  ],
  summer: [
    ["#2e7a34", "#3a8c40", "#4aa04e", "#62b862"],
    ["#3a8a2c", "#4c9c36", "#60b044", "#7cc458"],
    ["#286e30", "#34823a", "#449646", "#5aac56"],
    ["#3c8e3a", "#4ea244", "#ffd23f", "#62b862"],
  ],
};
const BUSH: Record<ParkTheme, string[]> = {
  autumn: ["#7a6a2a", "#a8742c", "#c0602a", "#5e5a26"],
  winter: ["#dfe8f3", "#ffffff", "#c9d6e6", "#3f6e58"],
  spring: ["#7cc46a", "#f7a8c8", "#92d47c", "#5fae5a"],
  summer: ["#3f8a49", "#56a65d", "#4f9e57", "#2f7a3c"],
};
const GRASS: Record<ParkTheme, string> = {
  autumn: "#8a8a3a",
  winter: "#ffffff",
  spring: "#6cc067",
  summer: "#4f9e57",
};

let THEME: ParkTheme = "autumn";
let PAL = PALETTES.autumn;
export function setSpriteTheme(t: ParkTheme) {
  THEME = t;
  PAL = PALETTES[t];
}

export function makeSprite(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, R = 2) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * R));
  c.height = Math.max(1, Math.ceil(h * R));
  const g = c.getContext("2d")!;
  g.scale(R, R);
  draw(g);
  return c;
}

function leafPile(g: CanvasRenderingContext2D, cx: number, b: number, spread: number, n: number, seed: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = THEME === "winter" ? (i % 2 ? "#ffffff" : "#e4ecf6") : PAL[i % 4][(i + seed) % 4];
    g.beginPath();
    g.ellipse(cx + (rnd(i * 13 + seed) - 0.5) * spread, b - 2 - rnd(i * 17 + seed) * 8, 5, 2.4, rnd(i * 3) * 3, 0, Math.PI * 2);
    g.fill();
  }
}

function canopyShade(g: CanvasRenderingContext2D, top: number, bottom: number) {
  g.save();
  g.globalCompositeOperation = "source-atop";
  const shade = g.createLinearGradient(0, top, 0, bottom);
  shade.addColorStop(0, "rgba(255,235,170,0.2)");
  shade.addColorStop(1, "rgba(50,15,10,0.3)");
  g.fillStyle = shade;
  g.fillRect(0, 0, 220, bottom + 10);
  const sun = g.createLinearGradient(30, 0, 200, 0);
  sun.addColorStop(0, "rgba(60,15,40,0.15)");
  sun.addColorStop(1, "rgba(255,210,120,0.25)");
  g.fillStyle = sun;
  g.fillRect(0, 0, 220, bottom + 10);
  g.restore();
}

// ---------------------------------------------------------------- trees
export function paintTree(g: CanvasRenderingContext2D, pal: number) {
  const cols = PAL[pal % PAL.length];
  const cx = 110;
  const b = 320;
  const tg = g.createLinearGradient(cx - 14, 0, cx + 14, 0);
  tg.addColorStop(0, "#5a3620");
  tg.addColorStop(0.45, "#86532f");
  tg.addColorStop(1, "#4e2e1a");
  g.fillStyle = tg;
  g.beginPath();
  g.moveTo(cx - 18, b);
  g.quadraticCurveTo(cx - 10, b - 20, cx - 10, b - 110);
  g.lineTo(cx - 8, b - 190);
  g.lineTo(cx + 8, b - 190);
  g.lineTo(cx + 10, b - 110);
  g.quadraticCurveTo(cx + 10, b - 20, cx + 18, b);
  g.closePath();
  g.fill();
  g.strokeStyle = "#6e4329";
  g.lineWidth = 8;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx, b - 150);
  g.lineTo(cx - 45, b - 200);
  g.moveTo(cx, b - 160);
  g.lineTo(cx + 42, b - 210);
  g.stroke();
  g.save();
  const blobs: [number, number, number, number][] = [
    [-60, 205, 48, 0],
    [60, 200, 48, 0],
    [0, 190, 66, 1],
    [-34, 240, 50, 2],
    [34, 245, 50, 2],
    [0, 272, 42, 3],
    [-76, 172, 32, 1],
    [76, 170, 32, 1],
  ];
  for (const [bx, by, r, ci] of blobs) {
    g.fillStyle = cols[ci];
    g.beginPath();
    g.arc(cx + bx, b - by, r, 0, Math.PI * 2);
    g.fill();
  }
  canopyShade(g, b - 330, b - 120);
  g.restore();
  for (let i = 0; i < 26; i++) {
    g.fillStyle = i % 3 === 0 ? "rgba(255,240,190,0.5)" : i % 3 === 1 ? cols[3] : cols[0];
    g.beginPath();
    g.ellipse(cx + (rnd(i * 3 + pal) - 0.5) * 170, b - 160 - rnd(i * 7 + pal) * 130, 6, 3.5, rnd(i) * 3, 0, Math.PI * 2);
    g.fill();
  }
  leafPile(g, cx, b, 120, 24, pal);
  g.fillStyle = GRASS[THEME];
  for (let i = 0; i < 9; i++) {
    const x = cx - 30 + i * 7.5;
    g.beginPath();
    g.moveTo(x - 3, b);
    g.lineTo(x + 1, b - 10 - rnd(i) * 10);
    g.lineTo(x + 4, b);
    g.fill();
  }
}

export function paintTallTree(g: CanvasRenderingContext2D, pal: number) {
  const cx = 110;
  const b = 420;
  const cols = PAL[pal % PAL.length];
  const tg = g.createLinearGradient(cx - 10, 0, cx + 10, 0);
  tg.addColorStop(0, "#4e2e1a");
  tg.addColorStop(0.5, "#7e4e2c");
  tg.addColorStop(1, "#43271a");
  g.fillStyle = tg;
  g.beginPath();
  g.moveTo(cx - 13, b);
  g.quadraticCurveTo(cx - 7, b - 30, cx - 6, b - 160);
  g.lineTo(cx - 3, b - 330);
  g.lineTo(cx + 3, b - 330);
  g.lineTo(cx + 6, b - 160);
  g.quadraticCurveTo(cx + 7, b - 30, cx + 13, b);
  g.closePath();
  g.fill();
  g.strokeStyle = "#6e4329";
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  for (const [y, dx] of [
    [190, -36],
    [215, 34],
    [255, -30],
    [285, 28],
  ]) {
    g.moveTo(cx, b - y);
    g.lineTo(cx + dx, b - y - 34);
  }
  g.stroke();
  g.save();
  const blobs: [number, number, number, number][] = [
    [-34, 175, 38, 0],
    [34, 182, 38, 0],
    [0, 200, 48, 1],
    [-30, 240, 40, 1],
    [30, 250, 40, 2],
    [0, 280, 44, 2],
    [-22, 320, 34, 3],
    [22, 328, 32, 2],
    [0, 360, 32, 3],
    [0, 392, 22, 3],
  ];
  for (const [bx, by, r, ci] of blobs) {
    g.fillStyle = cols[ci];
    g.beginPath();
    g.arc(cx + bx, b - by, r, 0, Math.PI * 2);
    g.fill();
  }
  canopyShade(g, b - 410, b - 140);
  g.restore();
  for (let i = 0; i < 30; i++) {
    g.fillStyle = i % 3 === 0 ? "rgba(255,240,190,0.55)" : cols[i % 4];
    g.beginPath();
    g.ellipse(cx + (rnd(i * 3 + pal) - 0.5) * 140, b - 150 - rnd(i * 7 + pal) * 250, 6, 3.5, rnd(i) * 3, 0, Math.PI * 2);
    g.fill();
  }
  leafPile(g, cx, b, 110, 20, pal + 3);
}

// ---------------------------------------------------------------- park props
export function paintLamp(g: CanvasRenderingContext2D) {
  g.fillStyle = "#2f2a3f";
  g.fillRect(17, 40, 6, 220);
  g.fillRect(11, 248, 18, 12);
  g.beginPath();
  g.roundRect(8, 14, 24, 28, 5);
  g.fill();
  g.fillStyle = "#ffe9a8";
  g.fillRect(12, 19, 16, 18);
  g.fillStyle = "#2f2a3f";
  g.beginPath();
  g.moveTo(3, 15);
  g.lineTo(20, 2);
  g.lineTo(37, 15);
  g.closePath();
  g.fill();
}

export function paintBush(g: CanvasRenderingContext2D) {
  const bc = BUSH[THEME];
  const blobs: [number, number, number, string][] = [
    [30, 45, 26, bc[0]],
    [62, 34, 32, bc[1]],
    [92, 46, 24, bc[2]],
    [60, 52, 24, bc[3]],
  ];
  for (const [x, y, r, c] of blobs) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.beginPath();
  g.arc(52, 22, 10, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#ff8fbf" : "#ffd36e";
    g.beginPath();
    g.arc(14 + rnd(i * 5) * 92, 18 + rnd(i * 11) * 40, 3, 0, Math.PI * 2);
    g.fill();
  }
}

export function paintFence(g: CanvasRenderingContext2D) {
  g.fillStyle = "rgba(60,30,60,0.2)";
  g.fillRect(0, 54, 100, 6);
  g.fillStyle = "#ffffff";
  g.strokeStyle = "#cdb3c6";
  g.lineWidth = 1.5;
  g.fillRect(0, 20, 100, 8);
  g.strokeRect(0, 20, 100, 8);
  g.fillRect(0, 38, 100, 8);
  g.strokeRect(0, 38, 100, 8);
  for (let i = 0; i < 6; i++) {
    const x = 3 + i * 16.4;
    g.beginPath();
    g.moveTo(x, 58);
    g.lineTo(x, 10);
    g.lineTo(x + 5.5, 3);
    g.lineTo(x + 11, 10);
    g.lineTo(x + 11, 58);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = "#ff5c93";
  heartPath(g, 50, 30, 14);
  g.fill();
}

export function paintBench(g: CanvasRenderingContext2D) {
  g.fillStyle = "rgba(40,20,30,0.22)";
  g.fillRect(2, 60, 96, 6);
  g.fillStyle = "#2f2a3f";
  g.fillRect(10, 36, 5, 28);
  g.fillRect(85, 36, 5, 28);
  g.fillRect(10, 2, 5, 34);
  g.fillRect(85, 2, 5, 34);
  const wood = (y: number, h: number, c: string) => {
    g.fillStyle = c;
    g.beginPath();
    g.roundRect(2, y, 96, h, 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(4, y + 1, 92, 1.5);
    g.strokeStyle = "rgba(90,50,20,0.35)";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(6, y + h / 2);
    g.bezierCurveTo(30, y + h / 2 + 1, 70, y + h / 2 - 1, 94, y + h / 2);
    g.stroke();
  };
  wood(4, 8, "#c98a4f");
  wood(15, 8, "#bd7f45");
  wood(32, 7, "#c4854a");
  wood(40, 7, "#b8743f");
  g.fillStyle = "#2f2a3f";
  g.beginPath();
  g.roundRect(4, 28, 14, 4, 2);
  g.roundRect(82, 28, 14, 4, 2);
  g.fill();
  g.fillStyle = "#ff5c93";
  heartPath(g, 50, 13, 10);
  g.fill();
}

export function paintArch(g: CanvasRenderingContext2D) {
  g.fillStyle = "#ffffff";
  g.fillRect(4, 60, 7, 115);
  g.fillRect(94, 60, 7, 115);
  g.strokeStyle = "#4f9e57";
  g.lineWidth = 2.5;
  for (const px of [7.5, 97.5]) {
    g.beginPath();
    for (let y = 70; y <= 172; y += 4) {
      const x = px + Math.sin(y * 0.2) * 4;
      if (y === 70) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    for (let y = 78; y < 170; y += 16) {
      g.fillStyle = "#ff5c93";
      g.beginPath();
      g.arc(px + Math.sin(y * 0.2) * 4, y, 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const grad = g.createLinearGradient(0, 4, 0, 72);
  grad.addColorStop(0, "#ff9ac1");
  grad.addColorStop(1, "#ff4f8b");
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(0, 6, 105, 64, 16);
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  g.stroke();
  for (let i = 0; i < 9; i++) {
    for (const yy of [10, 66]) {
      g.fillStyle = i % 2 ? "#e8314f" : "#ffffff";
      g.beginPath();
      g.arc(7 + i * 11.4, yy, 6, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = "#ffffff";
  g.font = "700 26px Fredoka, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("V ♥ A", 52.5, 39);
}

export function paintLogs(g: CanvasRenderingContext2D) {
  g.fillStyle = "rgba(40,20,10,0.3)";
  g.beginPath();
  g.ellipse(55, 186, 54, 6, 0, 0, Math.PI * 2);
  g.fill();
  const log = (x: number, y: number, r: number) => {
    g.fillStyle = "#5a3418";
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    const face = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 1, x, y, r * 0.85);
    face.addColorStop(0, "#f2cf96");
    face.addColorStop(1, "#c8925a");
    g.fillStyle = face;
    g.beginPath();
    g.arc(x, y, r * 0.84, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(140,85,40,0.55)";
    g.lineWidth = 1.2;
    for (const k of [0.25, 0.45, 0.65]) {
      g.beginPath();
      g.arc(x + r * 0.05, y + r * 0.03, r * k, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = "rgba(90,50,20,0.6)";
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + r * 0.6, y - r * 0.35);
    g.stroke();
  };
  const r = 18.5;
  for (let i = 0; i < 3; i++) log(18 + i * 37, 186 - r, r);
  for (let i = 0; i < 2; i++) log(36.5 + i * 37, 186 - r * 2.7, r);
  log(55, 186 - r * 4.4, r);
  log(38, 186 - r * 6.0, r * 0.9);
  log(72, 186 - r * 6.0, r * 0.9);
  log(55, 186 - r * 7.6, r * 0.9);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = THEME === "winter" ? "#ffffff" : PAL[i % 4][2];
    g.beginPath();
    g.ellipse(18 + rnd(i * 7) * 74, 30 + rnd(i * 13) * 150, 5, 2.4, rnd(i) * 3, 0, Math.PI * 2);
    g.fill();
  }
}

export function paintCart(g: CanvasRenderingContext2D) {
  g.fillStyle = "rgba(40,20,40,0.25)";
  g.fillRect(4, 194, 92, 6);
  g.fillStyle = "#6b5a6e";
  g.fillRect(48, 26, 4, 90);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? "#ffffff" : "#ff8fbf";
    g.beginPath();
    g.moveTo(50, 8);
    g.lineTo(2 + i * 16, 44);
    g.lineTo(18 + i * 16, 44);
    g.closePath();
    g.fill();
  }
  g.fillStyle = "#ff5c93";
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(10 + i * 16, 44, 8, 0, Math.PI);
    g.fill();
  }
  g.fillStyle = "#89cff0";
  g.beginPath();
  g.roundRect(6, 110, 88, 66, 10);
  g.fill();
  g.fillStyle = "#ffffff";
  g.fillRect(6, 124, 88, 8);
  g.fillStyle = "#ff3d7f";
  g.font = "700 13px Fredoka, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("GELATO", 50, 152);
  for (const [x, c] of [
    [28, "#ffb7d5"],
    [50, "#fff3c4"],
    [72, "#b5e8c8"],
  ] as [number, string][]) {
    g.fillStyle = "#e0a243";
    g.beginPath();
    g.moveTo(x - 7, 104);
    g.lineTo(x + 7, 104);
    g.lineTo(x, 118);
    g.closePath();
    g.fill();
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, 100, 8, 0, Math.PI * 2);
    g.fill();
  }
  for (const x of [22, 78]) {
    g.fillStyle = "#3a2f4a";
    g.beginPath();
    g.arc(x, 184, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#cfc6cf";
    g.beginPath();
    g.arc(x, 184, 4, 0, Math.PI * 2);
    g.fill();
  }
}

/** Fallen tree seen end-on: big upturned root ball with soil, roots & stones. 100×200 */
export function paintFallenTree(g: CanvasRenderingContext2D) {
  const cx = 50;
  const cy = 112;
  g.fillStyle = "rgba(30,15,10,0.3)";
  g.beginPath();
  g.ellipse(cx, 196, 50, 6, 0, 0, Math.PI * 2);
  g.fill();
  // roots fanning out
  g.strokeStyle = "#5a3a22";
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rnd(i) * 0.3;
    const len = 44 + rnd(i * 3) * 16;
    g.lineWidth = 3 + rnd(i * 7) * 4;
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + Math.cos(a + 0.3) * len * 0.6, cy + Math.sin(a + 0.3) * len * 0.6, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.stroke();
  }
  // earthy root ball
  const soil = g.createRadialGradient(cx - 10, cy - 14, 6, cx, cy, 46);
  soil.addColorStop(0, "#8a5e3a");
  soil.addColorStop(0.7, "#6a4428");
  soil.addColorStop(1, "#4a2e1a");
  g.fillStyle = soil;
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 40 + Math.sin(i * 2.3) * 4 + rnd(i) * 4;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 1.05;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  // cut trunk centre with rings
  const face = g.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 22);
  face.addColorStop(0, "#f2cf96");
  face.addColorStop(1, "#c8925a");
  g.fillStyle = face;
  g.beginPath();
  g.arc(cx, cy, 21, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(140,85,40,0.55)";
  g.lineWidth = 1.2;
  for (const k of [6, 11, 16]) {
    g.beginPath();
    g.arc(cx + 1, cy + 1, k, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = "#5a3418";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, 21, 0, Math.PI * 2);
  g.stroke();
  // stones & tiny root hairs
  for (let i = 0; i < 9; i++) {
    const a = rnd(i * 5) * Math.PI * 2;
    const r = 26 + rnd(i * 9) * 12;
    g.fillStyle = i % 2 ? "#a89a90" : "#8a7e76";
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + rnd(i) * 2, 2.4, a, 0, Math.PI * 2);
    g.fill();
  }
  // moss & seasonal leaves on top
  for (let i = 0; i < 16; i++) {
    g.fillStyle = THEME === "winter" ? (i % 2 ? "#ffffff" : "#e4ecf6") : PAL[i % 4][(i * 3) % 4];
    g.beginPath();
    g.ellipse(cx - 34 + rnd(i * 11) * 68, cy - 38 - rnd(i * 13) * 14, 6, 3.2, rnd(i) * 3, 0, Math.PI * 2);
    g.fill();
  }
  if (THEME === "winter") {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(cx, cy - 42, 34, 7, 0, Math.PI, 0);
    g.fill();
  }
}

export function paintHedge(g: CanvasRenderingContext2D) {
  const grad = g.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, THEME === "winter" ? "#eef3fa" : "#5fb062");
  grad.addColorStop(0.25, "#4f9e57");
  grad.addColorStop(1, "#2f7a3c");
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(2, 8, 96, 192, 14);
  g.fill();
  for (let i = 0; i < 40; i++) {
    g.fillStyle = i % 3 ? "rgba(255,255,255,0.12)" : "rgba(0,40,0,0.15)";
    g.beginPath();
    g.arc(8 + rnd(i * 3) * 84, 14 + rnd(i * 7) * 180, 6 + rnd(i) * 6, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 12; i++) {
    g.fillStyle = ["#ff8fbf", "#ffffff", "#ffd36e"][i % 3];
    g.beginPath();
    g.arc(10 + rnd(i * 11) * 80, 18 + rnd(i * 13) * 170, 3, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#4a2a18";
  g.fillRect(2, 194, 96, 6);
}

// ---------------------------------------------------------------- Taukbashqe
export function paintSign(g: CanvasRenderingContext2D) {
  g.fillStyle = "#6b4226";
  g.fillRect(36, 90, 11, 80);
  g.fillRect(173, 90, 11, 80);
  g.fillStyle = "rgba(40,20,10,0.3)";
  g.beginPath();
  g.roundRect(13, 14, 200, 94, 8);
  g.fill();
  const woods = ["#c98a4f", "#bd7f45", "#c4854a"];
  for (let i = 0; i < 3; i++) {
    g.fillStyle = woods[i];
    g.beginPath();
    g.roundRect(10, 10 + i * 31, 200, 30, 5);
    g.fill();
  }
  g.strokeStyle = "#7a4a26";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(10, 10, 200, 92, 8);
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "400 27px Pacifico, cursive";
  g.fillStyle = "#4a2410";
  g.fillText("Taukbashqe", 110, 36, 180);
  g.font = "600 14px Fredoka, sans-serif";
  g.fillText("where we had", 110, 68);
  g.fillText("our first date ♥", 110, 86);
  g.fillStyle = "#e0336f";
  heartPath(g, 32, 78, 15);
  g.fill();
  heartPath(g, 188, 78, 15);
  g.fill();
}

export function paintLogTrees(g: CanvasRenderingContext2D) {
  const spot = g.createRadialGradient(210, 320, 10, 210, 320, 170);
  spot.addColorStop(0, "rgba(255,230,170,0.5)");
  spot.addColorStop(1, "rgba(255,230,170,0)");
  g.fillStyle = spot;
  g.fillRect(0, 200, 420, 130);
  for (const tx of [-4.5, 215.5]) {
    g.save();
    g.translate(tx, 26);
    g.scale(0.95, 0.95);
    paintTree(g, 1);
    g.restore();
  }
  g.strokeStyle = "#3a2010";
  g.lineWidth = 2;
  heartPath(g, 100, 232, 26);
  g.stroke();
  g.fillStyle = "#3a2010";
  g.font = "700 10px Fredoka, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("V+A", 100, 231);
  g.strokeStyle = "rgba(60,40,40,0.75)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(106, 150);
  g.quadraticCurveTo(210, 210, 314, 150);
  g.stroke();
  const bulbs = ["#ffe38a", "#ff9ac1", "#9ad8ff", "#ffffff"];
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const x = (1 - t) * (1 - t) * 106 + 2 * (1 - t) * t * 210 + t * t * 314;
    const y = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 210 + t * t * 150;
    g.fillStyle = "rgba(255,240,200,0.35)";
    g.beginPath();
    g.arc(x, y + 3, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = bulbs[i % 4];
    g.beginPath();
    g.arc(x, y + 3, 3.4, 0, Math.PI * 2);
    g.fill();
  }
  const ly = 280;
  const lr = 11;
  const bark = g.createLinearGradient(0, ly - lr, 0, ly + lr);
  bark.addColorStop(0, "#a8723f");
  bark.addColorStop(0.35, "#8a5a30");
  bark.addColorStop(1, "#5a3a1e");
  g.fillStyle = bark;
  g.beginPath();
  g.roundRect(80, ly - lr, 268, lr * 2, lr);
  g.fill();
  g.fillStyle = "#c08a52";
  g.beginPath();
  g.roundRect(90, ly - lr, 248, 5, 2);
  g.fill();
  g.fillStyle = "#e3b77f";
  g.beginPath();
  g.ellipse(346, ly, 6, lr, 0, 0, Math.PI * 2);
  g.fill();
  for (const rx of [100, 320]) {
    g.strokeStyle = "#d9c08a";
    g.lineWidth = 2.2;
    for (let k = -1; k <= 1; k++) {
      g.beginPath();
      g.moveTo(rx - 9 + k * 4, ly - lr - 3);
      g.lineTo(rx + 7 + k * 4, ly + lr + 3);
      g.stroke();
    }
  }
  g.fillStyle = "#ff5c93";
  heartPath(g, 210, ly - lr - 6, 13);
  g.fill();
}

export function paintGate(g: CanvasRenderingContext2D) {
  const pillar = (x: number) => {
    const st = g.createLinearGradient(x, 0, x + 46, 0);
    st.addColorStop(0, "#7a5a4a");
    st.addColorStop(0.5, "#a8826a");
    st.addColorStop(1, "#6a4a3c");
    g.fillStyle = st;
    g.fillRect(x, 120, 46, 220);
    g.strokeStyle = "rgba(50,30,20,0.35)";
    g.lineWidth = 1.2;
    for (let y = 130; y < 340; y += 14) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 46, y);
      g.stroke();
    }
    g.fillStyle = "#5a3e32";
    g.fillRect(x - 6, 112, 58, 12);
    g.fillRect(x - 4, 326, 54, 14);
    g.fillStyle = "#2a2230";
    g.fillRect(x + 19, 84, 8, 28);
    g.beginPath();
    g.roundRect(x + 9, 58, 28, 30, 5);
    g.fill();
    g.fillStyle = "#ffe08a";
    g.fillRect(x + 13, 63, 20, 20);
    g.fillStyle = "#2a2230";
    g.beginPath();
    g.moveTo(x + 5, 60);
    g.lineTo(x + 23, 46);
    g.lineTo(x + 41, 60);
    g.closePath();
    g.fill();
    for (let i = 0; i < 22; i++) {
      g.fillStyle = PAL[i % 4][(i * 3) % 4];
      g.beginPath();
      g.ellipse(x + 4 + rnd(i * 7 + x) * 40, 126 + rnd(i * 11 + x) * 150, 5, 3, rnd(i) * 3, 0, Math.PI * 2);
      g.fill();
    }
  };
  pillar(10);
  pillar(404);
  g.strokeStyle = "#2a2230";
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(56, 150);
  g.quadraticCurveTo(230, 30, 404, 150);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(56, 172);
  g.quadraticCurveTo(230, 62, 404, 172);
  g.stroke();
  g.lineWidth = 2;
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const x = 56 + t * 348;
    const y1 = (1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 30 + t * t * 150;
    const y2 = (1 - t) * (1 - t) * 172 + 2 * (1 - t) * t * 62 + t * t * 172;
    g.beginPath();
    g.moveTo(x, y1);
    g.lineTo(x, y2);
    g.stroke();
  }
  const bx = 110;
  const by = 58;
  const bw = 240;
  const bh = 72;
  g.fillStyle = "rgba(30,15,10,0.35)";
  g.beginPath();
  g.roundRect(bx + 4, by + 5, bw, bh, 10);
  g.fill();
  const wood = g.createLinearGradient(0, by, 0, by + bh);
  wood.addColorStop(0, "#9a6232");
  wood.addColorStop(1, "#6e4220");
  g.fillStyle = wood;
  g.beginPath();
  g.roundRect(bx, by, bw, bh, 10);
  g.fill();
  g.strokeStyle = "#d9a441";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(bx + 5, by + 5, bw - 10, bh - 10, 7);
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "800 38px Fredoka, sans-serif";
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillText("TAUKBASHQE", 232, by + 30, bw - 26);
  const gold = g.createLinearGradient(0, by + 12, 0, by + 48);
  gold.addColorStop(0, "#fff1b8");
  gold.addColorStop(1, "#e3a937");
  g.fillStyle = gold;
  g.fillText("TAUKBASHQE", 230, by + 28, bw - 26);
  g.font = "600 13px Fredoka, sans-serif";
  g.fillStyle = "#ffe7b0";
  g.fillText("P A R K   ·   our first date ♥", 230, by + 56);
}

export function paintSignpost(g: CanvasRenderingContext2D) {
  g.fillStyle = "#5a3a22";
  g.fillRect(40, 30, 10, 140);
  const plank = (y: number, text: string, dir: number, size: number) => {
    g.fillStyle = "#b07842";
    g.beginPath();
    if (dir > 0) {
      g.moveTo(4, y);
      g.lineTo(76, y);
      g.lineTo(88, y + 13);
      g.lineTo(76, y + 26);
      g.lineTo(4, y + 26);
    } else {
      g.moveTo(86, y);
      g.lineTo(14, y);
      g.lineTo(2, y + 13);
      g.lineTo(14, y + 26);
      g.lineTo(86, y + 26);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = "#7a4a26";
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = "#3a1e0c";
    g.font = `700 ${size}px Fredoka, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 45, y + 14, 70);
  };
  plank(14, "TAUKBASHQE", 1, 12);
  plank(46, "♥ first date", -1, 11);
}

const BOARD_LINES = ["our first date ♥", "Valton ♥ Ardiana", "where it all began", "forever us 💕"];
let boardLineIdx = 0;
export function paintBoard(g: CanvasRenderingContext2D) {
  const sub = BOARD_LINES[boardLineIdx++ % BOARD_LINES.length];
  g.fillStyle = "#5a3a22";
  g.fillRect(42, 100, 14, 110);
  g.fillRect(204, 100, 14, 110);
  g.fillStyle = "rgba(30,12,5,0.35)";
  g.beginPath();
  g.roundRect(14, 16, 238, 112, 10);
  g.fill();
  const woods = ["#c48a4e", "#b77d44", "#c0844a", "#b07640"];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = woods[i];
    g.beginPath();
    g.roundRect(8, 8 + i * 28, 244, 27, 4);
    g.fill();
  }
  g.strokeStyle = "#6a3e1e";
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(8, 8, 244, 112, 8);
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "800 40px Fredoka, sans-serif";
  g.fillStyle = "rgba(255,225,170,0.4)";
  g.fillText("TAUKBASHQE", 131, 52, 222);
  g.fillStyle = "#3a1a08";
  g.fillText("TAUKBASHQE", 130, 50, 222);
  g.font = "400 19px Pacifico, cursive";
  g.fillStyle = "#8a1e3a";
  g.fillText(sub, 130, 90, 220);
  g.strokeStyle = "#2a2230";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(130, 120);
  g.lineTo(130, 132);
  g.stroke();
  g.fillStyle = "#2a2230";
  g.beginPath();
  g.roundRect(122, 132, 16, 18, 3);
  g.fill();
  g.fillStyle = "#ffd76a";
  g.fillRect(125, 135, 10, 12);
}

// ---------------------------------------------------------------- pickups
export function paintHeart(g: CanvasRenderingContext2D) {
  const grad = g.createLinearGradient(0, 6, 0, 56);
  grad.addColorStop(0, "#ff7aa6");
  grad.addColorStop(1, "#e8245f");
  heartPath(g, 30, 32, 48);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.65)";
  g.beginPath();
  g.ellipse(20, 22, 6, 3.5, -0.6, 0, Math.PI * 2);
  g.fill();
}

export function paintCola(g: CanvasRenderingContext2D) {
  const cx = 30;
  const hw = 15;
  const body = g.createLinearGradient(cx - hw, 0, cx + hw, 0);
  body.addColorStop(0, "#050505");
  body.addColorStop(0.3, "#3a3a3a");
  body.addColorStop(0.45, "#111");
  body.addColorStop(1, "#000");
  g.fillStyle = body;
  g.beginPath();
  g.roundRect(cx - hw, 12, hw * 2, 56, 4);
  g.fill();
  const rim = g.createLinearGradient(cx - hw, 0, cx + hw, 0);
  rim.addColorStop(0, "#8d8d8d");
  rim.addColorStop(0.35, "#f2f2f2");
  rim.addColorStop(1, "#7a7a7a");
  g.fillStyle = rim;
  g.beginPath();
  g.ellipse(cx, 12, hw - 1, 4.2, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.roundRect(cx - hw + 1, 65, hw * 2 - 2, 6, 3);
  g.fill();
  g.strokeStyle = "#e41e2b";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - hw, 46);
  g.bezierCurveTo(cx - 5, 38, cx + 5, 54, cx + hw, 44);
  g.stroke();
  g.save();
  g.translate(cx, 30);
  g.rotate(-0.08);
  g.fillStyle = "#e41e2b";
  g.font = "400 8.5px Pacifico, cursive";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("Coca-Cola", 0, 0);
  g.restore();
  g.fillStyle = "#ffffff";
  g.font = "700 8px Fredoka, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("ZERO", cx, 56);
  g.fillStyle = "rgba(255,255,255,0.22)";
  g.fillRect(cx - hw + 4, 18, 3, 44);
}

export function paintMilka(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(30, 40);
  g.rotate(-0.12);
  const wrap = g.createLinearGradient(0, -32, 0, 32);
  wrap.addColorStop(0, "#b3a3e6");
  wrap.addColorStop(1, "#7b68b5");
  g.fillStyle = wrap;
  g.beginPath();
  g.roundRect(-20, -32, 40, 64, 5);
  g.fill();
  g.fillStyle = "#5b3a29";
  g.fillRect(-20, -32, 40, 15);
  g.fillStyle = "#c9bdf0";
  g.beginPath();
  g.moveTo(-20, -17);
  for (let i = 0; i <= 8; i++) g.lineTo(-20 + i * 5, i % 2 ? -14 : -18);
  g.lineTo(20, -12);
  g.lineTo(-20, -12);
  g.closePath();
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.beginPath();
  g.moveTo(-20, 24);
  g.lineTo(-8, 12);
  g.lineTo(0, 18);
  g.lineTo(10, 8);
  g.lineTo(20, 18);
  g.lineTo(20, 32);
  g.lineTo(-20, 32);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "400 13px Pacifico, cursive";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("Milka", 0, 0);
  g.fillStyle = "#7b68b5";
  heartPath(g, 0, 24, 8);
  g.fill();
  g.restore();
}

export function paintCoffee(g: CanvasRenderingContext2D) {
  g.save();
  g.beginPath();
  g.moveTo(12, 22);
  g.lineTo(48, 22);
  g.lineTo(43, 74);
  g.lineTo(17, 74);
  g.closePath();
  g.clip();
  g.fillStyle = "#f3e2c9";
  g.fillRect(0, 22, 60, 12);
  const cf = g.createLinearGradient(0, 30, 0, 74);
  cf.addColorStop(0, "#b47a46");
  cf.addColorStop(1, "#6b3f22");
  g.fillStyle = cf;
  g.fillRect(0, 32, 60, 44);
  g.fillStyle = "rgba(225,245,255,0.7)";
  for (const [x, y] of [
    [19, 34],
    [31, 42],
    [22, 52],
  ]) {
    g.beginPath();
    g.roundRect(x, y, 10, 10, 2.5);
    g.fill();
  }
  g.restore();
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(12, 22);
  g.lineTo(17, 74);
  g.lineTo(43, 74);
  g.lineTo(48, 22);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.beginPath();
  g.ellipse(30, 22, 21, 4.5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.beginPath();
  g.arc(30, 21, 14, Math.PI, 0);
  g.fill();
  g.strokeStyle = "#ff5c93";
  g.lineWidth = 4;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(33, 16);
  g.lineTo(40, 1);
  g.stroke();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(30, 58, 7, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ff5c93";
  heartPath(g, 30, 58.5, 9);
  g.fill();
}

export function paintPizza(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(1.4, 6);
  g.scale(1.3, 1.3);
  g.lineJoin = "round";
  g.fillStyle = "#f2c14e";
  g.beginPath();
  g.moveTo(22, 48);
  g.lineTo(4, 12);
  g.quadraticCurveTo(22, 4, 40, 12);
  g.closePath();
  g.fill();
  g.fillStyle = "#ffd94a";
  g.beginPath();
  g.moveTo(22, 45);
  g.lineTo(7, 15);
  g.quadraticCurveTo(22, 9, 37, 15);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(3, 12);
  g.quadraticCurveTo(22, 2, 41, 12);
  g.lineWidth = 5;
  g.strokeStyle = "#d8963a";
  g.stroke();
  for (const [x, y, r] of [
    [16, 18, 3.6],
    [27, 19, 3.4],
    [22, 29, 3.2],
    [21, 40, 2.4],
  ] as [number, number, number][]) {
    g.fillStyle = "#d63a2a";
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#3f9b4a";
  g.beginPath();
  g.ellipse(14, 27, 2.2, 1.2, 0.6, 0, Math.PI * 2);
  g.ellipse(28, 31, 2.2, 1.2, -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- sky
export function paintCloudWord(g: CanvasRenderingContext2D, word: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cg = c.getContext("2d")!;
  cg.font = `700 ${Math.round(h * 0.66)}px Fredoka, sans-serif`;
  cg.textAlign = "center";
  cg.textBaseline = "middle";
  cg.fillStyle = "#fff";
  const chars = word.split("");
  const widths = chars.map((ch) => cg.measureText(ch).width);
  const spacing = h * 0.09;
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  const fit = Math.min(1, (w - 30) / total);
  cg.save();
  cg.translate(w / 2, h / 2);
  cg.scale(fit, fit);
  let cx = -total / 2;
  chars.forEach((ch, i) => {
    cg.fillText(ch, cx + widths[i] / 2, 0);
    cx += widths[i] + spacing;
  });
  cg.restore();
  const data = cg.getImageData(0, 0, w, h).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) if (data[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
  const puffs = (dx: number, dy: number, r: number) => {
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const rr = r * (0.85 + ((i * 37) % 5) * 0.05);
      g.moveTo(x + dx + rr, y + dy);
      g.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
    });
  };
  g.fillStyle = "rgba(120,70,90,0.25)";
  puffs(3, 5, 5.5);
  g.fill();
  g.fillStyle = "rgba(190,140,190,0.55)";
  puffs(0, 0, 6.5);
  g.fill();
  g.fillStyle = "#ffffff";
  puffs(0, 0, 5);
  g.fill();
  g.save();
  g.beginPath();
  g.rect(0, h * 0.62, w, h);
  g.clip();
  g.fillStyle = "rgba(255,200,170,0.45)";
  puffs(0, 2, 3.8);
  g.fill();
  g.restore();
}

export function paintHeartCloud(g: CanvasRenderingContext2D) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([80 + x * 4, 72 + y * 4]);
  }
  const draw = (dx: number, dy: number, grow: number) => {
    heartPath(g, 80 + dx, 80 + dy, 118 + grow);
    pts.forEach(([x, y], i) => {
      const r = Math.max(2, 15 + ((i * 7) % 4) * 2 + grow / 3);
      g.moveTo(x + dx + r, y + dy);
      g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    });
  };
  g.fillStyle = "rgba(120,70,90,0.22)";
  draw(3, 6, 0);
  g.fill();
  g.fillStyle = "rgba(190,140,190,0.5)";
  draw(0, 0, 3);
  g.fill();
  g.fillStyle = "#ffffff";
  draw(0, 0, 0);
  g.fill();
}

export function paintGlow(g: CanvasRenderingContext2D, inner: string, mid: string) {
  const r = g.createRadialGradient(40, 40, 0, 40, 40, 40);
  r.addColorStop(0, inner);
  r.addColorStop(0.45, mid);
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 80, 80);
}

// ---------------------------------------------------------------- fantasy props
export function paintMushroom(g: CanvasRenderingContext2D) {
  const caps: [number, number, number, string, string][] = [
    [26, 44, 15, "#ff9ad2", "#ffd6ef"],
    [58, 30, 21, "#c5a6ff", "#efe3ff"],
    [76, 52, 11, "#8fe8d0", "#dcfff5"],
  ];
  for (const [x, y, r, c, light] of caps) {
    g.fillStyle = "#fbf3e8";
    g.beginPath();
    g.roundRect(x - r * 0.28, y - 2, r * 0.56, 70 - y, r * 0.2);
    g.fill();
    const cg = g.createRadialGradient(x - r * 0.3, y - r * 0.5, 1, x, y - r * 0.2, r * 1.1);
    cg.addColorStop(0, light);
    cg.addColorStop(1, c);
    g.fillStyle = cg;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.72, 0, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.9)";
    for (const [dx, dy, rr] of [
      [-0.45, -0.35, 0.14],
      [0.2, -0.5, 0.11],
      [0.5, -0.2, 0.09],
    ]) {
      g.beginPath();
      g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
      g.fill();
    }
  }
}

export function paintCrystal(g: CanvasRenderingContext2D) {
  const shard = (x: number, w: number, h: number, tilt: number, c1: string, c2: string) => {
    g.save();
    g.translate(x, 108);
    g.rotate(tilt);
    const gr = g.createLinearGradient(-w, -h, w, 0);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-w, 0);
    g.lineTo(-w * 0.9, -h * 0.7);
    g.lineTo(0, -h);
    g.lineTo(w * 0.9, -h * 0.7);
    g.lineTo(w, 0);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath();
    g.moveTo(-w * 0.9, -h * 0.7);
    g.lineTo(0, -h);
    g.lineTo(-w * 0.15, -h * 0.15);
    g.closePath();
    g.fill();
    g.restore();
  };
  shard(22, 9, 62, -0.32, "#e9dcff", "#a88cf2");
  shard(58, 9, 58, 0.3, "#d6f6ff", "#7ccce8");
  shard(40, 13, 100, 0, "#fff0fb", "#f29ad0");
  shard(30, 6, 34, -0.1, "#fff6d6", "#ffc96a");
}

// ---------------------------------------------------------------- registry
const glow = (inner: string, mid: string, R = 1) => makeSprite(80, 80, (g) => paintGlow(g, inner, mid), R);

export function buildSprite(name: string): HTMLCanvasElement {
  switch (name) {
    case "tree0":
    case "tree1":
    case "tree2":
    case "tree3":
      return makeSprite(220, 320, (g) => paintTree(g, Number(name[4])));
    case "tall0":
    case "tall1":
    case "tall2":
      return makeSprite(220, 420, (g) => paintTallTree(g, Number(name[4])));
    case "lamp":
      return makeSprite(40, 260, paintLamp);
    case "bush":
      return makeSprite(120, 70, paintBush);
    case "fence":
      return makeSprite(100, 60, paintFence, 3);
    case "bench":
      return makeSprite(100, 66, paintBench, 3);
    case "arch":
      return makeSprite(105, 175, paintArch, 3);
    case "logs":
      return makeSprite(110, 190, paintLogs, 3);
    case "cart":
      return makeSprite(100, 200, paintCart, 3);
    case "hedge":
      return makeSprite(100, 200, paintFallenTree, 3);
    case "sign":
      return makeSprite(220, 170, paintSign, 3);
    case "logtrees":
      return makeSprite(420, 330, paintLogTrees);
    case "gate":
      return makeSprite(460, 340, paintGate, 2);
    case "signpost":
      return makeSprite(90, 170, paintSignpost, 2);
    case "board":
      return makeSprite(260, 210, paintBoard, 2);
    case "mushroom":
      return makeSprite(90, 70, paintMushroom, 3);
    case "crystal":
      return makeSprite(80, 110, paintCrystal, 3);
    case "heart":
      return makeSprite(60, 60, paintHeart, 2);
    case "cola":
      return makeSprite(60, 76, paintCola, 3);
    case "milka":
      return makeSprite(60, 76, paintMilka, 3);
    case "coffee":
      return makeSprite(60, 76, paintCoffee, 3);
    case "pizza":
      return makeSprite(60, 76, paintPizza, 3);
    case "cloudHeart":
      return makeSprite(160, 150, paintHeartCloud, 2);
    case "cloudWordV":
      return makeSprite(340, 120, (g) => paintCloudWord(g, "Valton", 340, 120), 1.5);
    case "cloudWordA":
      return makeSprite(380, 120, (g) => paintCloudWord(g, "Ardiana", 380, 120), 1.5);
    case "glow":
      return glow("rgba(255,170,210,0.8)", "rgba(255,120,180,0.3)");
    case "heartGlow":
      return glow("rgba(255,170,210,0.6)", "rgba(255,110,160,0.18)", 0.5);
    case "lampGlow":
      return glow("rgba(255,240,180,0.9)", "rgba(255,210,120,0.35)");
    case "lampPool":
      return glow("rgba(255,205,110,0.6)", "rgba(255,170,70,0.25)");
    case "redGlow":
      return glow("rgba(255,80,80,0.75)", "rgba(228,30,43,0.3)");
    case "lilacGlow":
      return glow("rgba(200,185,255,0.8)", "rgba(143,124,200,0.3)");
    case "shroomGlow":
      return glow("rgba(255,170,240,0.7)", "rgba(200,150,255,0.3)");
    case "crystalGlow":
      return glow("rgba(190,240,255,0.75)", "rgba(200,160,255,0.3)");
    case "moteGold":
      return glow("rgba(255,250,200,1)", "rgba(255,210,110,0.45)", 0.5);
    case "motePeach":
      return glow("rgba(255,235,215,1)", "rgba(255,160,130,0.45)", 0.5);
    case "moteCyan":
      return glow("rgba(230,255,255,1)", "rgba(120,220,255,0.45)", 0.5);
    case "moteWhite":
      return glow("rgba(255,255,255,1)", "rgba(210,220,255,0.45)", 0.5);
    case "motePink":
      return glow("rgba(255,240,250,1)", "rgba(255,140,210,0.45)", 0.5);
    case "moteLilac":
      return glow("rgba(245,235,255,1)", "rgba(190,150,255,0.45)", 0.5);
    case "moteMint":
      return glow("rgba(235,255,245,1)", "rgba(130,240,190,0.45)", 0.5);
    case "vignette":
      // cozy, warm-dark edges that pull focus to the lit path
      return makeSprite(
        200,
        350,
        (g) => {
          const r = g.createRadialGradient(100, 215, 60, 100, 215, 250);
          r.addColorStop(0, "rgba(20,10,10,0)");
          r.addColorStop(0.6, "rgba(25,12,15,0.18)");
          r.addColorStop(1, "rgba(15,6,10,0.62)");
          g.fillStyle = r;
          g.fillRect(0, 0, 200, 350);
        },
        1,
      );
    case "warmLight":
      return makeSprite(
        80,
        80,
        (g) => {
          const r = g.createRadialGradient(40, 40, 0, 40, 40, 40);
          r.addColorStop(0, "rgba(255,236,170,0.95)");
          r.addColorStop(0.12, "rgba(255,210,120,0.75)");
          r.addColorStop(0.4, "rgba(255,170,70,0.28)");
          r.addColorStop(1, "rgba(255,140,40,0)");
          g.fillStyle = r;
          g.fillRect(0, 0, 80, 80);
        },
        1,
      );
    case "warmPool":
      return makeSprite(
        80,
        80,
        (g) => {
          const r = g.createRadialGradient(40, 40, 0, 40, 40, 40);
          r.addColorStop(0, "rgba(255,205,110,0.7)");
          r.addColorStop(0.5, "rgba(255,170,70,0.28)");
          r.addColorStop(1, "rgba(255,140,40,0)");
          g.fillStyle = r;
          g.fillRect(0, 0, 80, 80);
        },
        1,
      );
    default:
      return makeSprite(4, 4, () => {}, 1);
  }
}
