import { useEffect, useMemo, useRef, useState } from "react";
import "./book3d.css";

function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
}

export default function Book3D({ totalPages = 16, ext = "webp", title = "Documento" }) {
    // meglio pari per spread
    const PAGES = totalPages % 2 === 0 ? totalPages : totalPages + 1;
    const SPREADS = PAGES / 2;

    const [isMobile, setIsMobile] = useState(false);

    // mobile: pagina (0..PAGES-1) | desktop: spread (0..SPREADS-1)
    const [idx, setIdx] = useState(0);

    // flip
    const [flipping, setFlipping] = useState(false);
    const [flipDir, setFlipDir] = useState("next"); // next | prev
    const durationMs = 560;

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
        setFlipping(false);
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

    const startFlipNext = () => {
        if (!canNext || flipping) return;
        setFlipDir("next");
        setFlipping(true);
    };

    const startFlipPrev = () => {
        if (!canPrev || flipping) return;
        setFlipDir("prev");
        // per il prev: portiamo sotto lo “spread/pagina precedente” subito,
        // e facciamo ruotare il foglio “da -180 a 0”
        setIdx((v) => v - 1);
        setFlipping(true);
    };

    // keyboard
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "ArrowRight") startFlipNext();
            if (e.key === "ArrowLeft") startFlipPrev();
            if (e.key === "Home" && !flipping) setIdx(0);
            if (e.key === "End" && !flipping) setIdx(isMobile ? PAGES - 1 : SPREADS - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [flipping, isMobile, PAGES, SPREADS, canNext, canPrev]); // eslint-disable-line react-hooks/exhaustive-deps

    // swipe (solo mobile)
    const onTouchStart = (e) => {
        const t = e.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onTouchEnd = (e) => {
        const dt = Date.now() - touchRef.current.t;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchRef.current.x;
        const dy = t.clientY - touchRef.current.y;

        if (Math.abs(dx) < 40) return;
        if (Math.abs(dy) > 80) return;
        if (dt > 700) return;

        if (dx < 0) startFlipNext();
        else startFlipPrev();
    };

    // onTransitionEnd: chiude flip e aggiorna idx quando vai avanti
    const onFlipEnd = () => {
        if (!flipping) return;

        if (flipDir === "next") {
            setIdx((v) => v + 1);
        }
        // se prev, idx è già stato decrementato all’inizio

        setFlipping(false);
    };

    // cosa mostrare (UNDER e TOP)
    const desktopTop = useMemo(() => {
        const left = idx * 2 + 1;
        return { left, right: left + 1 };
    }, [idx]);

    const desktopUnder = useMemo(() => {
        const next = flipDir === "next" ? idx + 1 : idx; // prev: già abbiamo idx decrementato
        const s = clamp(next, 0, SPREADS - 1);
        const left = s * 2 + 1;
        return { left, right: left + 1 };
    }, [idx, flipDir, SPREADS]);

    const mobileTop = useMemo(() => idx + 1, [idx]);
    const mobileUnder = useMemo(() => {
        const next = flipDir === "next" ? idx + 2 : idx + 1; // next: sotto è la prossima pagina
        return clamp(next, 1, PAGES);
    }, [idx, flipDir, PAGES]);

    // rotazione del foglio
    // next: 0 -> -180
    // prev: -180 -> 0 (perché idx è già decrementato e stai “riaprendo”)
    const rotateY = useMemo(() => {
        if (!flipping) return flipDir === "prev" ? 0 : 0;
        return flipDir === "next" ? -180 : 0;
    }, [flipping, flipDir]);

    const startRotate = flipDir === "prev" ? -180 : 0;

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
                <div className="stage">
                    <div className="book3d relative rounded-[26px] border border-neutral-800 bg-neutral-900 shadow-2xl">
                        {/* viewport */}
                        <div className="relative overflow-hidden rounded-[26px]">
                            {/* spine desktop */}
                            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[2px] -translate-x-1/2 bg-neutral-800/80 md:block" />
                            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-12 -translate-x-1/2 bg-gradient-to-r from-neutral-900/0 via-neutral-950/40 to-neutral-900/0 md:block" />

                            <div
                                className="relative aspect-[3/4] w-full md:aspect-[16/10]"
                                onTouchStart={isMobile ? onTouchStart : undefined}
                                onTouchEnd={isMobile ? onTouchEnd : undefined}
                            >
                                {/* UNDER */}
                                {isMobile ? (
                                    <SinglePage page={mobileUnder} srcFor={srcFor} />
                                ) : (
                                    <Spread left={desktopUnder.left} right={desktopUnder.right} srcFor={srcFor} />
                                )}

                                {/* TOP LEAF (flippa) */}
                                <div
                                    className="leaf absolute inset-0"
                                    style={{
                                        transform: `rotateY(${flipping ? rotateY : 0}deg)`,
                                        transition: `transform ${durationMs}ms cubic-bezier(.2,.8,.2,1)`,
                                        // per il prev: parte da -180 e torna a 0
                                        ...(flipDir === "prev" && flipping ? { transform: "rotateY(0deg)" } : {}),
                                        zIndex: 10,
                                    }}
                                    onTransitionEnd={onFlipEnd}
                                >
                                    {/* set posizione iniziale per prev */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            transform: flipping && flipDir === "prev" ? `rotateY(${startRotate}deg)` : "none",
                                            opacity: 0,
                                            pointerEvents: "none",
                                        }}
                                    />

                                    {/* FRONT */}
                                    <div className="face absolute inset-0 paper">
                                        {isMobile ? (
                                            <SingleFront page={mobileTop} srcFor={srcFor} />
                                        ) : (
                                            <SpreadFront left={desktopTop.left} right={desktopTop.right} srcFor={srcFor} />
                                        )}
                                    </div>

                                    {/* BACK */}
                                    <div className="face back absolute inset-0 paper bg-neutral-900">
                                        {isMobile ? (
                                            <SingleBack page={mobileTop} srcFor={srcFor} />
                                        ) : (
                                            <SpreadBack left={desktopTop.left} right={desktopTop.right} srcFor={srcFor} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* controls */}
                        <div className="flex flex-col gap-3 border-t border-neutral-800 bg-neutral-950/30 p-4 sm:flex-row sm:items-center">
                           

                            <div className="ml-auto flex items-center gap-2">
                                <button
                                    onClick={startFlipPrev}
                                    disabled={!canPrev || flipping}
                                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ◀︎ Indietro
                                </button>
                                <button
                                    onClick={startFlipNext}
                                    disabled={!canNext || flipping}
                                    className="rounded-xl border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Avanti ▶︎
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-center text-sm text-neutral-400">
                        {isMobile ? (
                            <>Pagina {idx + 1} di {PAGES}</>
                        ) : (
                            <>Pagine {idx * 2 + 1}–{idx * 2 + 2} di {PAGES}</>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------------- UNDER components ---------------- */

function Spread({ left, right, srcFor }) {
    return (
        <div className="absolute inset-0 paper">
            <SpreadFront left={left} right={right} srcFor={srcFor} />
        </div>
    );
}

function SinglePage({ page, srcFor }) {
    return (
        <div className="absolute inset-0 paper">
            <SingleFront page={page} srcFor={srcFor} />
        </div>
    );
}

/* ---------------- DESKTOP spread faces ---------------- */

function SpreadFront({ left, right, srcFor }) {
    return (
        <div className="grid h-full grid-cols-2">
            <div className="relative flex items-center justify-center bg-neutral-950/10">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-14 gutter-right" />
                <img src={srcFor(left)} alt={`Pagina ${left}`} className="h-full w-full object-contain p-5 sm:p-8" draggable={false} />
                <div className="pointer-events-none absolute bottom-3 left-6 text-xs text-neutral-400">{left}</div>
            </div>

            <div className="relative flex items-center justify-center bg-neutral-950/10">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-14 gutter-left" />
                <img src={srcFor(right)} alt={`Pagina ${right}`} className="h-full w-full object-contain p-5 sm:p-8" draggable={false} />
                <div className="pointer-events-none absolute bottom-3 right-6 text-xs text-neutral-400">{right}</div>
            </div>
        </div>
    );
}

function SpreadBack({ left, right, srcFor }) {
    return (
        <div className="grid h-full grid-cols-2">
            <div className="relative flex items-center justify-center bg-neutral-950/18">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-14 gutter-right" />
                <img
                    src={srcFor(right)}
                    alt=""
                    className="h-full w-full object-contain p-5 sm:p-8 opacity-90"
                    style={{ transform: "scaleX(-1)" }}
                    draggable={false}
                />
            </div>

            <div className="relative flex items-center justify-center bg-neutral-950/18">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-14 gutter-left" />
                <img
                    src={srcFor(left)}
                    alt=""
                    className="h-full w-full object-contain p-5 sm:p-8 opacity-90"
                    style={{ transform: "scaleX(-1)" }}
                    draggable={false}
                />
            </div>
        </div>
    );
}

/* ---------------- MOBILE single faces ---------------- */

function SingleFront({ page, srcFor }) {
    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-950/10">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 gutter-left opacity-70" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 gutter-right opacity-70" />
            <img src={srcFor(page)} alt={`Pagina ${page}`} className="h-full w-full object-contain p-5" draggable={false} />
            <div className="pointer-events-none absolute bottom-3 right-5 text-xs text-neutral-400">{page}</div>
        </div>
    );
}

function SingleBack({ page, srcFor }) {
    return (
        <div className="relative flex h-full w-full items-center justify-center bg-neutral-950/18">
            <img
                src={srcFor(page)}
                alt=""
                className="h-full w-full object-contain p-5 opacity-90"
                style={{ transform: "scaleX(-1)" }}
                draggable={false}
            />
        </div>
    );
}