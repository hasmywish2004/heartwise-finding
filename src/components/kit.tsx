import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode, type SVGProps } from "react";
import { LABEL_NAMES, type Check, type LabelKey } from "@/lib/genome";
import { supabase } from "@/lib/supabase";

/* ---------------- Icons (inline stroke SVG) ---------------- */
type IP = SVGProps<SVGSVGElement> & { size?: number };
function Svg({ size = 20, children, ...p }: IP & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  );
}
export const Icon = {
  Helix: (p: IP) => <Svg {...p}><path d="M7 3c0 6 10 6 10 12s-10 3-10 6" /><path d="M17 3c0 6-10 6-10 12s10 3 10 6" /><path d="M8.5 6.5h7M8.5 17.5h7M10 12h4" /></Svg>,
  Tick: (p: IP) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>,
  Cross: (p: IP) => <Svg {...p}><path d="M7 7l10 10M17 7L7 17" /></Svg>,
  Chevrons: (p: IP) => <Svg {...p}><path d="M8 7l-5 5 5 5" /><path d="M16 7l5 5-5 5" /></Svg>,
  Minus: (p: IP) => <Svg {...p}><path d="M6 12h12" /></Svg>,
  Slash: (p: IP) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 18.4L18.4 5.6" /></Svg>,
  FileUp: (p: IP) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 17v-6M9.5 13.5L12 11l2.5 2.5" /></Svg>,
  Checklist: (p: IP) => <Svg {...p}><path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" /><path d="M11 6h9M11 12h9M11 18h9" /></Svg>,
  Sliders: (p: IP) => <Svg {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Svg>,
  Arrow: (p: IP) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  Back: (p: IP) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>,
  Down: (p: IP) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>,
  External: (p: IP) => <Svg {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></Svg>,
  User: (p: IP) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Svg>,
  Info: (p: IP) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h0" /></Svg>,
  Alert: (p: IP) => <Svg {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h0" /></Svg>,
  Lock: (p: IP) => <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>,
  Link: (p: IP) => <Svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>,
};

export const LABEL_ICON: Record<LabelKey, (p: IP) => ReactNode> = {
  strong: Icon.Tick,
  contested: Icon.Chevrons,
  weak: Icon.Minus,
  refused: Icon.Slash,
};

export function LabelChip({ label }: { label: LabelKey }) {
  const I = LABEL_ICON[label] ?? Icon.Slash;
  return (
    <span className={`chip chip-${label}`}>
      <I size={16} strokeWidth={2.4} />
      {LABEL_NAMES[label] ?? "Can't say"}
    </span>
  );
}

const TILE: Record<LabelKey, string> = {
  strong: "bg-strong-tile",
  contested: "bg-amber-tile",
  weak: "bg-weak-tile",
  refused: "bg-cantsay",
};
export function LabelTile({ label }: { label: LabelKey }) {
  const I = LABEL_ICON[label];
  return (
    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-lift)] ${TILE[label]}`}>
      <I size={22} strokeWidth={2.4} />
    </span>
  );
}

/* ---------------- Logo ---------------- */
export function Logo({ to = "/" }: { to?: "/" | "/reports" }) {
  return (
    <Link to={to} className="flex items-center gap-3" aria-label="Genome Intelligence home">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Icon.Helix size={22} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[17px] font-extrabold text-ink">Genome Intelligence</span>
        <span className="block t-small text-muted-foreground">for heart health</span>
      </span>
    </Link>
  );
}

/* ---------------- App shell (signed in) ---------------- */
export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between">
          <Logo to="/reports" />
          <nav className="flex items-center gap-1">
            <Link to="/reports" className="btn btn-ghost hidden px-3 sm:inline-flex" activeProps={{ className: "text-primary" }}>Reports</Link>
            <Link to="/upload" className="btn btn-ghost hidden px-3 sm:inline-flex">Upload</Link>
            <Link to="/account" className="btn btn-ghost px-3" aria-label="Account">
              <Icon.User size={22} />
            </Link>
          </nav>
        </div>
      </header>
      <main className={`container-app pt-6 md:pt-10 ${wide ? "" : "max-w-[760px]"}`}>{children}</main>
    </div>
  );
}

export function FadeUp({ i = 0, children, className = "" }: { i?: number; children: ReactNode; className?: string }) {
  return <div className={`fade-up ${className}`} style={{ animationDelay: `${i * 0.1}s` }}>{children}</div>;
}

export function Spinner() {
  return <div className="py-16 text-center t-small text-muted-foreground">Loading…</div>;
}

export function useUser() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);
  return user;
}

export function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
}

/* ---------------- Count up ---------------- */
export function CountUp({ to, className = "" }: { to: number; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1800);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className={`num ${className}`}>{v}</span>;
}

/* ---------------- DNA letter strip ---------------- */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
export function DnaStrip({ rows = 5, fade = false }: { rows?: number; fade?: boolean }) {
  const lines = useMemo(() => {
    const r = seeded(42);
    return Array.from({ length: rows }, () => Array.from({ length: 60 }, () => "ACGT"[Math.floor(r() * 4)]).join(""));
  }, [rows]);
  const mid = Math.floor(rows / 2);
  return (
    <div className={`dna-strip ${fade ? "fade" : ""}`} aria-hidden="true">
      {lines.map((l, i) =>
        i === mid ? (
          <div key={i} className="dna-row text-center" style={{ opacity: 1, animation: "none" }}>
            <span className="text-[#9aa6ba]">{l.slice(0, 6)}</span>
            <span className="dna-hl">G</span>
            <span className="text-[#9aa6ba]">{l.slice(6, 10)}</span>
            <span className="dna-hl">A</span>
            <span className="text-[#9aa6ba]">{l.slice(10, 15)}</span>
            <span className="dna-hl">T</span>
            <span className="text-[#9aa6ba]">{l.slice(15, 20)}</span>
          </div>
        ) : (
          <div key={i} className={`dna-row ${i % 2 ? "rev" : "fwd"}`} style={{ ["--dur" as string]: `${30 + ((i * 7) % 23)}s` }}>
            <span className="track">{l + l}</span>
          </div>
        ),
      )}
      <div className="dna-sweep" />
    </div>
  );
}

/* ---------------- The wave (exact SVG) ---------------- */
export function Wave({ white = false }: { white?: boolean }) {
  if (white) {
    return (
      <svg className="wave white" width="2880" height="240" viewBox="0 0 2880 240" aria-hidden="true">
        <g fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0 9">
          <path d="M-692 115 Q-512 45 -332 115 T28 115 T388 115 T748 115 T1108 115 T1468 115 T1828 115 T2188 115 T2548 115 T2908 115 T3268 115" strokeOpacity="0.18" />
          <path d="M-664 120 Q-484 40 -304 120 T56 120 T416 120 T776 120 T1136 120 T1496 120 T1856 120 T2216 120 T2576 120 T2936 120 T3296 120" strokeOpacity="0.28" />
          <path d="M-636 125 Q-456 35 -276 125 T84 125 T444 125 T804 125 T1164 125 T1524 125 T1884 125 T2244 125 T2604 125 T2964 125 T3324 125" strokeOpacity="0.36" />
          <path d="M-608 130 Q-428 30 -248 130 T112 130 T472 130 T832 130 T1192 130 T1552 130 T1912 130 T2272 130 T2632 130 T2992 130 T3352 130" strokeOpacity="0.28" />
          <path d="M-580 135 Q-400 25 -220 135 T140 135 T500 135 T860 135 T1220 135 T1580 135 T1940 135 T2300 135 T2660 135 T3020 135 T3380 135" strokeOpacity="0.18" />
        </g>
      </svg>
    );
  }
  return (
    <svg className="wave" width="2880" height="240" viewBox="0 0 2880 240" aria-hidden="true">
      <g fill="none" stroke="#1E4FBF" strokeLinecap="round">
        <path d="M-636 125 Q-456 35 -276 125 T84 125 T444 125 T804 125 T1164 125 T1524 125 T1884 125 T2244 125 T2604 125 T2964 125 T3324 125" strokeOpacity="0.05" strokeWidth="18" />
      </g>
      <g fill="none" stroke="#1E4FBF" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0 9">
        <path d="M-720 110 Q-540 50 -360 110 T0 110 T360 110 T720 110 T1080 110 T1440 110 T1800 110 T2160 110 T2520 110 T2880 110 T3240 110" strokeOpacity="0.14" />
        <path d="M-692 115 Q-512 45 -332 115 T28 115 T388 115 T748 115 T1108 115 T1468 115 T1828 115 T2188 115 T2548 115 T2908 115 T3268 115" strokeOpacity="0.22" />
        <path d="M-664 120 Q-484 40 -304 120 T56 120 T416 120 T776 120 T1136 120 T1496 120 T1856 120 T2216 120 T2576 120 T2936 120 T3296 120" strokeOpacity="0.32" />
        <path d="M-636 125 Q-456 35 -276 125 T84 125 T444 125 T804 125 T1164 125 T1524 125 T1884 125 T2244 125 T2604 125 T2964 125 T3324 125" strokeOpacity="0.4" />
        <path d="M-608 130 Q-428 30 -248 130 T112 130 T472 130 T832 130 T1192 130 T1552 130 T1912 130 T2272 130 T2632 130 T2992 130 T3352 130" strokeOpacity="0.32" />
        <path d="M-580 135 Q-400 25 -220 135 T140 135 T500 135 T860 135 T1220 135 T1580 135 T1940 135 T2300 135 T2660 135 T3020 135 T3380 135" strokeOpacity="0.22" />
        <path d="M-552 140 Q-372 20 -192 140 T168 140 T528 140 T888 140 T1248 140 T1608 140 T1968 140 T2328 140 T2688 140 T3048 140 T3408 140" strokeOpacity="0.14" />
      </g>
    </svg>
  );
}

/* ---------------- 100-dot picture ---------------- */
export function DotGrid({ filled }: { filled: number }) {
  return (
    <div className="grid grid-cols-20 gap-[5px]" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }} role="img" aria-label={`${filled} of 100 dots filled`}>
      {Array.from({ length: 100 }, (_, i) => (
        <span key={i} className={`dot ${i < filled ? "on" : ""}`} style={i < filled ? { animationDelay: `${i * 0.06}s` } : undefined} />
      ))}
    </div>
  );
}

/* ---------------- Evidence checks ---------------- */
export function CheckBars({ checks }: { checks: Check[] }) {
  const n = checks.filter((c) => c.pass).length;
  return (
    <div>
      <div className="flex gap-1.5" aria-hidden="true">
        {checks.map((c, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${c.pass ? "bg-strong-tile" : "bg-dot-empty"}`} />
        ))}
      </div>
      <p className="mt-2 t-small text-muted-foreground"><span className="num">{n}</span> of 4 evidence checks pass</p>
    </div>
  );
}

export function CheckList({ checks }: { checks: Check[] }) {
  const n = checks.filter((c) => c.pass).length;
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map((c, i) => (
          <li key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 t-small ${c.pass ? "bg-strong-bg text-strong" : "bg-amber-bg text-amber"}`}>
            {c.pass ? <Icon.Tick size={18} strokeWidth={2.6} /> : <Icon.Cross size={18} strokeWidth={2.6} />}
            <span>{c.name}</span>
            <span className="sr-only">{c.pass ? "passes" : "does not pass"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 t-small text-muted-foreground"><span className="num">{n}</span> of 4 evidence checks pass</p>
    </div>
  );
}

export function Collapse({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[52px] w-full items-center justify-between px-5 text-left font-semibold text-ink">
        {title}
        <Icon.Down size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
