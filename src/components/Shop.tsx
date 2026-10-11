import { useEffect, useRef, useState } from "react";
import { Game } from "../game/runner";
import { COSMETICS, PERKS, levelFromXp, lookFrom, type CosmeticItem, type PerkDef, type Slot } from "../game/shop";
import type { Progress } from "../game/storage";

type Tab = "outfit" | "wear" | "trail" | "perks";

const TABS: { id: Tab; label: string }[] = [
  { id: "outfit", label: "👗 Outfits" },
  { id: "wear", label: "👑 Wearables" },
  { id: "trail", label: "✨ Trails" },
  { id: "perks", label: "⚡ Perks" },
];

interface Props {
  progress: Progress;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
  onBuyPerk: (perk: PerkDef) => void;
  onClose: () => void;
}

export function Coin({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-grid h-[1.1em] w-[1.1em] place-items-center rounded-full bg-gradient-to-b from-amber-200 to-amber-400 align-[-0.15em] text-[0.7em] font-black text-amber-800 ring-1 ring-amber-600/40 ${className}`}
    >
      ♥
    </span>
  );
}

function CouplePreview({ look }: { look: ReturnType<typeof lookFrom> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const g = new Game(canvasRef.current!, { onState: () => {}, onGameOver: () => {} }, true);
    g.setMuted(true);
    g.look = look;
    gameRef.current = g;
    const box = boxRef.current!;
    const ro = new ResizeObserver(() => {
      const r = box.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) g.resize(r.width, r.height);
    });
    ro.observe(box);
    return () => {
      ro.disconnect();
      g.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    if (g.look.trail !== look.trail) g.parts.length = 0;
    g.look = look;
    g.p.squash = 0.45;
  }, [look]);

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden rounded-2xl ring-2 ring-white/40">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
}

export default function Shop({ progress, onBuy, onEquip, onBuyPerk, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("outfit");
  const { level } = levelFromXp(progress.xp);
  const [sel, setSel] = useState<Record<Slot, string>>({ ...progress.equipped });
  const activeSlot: Slot | null = tab === "perks" ? null : tab;
  const previewEq = { ...progress.equipped, ...sel };
  const lookKey = `${previewEq.outfit}|${previewEq.wear}|${previewEq.trail}`;
  const [look, setLook] = useState(() => lookFrom(previewEq));
  useEffect(() => {
    setLook(lookFrom(previewEq));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey]);

  const selected = activeSlot ? COSMETICS.find((c) => c.id === sel[activeSlot]) : null;
  const close = () => {
    setSel({ ...progress.equipped });
    onClose();
  };

  const action = (() => {
    if (!selected) return null;
    const owned = progress.owned.includes(selected.id);
    if (progress.equipped[selected.slot] === selected.id) return { kind: "done" as const, label: "✓ Wearing" };
    if (owned) return { kind: "wear" as const, label: "Wear this 💞" };
    if (level < selected.level) return { kind: "locked" as const, label: `🔒 Unlocks at Level ${selected.level}` };
    if (progress.coins < selected.price) return { kind: "poor" as const, label: `Need ${selected.price - progress.coins} more` };
    return { kind: "buy" as const, label: "Buy" };
  })();

  const renderItem = (it: CosmeticItem) => {
    const owned = progress.owned.includes(it.id);
    const equipped = progress.equipped[it.slot] === it.id;
    const locked = level < it.level;
    const isSel = sel[it.slot] === it.id;
    return (
      <button
        key={it.id}
        onClick={() => setSel((s) => ({ ...s, [it.slot]: it.id }))}
        className={`relative flex min-h-[104px] flex-col items-center justify-between rounded-2xl p-2 text-center transition active:scale-95 ${
          isSel ? "scale-[1.03] ring-4 ring-amber-300" : ""
        } ${owned ? "bg-white/90 text-rose-800" : locked ? "bg-black/25 text-white/60" : "bg-white/15 text-white ring-1 ring-white/25"}`}
      >
        {equipped && (
          <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-300 text-xs font-black text-amber-900 ring-2 ring-white">
            ✓
          </span>
        )}
        <div className={`text-3xl ${locked ? "opacity-40 grayscale" : ""}`}>{it.icon}</div>
        {it.colors && (
          <div className="flex gap-1">
            {it.colors.map((c) => (
              <span key={c} className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15" style={{ background: c }} />
            ))}
          </div>
        )}
        <div className="line-clamp-2 text-[12px] font-bold leading-tight">{it.name}</div>
        <div className="text-[11.5px] font-bold">
          {owned ? (
            <span className="text-rose-500">{equipped ? "Wearing" : "Owned"}</span>
          ) : locked ? (
            <span>🔒 Lv {it.level}</span>
          ) : (
            <span className={progress.coins >= it.price ? "text-amber-200" : "text-white/50"}>
              <Coin /> {it.price}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/35" onClick={close}>
      <div
        className="animate-pop flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-gradient-to-b from-[#5a3a86] to-[#3a2560] ring-1 ring-white/30"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-3">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/30" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">🛍️ Love Shop</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">Lv {level}</span>
              <span className="rounded-full bg-amber-300 px-3 py-1 text-base font-black text-amber-900">
                <Coin /> {progress.coins}
              </span>
              <button
                onClick={close}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-lg font-bold text-white active:scale-90"
                aria-label="Close shop"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {tab !== "perks" && (
          <div className="px-4 pt-3">
            <div className="h-[clamp(130px,24dvh,190px)]">
              <CouplePreview look={look} />
            </div>
            {selected && action && (
              <div className="mt-2 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-white">
                    {selected.icon} {selected.name}
                  </div>
                  <div className="text-[12px] text-white/70">
                    {selected.slot === "trail" ? "Couple trail" : "Matching set for Ardiana & Valton"}
                  </div>
                </div>
                <button
                  disabled={action.kind === "done" || action.kind === "locked" || action.kind === "poor"}
                  onClick={() => {
                    if (action.kind === "buy") onBuy(selected);
                    else if (action.kind === "wear") onEquip(selected);
                  }}
                  className={`min-h-[48px] shrink-0 rounded-2xl px-4 text-[15px] font-bold transition active:scale-95 ${
                    action.kind === "buy"
                      ? "bg-gradient-to-r from-amber-300 to-yellow-200 text-amber-900 shadow-[0_4px_0_#c58a12]"
                      : action.kind === "wear"
                        ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_4px_0_#9d1c52]"
                        : action.kind === "done"
                          ? "bg-white/20 text-amber-200"
                          : "bg-black/30 text-white/60"
                  }`}
                >
                  {action.kind === "buy" ? (
                    <>
                      Buy <Coin /> {selected.price}
                    </>
                  ) : (
                    action.label
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="px-4">
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-black/25 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-[42px] rounded-xl text-[12px] font-bold transition active:scale-95 ${
                  tab === t.id ? "bg-white text-rose-600 shadow" : "text-white/85"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {activeSlot ? (
            <>
              <p className="mb-2 text-[12.5px] text-pink-100/80">Tap any item to try it on 👆</p>
              <div className="grid grid-cols-3 gap-2">{COSMETICS.filter((c) => c.slot === activeSlot).map(renderItem)}</div>
            </>
          ) : (
            <div className="space-y-2">
              {PERKS.map((pk) => {
                const lvl = progress.perks[pk.id] || 0;
                const maxed = lvl >= pk.max;
                const price = pk.prices[lvl];
                const req = pk.levels[lvl];
                const locked = !maxed && level < req;
                const afford = !maxed && progress.coins >= price;
                return (
                  <div key={pk.id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-2xl">{pk.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white">{pk.name}</div>
                      <div className="text-[12.5px] leading-snug text-white/75">{pk.desc(lvl)}</div>
                      <div className="mt-1 flex gap-1">
                        {Array.from({ length: pk.max }).map((_, i) => (
                          <span key={i} className={`h-1.5 w-6 rounded-full ${i < lvl ? "bg-amber-300" : "bg-white/20"}`} />
                        ))}
                      </div>
                    </div>
                    <button
                      disabled={maxed || locked || !afford}
                      onClick={() => onBuyPerk(pk)}
                      className={`min-h-[48px] min-w-[84px] rounded-xl px-2 text-[13px] font-bold transition active:scale-95 ${
                        maxed
                          ? "bg-amber-300/30 text-amber-100"
                          : locked
                            ? "bg-black/30 text-white/60"
                            : afford
                              ? "bg-amber-300 text-amber-900 shadow"
                              : "bg-white/10 text-white/50"
                      }`}
                    >
                      {maxed ? (
                        "MAX"
                      ) : locked ? (
                        `🔒 Lv ${req}`
                      ) : (
                        <>
                          <Coin /> {price}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
