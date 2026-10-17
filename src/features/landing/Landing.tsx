"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CONNCOLOR, CONNLOGO, LOGO } from "@/data/logos";
import { ScreenPreview } from "./ScreenPreviews";
import { CapabilityViz } from "./CapabilityVisuals";
import { applyTheme, themeIsDark, toggleTheme } from "@/lib/theme";
import { rng } from "@/lib/util";
import { Icon } from "@/components/ui/Icon";
import { IconSprite } from "@/components/ui/IconSprite";
import { KpiIcon } from "@/components/ui/Kpis";
import { NAV4 } from "./nav4";

/* ------------------------------------------------------------ small pieces */
const HERO_ICONS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></svg>,
  <svg key="b" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 8v8M18 10c0 4-6 3-10 6" /></svg>,
  <svg key="c" viewBox="0 0 24 24"><path d="M3 12h4l3-7 4 14 3-7h4" /></svg>,
  <svg key="d" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>,
];

const SCR: Array<[string, string, string, string]> = [
  ["Tickets", "tickets", "Every incident that comes in, assigned to a project before TRACE investigates it.", "tickets"],
  ["Investigate", "investigate", "TRACE works through the logs and the code one visible step at a time: each query, each file it reads, and each question it needs you to answer.", "investigate"],
  ["Changes & PRs", "changes", "Fixes wait for approval under each environment's rules. After approval TRACE opens a draft PR, the only thing it ever writes.", "changes"],
  ["Observability", "observability", "After a merge, TRACE keeps reading the same logs to confirm the system recovered.", "observability"],
  ["Projects", "projects", "Pick where it runs and where the code lives, and which logs belong to the project. Read-only.", "projects"],
];
const RAIL_ICONS = ["alert", "flask", "commit", "chart", "db"];
const RAIL_TITLES = ["Tickets", "Investigate", "Changes and PRs", "Observability", "Projects"];

const Preview = ({ k }: { k: string }) => <ScreenPreview k={k} />;

const CONNECTORS = [
  { id: "github", name: "GitHub" },
  { id: "vercel", name: "Vercel" },
];
const logoPath = (id: string) => (LOGO as Record<string, string>)[(CONNLOGO as Record<string, string>)[id]];
function Chip({ c, hidden }: { c: { id: string; name: string }; hidden?: boolean }) {
  return (
    <div className="lchip" aria-hidden={hidden ? true : undefined}>
      <span className="lglogo" style={{ color: CONNCOLOR[c.id] || "var(--l-ink)" }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={logoPath(c.id)} /></svg>
      </span>
      {c.name}
    </div>
  );
}

const ROWS: Array<{ eb: string; t: string; p: string; pts: string[]; lay: string }> = [
  { eb: "Hypotheses", t: "Competing explanations, tested head to head", p: "TRACE proposes several possible causes, then looks for evidence that supports and evidence that weakens each one. You see the counts, not an invented probability.", pts: ["Evidence for, against and missing, per hypothesis", "Labels: supported, contradicted or plausible", "Every claim links back to its source"], lay: "" },
  { eb: "Timeline", t: "One clock for changes, failures and runtime", p: "See what changed, when the first failure landed and how the runtime responded, with the failure onset marked.", pts: ["Changes, failures, runtime and investigation lanes", "Spans show how long a failure lasted", "Select any event to read its source"], lay: "wide" },
  { eb: "Blast radius", t: "Know what else is exposed", p: "Direct exposure, likely propagation and observed impact are kept apart, so a guess is never mistaken for a fact.", pts: ["Direct change, potential propagation, observed impact", "Unknown exposure called out where telemetry is missing", "Business impact stated in plain words"], lay: "flip" },
  { eb: "Change impact", t: "Every change, with the code behind it", p: "Pick a change and TRACE retrieves the diff at the deployed revision, predicts the exposure and compares it with what telemetry showed.", pts: ["Code pinned to the revision that served traffic", "Prediction compared with observation", "Risk and linked incident on one card"], lay: "" },
  { eb: "Resolution", t: "Verify the fix before you trust it", p: "Recommended, attempted and verified are tracked separately. Recovery is checked against criteria you can read.", pts: ["Immediate mitigation with its prerequisites", "Permanent fix and fallback if recovery does not follow", "Failure rate plotted against the target"], lay: "flip" },
  { eb: "TRACE Bot", t: "Ask in plain words, get cited answers", p: "Question an incident the way you would ask a teammate. Answers cite the evidence they rest on and say when something is not known.", pts: ["Every answer lists its sources", "Suggested follow-up checks", "Knows what it cannot see"], lay: "" },
  { eb: "Analytics", t: "Measure how well it investigates", p: "Track diagnosis accuracy, time to a supported finding and how often TRACE correctly abstains when evidence is missing.", pts: ["Median time to diagnosis against your previous process", "Weekly outcomes: correct, partial, abstained, wrong", "Sample figures shown here; yours come from reviewed investigations"], lay: "wide" },
];

/* ------------------------------------------------------------------ page */
/** Public landing: pinned hero that opens into a product preview built from the app's own screens. */
export function Landing() {
  const [dark, setDark] = useState(false);
  const [shown, setShown] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [swap, setSwap] = useState({ i: 0, out: false, pre: false });
  const pin = useRef<HTMLDivElement>(null);
  const hx = useRef<HTMLDivElement>(null);
  const arc = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const stars = useRef<HTMLCanvasElement>(null);
  const pix = useRef<HTMLCanvasElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const shownRef = useRef(0);
  const swapT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((i: number) => {
    if (i === shownRef.current) return;
    shownRef.current = i;
    setSwapping(true);
    clearTimeout(swapT.current);
    swapT.current = setTimeout(() => {
      setShown(i);
      setSwapping(false);
    }, 280);
  }, []);

  /* theme + hero icon swap */
  useEffect(() => {
    applyTheme();
    setDark(themeIsDark());
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    let si = 0;
    const iv = setInterval(() => {
      setSwap((s) => ({ ...s, out: true }));
      setTimeout(() => {
        si = (si + 1) % HERO_ICONS.length;
        setSwap({ i: si, out: false, pre: true });
        requestAnimationFrame(() => requestAnimationFrame(() => setSwap((s) => ({ ...s, pre: false }))));
      }, 450);
    }, 2800);
    return () => clearInterval(iv);
  }, []);

  /* stars */
  useEffect(() => {
    const cv = stars.current;
    if (!cv) return;
    const fit = () => {
      const r = cv.parentElement!.getBoundingClientRect();
      cv.width = r.width;
      cv.height = r.height;
      const x = cv.getContext("2d")!;
      x.clearRect(0, 0, cv.width, cv.height);
      const r2 = rng(11);
      for (let i = 0; i < 110; i++) {
        x.fillStyle = `rgba(255,255,255,${0.1 + r2() * 0.45})`;
        x.fillRect(r2() * cv.width, r2() * cv.height * 0.7, 1.2, 1.2);
      }
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  /* pinned scroll choreography: hero -> product frame -> one screen per 70vh */
  useEffect(() => {
    const mq = matchMedia("(min-width:901px)");
    const cl = (v: number) => Math.min(1, Math.max(0, v));
    const tabs = Array.from(document.querySelectorAll<HTMLElement>(".l-tab"));
    const layout = () => {
      const v = view.current, f = fin.current;
      if (!v || !f) return;
      const fw = v.clientWidth, fh = v.clientHeight;
      if (!fw || !fh) return;
      const sc = Math.min(1, fw / (mq.matches ? 1440 : 1000));
      f.style.cssText = `width:${fw / sc}px;height:${fh / sc}px;transform:scale(${sc})`;
    };
    const apply = () => {
      const p0 = pin.current, h = hx.current, a = arc.current, s = strip.current, st = stage.current, b = box.current;
      if (!p0 || !h || !a || !s || !st || !b) return;
      if (!mq.matches) {
        [h, a, s, st, b, ...tabs].forEach((e) => e.removeAttribute("style"));
        return;
      }
      const vh = innerHeight, sc = -p0.getBoundingClientRect().top, p = cl(sc / (vh * 0.8));
      h.style.cssText = `transform:translateY(${(-p * 150).toFixed(1)}px);filter:blur(${(p * 12).toFixed(1)}px);opacity:${Math.max(0, 1 - p * 1.35).toFixed(3)};pointer-events:${p > 0.15 ? "none" : "auto"}`;
      a.style.transform = `translate(-50%,${(p * vh * 0.75).toFixed(0)}px) scale(${(1 + p * 0.3).toFixed(3)})`;
      const q = cl(p * 2.2);
      s.style.cssText = `opacity:${(1 - q).toFixed(3)};filter:blur(${(q * 6).toFixed(1)}px);transform:translateY(${(q * 16).toFixed(1)}px);pointer-events:${q > 0.5 ? "none" : "auto"}`;
      const sg = cl((p - 0.1) / 0.8);
      st.style.pointerEvents = sg > 0.5 ? "auto" : "none";
      b.style.cssText = `opacity:${sg.toFixed(3)};transform:translateY(${((1 - sg) * 60).toFixed(1)}px) scale(${(0.85 + 0.15 * sg).toFixed(3)})`;
      const k = cl((p - 0.25) / 0.6);
      tabs.forEach((t) => {
        t.style.cssText = `opacity:${k.toFixed(3)};transform:translate(${(+(t.dataset.dx || 0) * (1 - k)).toFixed(1)}px,0) scale(${(0.3 + 0.7 * k).toFixed(3)})`;
      });
      show(Math.min(SCR.length - 1, Math.floor(cl((sc - 0.8 * vh) / (0.7 * vh * SCR.length)) * SCR.length)));
    };
    const onResize = () => {
      layout();
      apply();
    };
    layout();
    apply();
    addEventListener("scroll", apply, { passive: true });
    addEventListener("resize", onResize);
    const ro = new ResizeObserver(layout);
    if (view.current) ro.observe(view.current);
    /* on phones the screens rotate by themselves unless the visitor tapped one */
    const rot = setInterval(() => {
      if (!mq.matches && Date.now() - lastTap.current > 9000) show((shownRef.current + 1) % SCR.length);
    }, 4500);
    return () => {
      removeEventListener("scroll", apply);
      removeEventListener("resize", onResize);
      ro.disconnect();
      clearInterval(rot);
    };
  }, [show]);

  /* section reveals */
  useEffect(() => {
    const rv = Array.from(document.querySelectorAll<HTMLElement>("#landing .reveal,#landing .rv"));
    rv.forEach((e) => {
      if (e.getBoundingClientRect().top > innerHeight) e.classList.add("pre");
    });
    const io = new IntersectionObserver((es) => es.forEach((x) => {
      if (x.isIntersecting) {
        x.target.classList.remove("pre");
        io.unobserve(x.target);
      }
    }), { threshold: 0.12 });
    rv.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  /* PixelBlast field in the closing panel */
  useEffect(() => {
    const pc = pix.current;
    if (!pc) return;
    const px = pc.getContext("2d")!, G = 14;
    let cells: Array<[number, number, number]> = [];
    const pfit = () => {
      pc.width = pc.parentElement!.offsetWidth;
      pc.height = pc.parentElement!.offsetHeight;
      cells = [];
      const r3 = rng(3);
      for (let y = 0; y < pc.height / G; y++)
        for (let x = 0; x < pc.width / G; x++) {
          const d = Math.abs(x / (pc.width / G) - 0.82) * 1.3 + (1 - y / (pc.height / G)) * 0.15;
          if (r3() > 0.5 + d * 0.55) cells.push([x, y, r3()]);
        }
    };
    pfit();
    const draw = () => {
      px.clearRect(0, 0, pc.width, pc.height);
      const t = Date.now() / 1400;
      cells.forEach((c) => {
        px.fillStyle = `rgba(20,184,166,${0.05 + 0.25 * Math.abs(Math.sin(t + c[2] * 9))})`;
        px.fillRect(c[0] * G, c[1] * G, G - 2, G - 2);
      });
    };
    const iv = setInterval(draw, 110);
    addEventListener("resize", pfit);
    return () => {
      clearInterval(iv);
      removeEventListener("resize", pfit);
    };
  }, []);

  const goTab = (k: number) => {
    lastTap.current = Date.now();
    if (matchMedia("(min-width:901px)").matches && pin.current) {
      const top = pin.current.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + innerHeight * (0.8 + 0.7 * k + 0.35), behavior: "smooth" });
    } else show(k);
  };

  const cur = SCR[shown];
  const half = (n: number) => Array.from({ length: n }, (_, i) => i);

  return (
    <div id="landing">
      <IconSprite />
      <div className="l-topblur" aria-hidden="true" />
      <header className="l-nav">
        <div className="l-nav-in">
          <nav className="l-links" aria-label="Primary">
            <a href="#how">About</a><a href="#features">Product</a><a href="#platform">Capabilities</a><a href="#systems">Integrations</a>
          </nav>
          <Link className="l-brand" href="/">
            <svg className="mark" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><use href="#i-mark" /></svg>TRACE
          </Link>
          <div className="l-actions">
            <button className="l-icon" id="lTheme" aria-label="Switch between light and dark mode" onClick={() => setDark(toggleTheme())}>
              <Icon n={dark ? "sun" : "moon"} />
            </button>
            <Link className="l-signin" href="/home">Open workspace</Link>
          </div>
        </div>
      </header>

      <div className="l-pin" id="lpin" ref={pin}>
        <div id="features" aria-hidden="true" style={{ position: "absolute", top: "80vh", left: 0, width: 1, height: 1 }} />
        <div className="l-scene">
          <section className="l-hero">
            <canvas className="stars" id="stars" ref={stars} />
            <div className="l-herotxt" id="herotxt" ref={hx}>
              <a className="l-pill l-fade" href="#how" style={{ position: "relative", zIndex: 3, marginBottom: 22 }}><i />Investigation engine for production incidents</a>
              <h1 className="hero-in">
                <span>From an alert</span>
                <span className={`l-swap${swap.out ? " out" : ""}${swap.pre ? " pre" : ""}`} id="lswap" aria-hidden="true">{HERO_ICONS[swap.i]}</span>
                <span className="dim">to the root cause.</span>
              </h1>
              <p className="l-sub l-fade">TRACE is the debugging assistant for production incidents. It investigates your changes, code and telemetry, tests competing explanations, and tells you what remains unknown.</p>
              <div className="l-cta l-fade d2">
                <Link className="l-btn solo" href="/home">Open workspace</Link>
                <a className="l-ghost" href="#features">See the product<Icon n="arrow" c="sm" /></a>
              </div>
            </div>
            <div className="l-arc" id="larc" ref={arc} />
          </section>

          <div className="l-strip l-cue" id="lstrip" ref={strip}>
            <p>See a real investigation, from an alert to the root cause.</p>
            <a className="l-cuebtn" href="#features">Scroll to see the product<svg className="ic sm" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6" /></svg></a>
          </div>

          <div className="l-stage" id="lstage" ref={stage}>
            <div className="l-stagebox" id="lstagebox" ref={box}>
              <div className="l-rail" id="lrail" role="tablist" aria-label="Product screens">
                {SCR.map((_, k) => (
                  <button key={k} className={`l-tab${shown === k ? " on" : ""}`} role="tab" aria-selected={shown === k} data-i={k} data-dx="60" title={RAIL_TITLES[k]} aria-label={RAIL_TITLES[k]} onClick={() => goTab(k)}>
                    <Icon n={RAIL_ICONS[k]} c="lg" />
                  </button>
                ))}
              </div>
              <div className="l-frame" id="lframe">
                <div className="l-fbar"><i /><i /><i /><span id="lurl">trace.app / {cur[3]}</span><span style={{ marginLeft: "auto", font: "500 11px var(--f-body)", opacity: 0.7 }}>Sample data</span></div>
                <div className={`l-fview${swapping ? " swap" : ""}`} id="lfview" ref={view}>
                  <div className="l-fin" id="lfin" ref={fin} inert>
                    <aside className="side">
                      <div className="brand"><span className="mk"><Icon n="mark" style={{ width: 15, height: 15 }} /></span>TRACE</div>
                      <div className="btn pri block"><Icon n="plus" />New investigation</div>
                      <nav className="nav" id="lnav">
                        <div className="nav-l">Workspace</div>
                        {NAV4.map(([id, l, i]) => (
                          <a key={id} className={id === cur[1] ? "on" : ""}><Icon n={i} />{l}</a>
                        ))}
                      </nav>
                      <div className="side-foot">
                        <div className="cov"><b>Evidence coverage</b><small>Sample · 5 of 6 sources healthy</small><div className="meter"><i style={{ width: "92%" }} /></div></div>
                        <div className="me"><span className="av">SU</span><div style={{ flex: 1, minWidth: 0 }}><div className="sm" style={{ fontWeight: 500 }}>Sample user</div><small>Sample data</small></div></div>
                      </div>
                    </aside>
                    <div className="main">
                      <header className="top">
                        <span className="btn icon ghost"><Icon n="panel" /></span>
                        <div className="search"><Icon n="search" c="sm" /><span>Search incidents, services, changes</span><kbd>Ctrl K</kbd></div>
                        <span className="sp" />
                        <span className="btn"><Icon n="spark" style={{ color: "var(--accent)" }} />TRACE Bot</span>
                      </header>
                      <div id="lview"><Preview k={cur[1]} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`l-cap${swapping ? " swap" : ""}`} id="lcap"><b id="lcapT">{cur[0]}</b><span id="lcapD">{cur[2]}</span></div>
            </div>
          </div>
        </div>
      </div>

      <section className="l-sec l-first" id="how">
        <div className="wrap">
          <div className="l-sechead rv">
            <div className="l-eyebrow rvx rvp">About TRACE</div>
            <h2 className="rvx rvh" style={{ ["--d" as string]: ".06s" }}>Built around the questions engineers ask</h2>
          </div>
          <div className="l-qa">
            <div className="l-card reveal"><div className="glow" /><p className="q">What changed?</p><p>Deployments, configuration, flags and migrations pinned to the revision that was actually serving traffic.</p><div className="a">Example: PAYMENT_TIMEOUT_MS 2000 → 800</div></div>
            <div className="l-card reveal"><div className="glow" /><p className="q">Which explanation fits?</p><p>Competing hypotheses, each with supporting and contradicting evidence you can open and inspect.</p><div className="a">Example: 4 tested · 1 supported · 2 ruled out</div></div>
            <div className="l-card reveal"><div className="glow" /><p className="q">What else is affected?</p><p>Direct exposure, likely propagation and observed impact stay separate, with unknowns called out.</p><div className="a">Example: checkout failing · renewals at risk</div></div>
          </div>
        </div>
      </section>

      <section className="l-sec" id="platform">
        <div className="wrap" id="lplat">
          <div className="l-sechead rv">
            <div className="l-eyebrow rvx rvp">Capabilities</div>
            <h2 className="rvx rvh" style={{ ["--d" as string]: ".06s" }}>Everything between the alert and the fix</h2>
          </div>
          {ROWS.map((r) => (
            <div className={`l-prow ${r.lay} rv`} key={r.eb}>
              <div className="l-ptxt">
                <div className="l-eyebrow rvx rvp">{r.eb}</div>
                <h3 className="rvx rvh" style={{ ["--d" as string]: ".06s" }}>{r.t}</h3>
                <p className="rvx rvp" style={{ ["--d" as string]: ".12s" }}>{r.p}</p>
                <ul className="l-pts rvx rvp" style={{ ["--d" as string]: ".2s" }}>{r.pts.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <CapabilityViz k={r.eb} />
            </div>
          ))}
        </div>
      </section>

      <section className="l-sec" id="systems">
        <div className="wrap l-split">
          <div className="rv">
            <div className="l-eyebrow rvx rvp">Integrations</div>
            <h2 className="rvx rvh" style={{ ["--d" as string]: ".06s" }}>Connects to the systems you already run</h2>
            <p className="l-secp rvx rvp" style={{ ["--d" as string]: ".14s" }}>Read-only connectors (GitHub and Vercel) bring your deployments, code and runtime logs into one place. If a source is missing, TRACE says so and asks for it.</p>
            <ol className="l-steps">
              <li className="rvx rvp" style={{ ["--d" as string]: ".22s" }}><b>Collect</b><span>Read-only connectors pull in what changed and what the system reported.</span></li>
              <li className="rvx rvp" style={{ ["--d" as string]: ".3s" }}><b>Form hypotheses</b><span>TRACE proposes competing explanations for the failure.</span></li>
              <li className="rvx rvp" style={{ ["--d" as string]: ".38s" }}><b>Test each one</b><span>Changes, code and telemetry are checked for evidence for and against.</span></li>
              <li className="rvx rvp" style={{ ["--d" as string]: ".46s" }}><b>Report with sources</b><span>Each finding is supported, contradicted or unknown, with the evidence attached.</span></li>
            </ol>
          </div>
          <div className="orbit rv" id="lorbit">
            <div className="ring" /><div className="ring r2" /><div className="ring r3" />
            <div className="spin">
              {[["Deployments", "commit", "50%", "0"], ["Config changes", "file", "100%", "50%"], ["Pull requests", "code", "50%", "100%"], ["Environments", "layers", "0", "50%"]].map(([t, i, l, tp]) => (
                <div className="b" title={t} style={{ left: l, top: tp }} key={t}><span><Icon n={i} c="lg" role="img" aria-label={t} /></span></div>
              ))}
            </div>
            <div className="spin rev">
              {[["Runtime logs", "search", "50%", "0"], ["Commits", "history", "93.3%", "75%"], ["Code", "gh", "6.7%", "75%"]].map(([t, i, l, tp]) => (
                <div className="b" title={t} style={{ left: l, top: tp }} key={t}><span><Icon n={i} c="lg" role="img" aria-label={t} /></span></div>
              ))}
            </div>
            <div className="core"><Icon n="mark" c="lg" /></div>
          </div>
        </div>
        <div className="l-strip-label l-syslabel">Connectors we support today</div>
        <div className="l-mq l-sys">
          <div className="l-track" id="lsys1" style={{ animationDuration: "40s" }}>
            {half(8).map((k) => <Chip key={"a" + k} c={CONNECTORS[0]} />)}
            {half(8).map((k) => <Chip key={"b" + k} c={CONNECTORS[0]} hidden />)}
          </div>
        </div>
        <div className="l-mq l-sys">
          <div className="l-track rev" id="lsys2" style={{ animationDuration: "40s" }}>
            {half(8).map((k) => <Chip key={"a" + k} c={CONNECTORS[1]} />)}
            {half(8).map((k) => <Chip key={"b" + k} c={CONNECTORS[1]} hidden />)}
          </div>
        </div>
      </section>

      <section className="l-sec">
        <div className="wrap">
          <div className="l-cta-panel rv">
            <canvas id="pix" ref={pix} aria-label="PixelBlast" />
            <h2 className="rvwipe">Ask what broke. Get evidence, not a guess.</h2>
            <p className="rvp2">Open your workspace, connect Vercel and GitHub, and start an investigation from a ticket.</p>
            <div className="l-cta rvbtn"><Link className="l-btn solo" href="/home">Open workspace</Link><a className="l-ghost" href="#how">How it works</a></div>
          </div>
          <div className="l-foot">
            <span>By Chaitanya N.</span>
            <nav><a href="#how">About</a><a href="#features">Product</a><a href="#platform">Capabilities</a><a href="#systems">Integrations</a></nav>
          </div>
        </div>
      </section>
    </div>
  );
}

