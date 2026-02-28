// BookFlat.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./bookflat.css";

function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
}

export default function BookFlat({ totalPages = 15, ext = "webp", title = "Menù Digitale" }) {
    // meglio pari per spread
    const PAGES = totalPages % 2 === 0 ? totalPages : totalPages + 1;
    const SPREADS = PAGES / 2;

    const [isMobile, setIsMobile] = useState(false);

    // mobile: pagina (0..PAGES-1) | desktop: spread (0..SPREADS-1)
    const [idx, setIdx] = useState(0);

    // piccola animazione fade (puoi metterla a false per zero animazione)
    const [useFade] = useState(true);
    const [fading, setFading] = useState(false);
    const fadeMs = 140;

    // swipe support
    const touchRef = useRef({ x: 0, y: 0, t: 0 });

    // responsive breakpoint md (768)
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const apply = () => setIsMobile(mq.matches);
        apply();
        mq.addEventListener?.("change", apply);
        return () => mq.removeEventListener?.("change", apply);
    }, []);

    // riallinea indice quando passi mobile <-> desktop
    useEffect(() => {
        setIdx((old) => {
            if (isMobile) return clamp(old * 2, 0, PAGES - 1);
            return clamp(Math.floor(old / 2), 0, SPREADS - 1);
        });
    }, [isMobile, PAGES, SPREADS]);

    const srcFor = (p1) => `/pages/p-${p1}.${ext}`;

    const canPrev = idx > 0;
    const canNext = isMobile ? idx < PAGES - 1 : idx < SPREADS - 1;

    const progress = useMemo(() => {
        return isMobile
            ? Math.round(((idx + 1) / PAGES) * 100)
            : Math.round(((idx + 1) / SPREADS) * 100);
    }, [isMobile, idx, PAGES, SPREADS]);

    // preload pagine vicine
    useEffect(() => {
        const preload = (p1) => {
            if (p1 < 1 || p1 > PAGES) return;
            const img = new Image();
            img.src = srcFor(p1);
        };

        if (isMobile) {
            const p = idx + 1;
            [p - 1, p, p + 1].forEach(preload);
        } else {
            const left = idx * 2 + 1;
            const right = left + 1;
            [left - 2, left - 1, left, right, right + 1, right + 2].forEach(preload);
        }
    }, [isMobile, idx, PAGES]); // eslint-disable-line react-hooks/exhaustive-deps

    const go = (dir) => {
        if (dir === "prev" && !canPrev) return;
        if (dir === "next" && !canNext) return;

        const nextIdx = clamp(
            dir === "next" ? idx + 1 : idx - 1,
            0,
            isMobile ? PAGES - 1 : SPREADS - 1
        );

        if (!useFade) {
            setIdx(nextIdx);
            return;
        }

        setFading(true);
        window.setTimeout(() => {
            setIdx(nextIdx);
            // un frame dopo, torna opaco
            requestAnimationFrame(() => setFading(false));
        }, fadeMs);
    };

    const goNext = () => go("next");
    const goPrev = () => go("prev");

    // keyboard
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowRight") goNext();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "Home") setIdx(0);
            if (e.key === "End") setIdx(isMobile ? PAGES - 1 : SPREADS - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isMobile, PAGES, SPREADS, idx]); // eslint-disable-line react-hooks/exhaustive-deps

    // swipe (solo mobile): non rovina lo scroll verticale
    const onTouchStart = (e) => {
        const t = e.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onTouchEnd = (e) => {
        const dt = Date.now() - touchRef.current.t;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchRef.current.x;
        const dy = t.clientY - touchRef.current.y;

        if (dt > 800) return;
        if (Math.abs(dx) < 50) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

        if (dx < 0) goNext();
        else goPrev();
    };

    // cosa mostrare
    const desktopSpread = useMemo(() => {
        const left = idx * 2 + 1;
        return { left, right: left + 1 };
    }, [idx]);

    const mobilePage = useMemo(() => idx + 1, [idx]);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100">
            {/* header */}
            <div className="mx-auto max-w-6xl px-4 pt-6">
                <div className="flex items-center gap-3">
                    <div className="text-xl font-semibold tracking-tight">{title}</div>
                    <div className="ml-auto flex items-center gap-2 text-sm text-neutral-300">
                        <span className="rounded-full bg-neutral-800 px-3 py-1">
                            {isMobile ? `Pagina ${idx + 1}/${PAGES}` : `Spread ${idx + 1}/${SPREADS}`}
                        </span>
                        <span className="rounded-full bg-neutral-800 px-3 py-1">{progress}%</span>
                    </div>
                </div>

                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div className="h-full bg-neutral-200 transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* stage */}
            <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
                <div className="frame rounded-[26px] border border-neutral-800 bg-neutral-900 shadow-2xl">
                    <div
                        className="viewer relative overflow-hidden rounded-[26px]"
                        onTouchStart={isMobile ? onTouchStart : undefined}
                        onTouchEnd={isMobile ? onTouchEnd : undefined}
                    >
                        {/* spine desktop */}
                        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[2px] -translate-x-1/2 bg-neutral-800/80 md:block" />
                        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-12 -translate-x-1/2 bg-gradient-to-r from-neutral-900/0 via-neutral-950/40 to-neutral-900/0 md:block" />

                        <div className={`content relative aspect-[3/4] w-full md:aspect-[16/10] ${fading ? "is-fading" : ""}`}>
                            {isMobile ? (
                                <Single page={mobilePage} srcFor={srcFor} />
                            ) : (
                                <Spread left={desktopSpread.left} right={desktopSpread.right} srcFor={srcFor} />
                            )}
                        </div>
                    </div>

                    {/* controls */}
                    <div className="flex flex-col gap-3 border-t border-neutral-800 bg-neutral-950/30 p-4 sm:flex-row sm:items-center">
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={goPrev}
                                disabled={!canPrev}
                                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ◀︎ Indietro
                            </button>
                            <button
                                onClick={goNext}
                                disabled={!canNext}
                                className="rounded-xl border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Avanti ▶︎
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center text-sm text-neutral-400">
                    {isMobile ? (
                        <>
                            Pagina {idx + 1} di {PAGES}
                        </>
                    ) : (
                        <>
                            Pagine {idx * 2 + 1}–{idx * 2 + 2} di {PAGES}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ---------------- view components ---------------- */

function Spread({ left, right, srcFor }) {
    return (
        <div className="grid h-full grid-cols-2">
            <PageCell side="left">
                <img src={srcFor(left)} alt={`Pagina ${left}`} className="page-img" draggable={false} />
                <div className="page-n page-n-left">{left}</div>
            </PageCell>

            <PageCell side="right">
                <img src={srcFor(right)} alt={`Pagina ${right}`} className="page-img" draggable={false} />
                <div className="page-n page-n-right">{right}</div>
            </PageCell>
        </div>
    );
}

function Single({ page, srcFor }) {
    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-950/10">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 gutter-left opacity-70" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 gutter-right opacity-70" />
            <img src={srcFor(page)} alt={`Pagina ${page}`} className="page-img-single" draggable={false} />
            <div className="page-n page-n-right">{page}</div>
        </div>
    );
}

function PageCell({ side, children }) {
    return (
        <div className={`relative flex items-center justify-center bg-neutral-950/10 ${side === "left" ? "cell-left" : "cell-right"}`}>
            <div className={`pointer-events-none absolute inset-y-0 ${side === "left" ? "right-0 gutter-right" : "left-0 gutter-left"} w-14`} />
            {children}
        </div>
    );
}