import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Polyfill: CanvasRenderingContext2D.roundRect is missing on older iOS/Safari (<16) and some Android
// browsers. Without it, drawing would throw and the game screen would stay blank.
type RR = (x: number, y: number, w: number, h: number, r?: number | number[]) => void;
function addRoundRect(proto: { roundRect?: RR } & CanvasPath) {
  if (typeof proto.roundRect === "function") return;
  proto.roundRect = function (this: CanvasPath, x: number, y: number, w: number, h: number, r: number | number[] = 0) {
    let rad = Array.isArray(r) ? r[0] ?? 0 : r;
    rad = Math.max(0, Math.min(rad, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rad);
    this.lineTo(x + w, y + h - rad);
    this.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    this.lineTo(x + rad, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rad);
    this.lineTo(x, y + rad);
    this.quadraticCurveTo(x, y, x + rad, y);
    this.closePath();
  };
}
if (typeof CanvasRenderingContext2D !== "undefined") addRoundRect(CanvasRenderingContext2D.prototype as never);
if (typeof Path2D !== "undefined") addRoundRect(Path2D.prototype as never);

createRoot(document.getElementById("root")!).render(<App />);
