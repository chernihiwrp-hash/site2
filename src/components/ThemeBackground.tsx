import { useEffect, useState } from "react";

const FireBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    {/* Base fire glow from bottom */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
      background: "linear-gradient(to top, hsl(0 85% 35% / 0.25) 0%, hsl(15 90% 45% / 0.12) 50%, transparent 100%)",
      animation: "fire-flicker 3s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", bottom: 0, left: "10%", right: "10%", height: "35%",
      background: "linear-gradient(to top, hsl(20 100% 50% / 0.2) 0%, transparent 100%)",
      animation: "fire-flicker 2.3s ease-in-out infinite 0.5s",
    }} />
    {/* Floating embers */}
    {[...Array(12)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        bottom: `${10 + (i % 4) * 8}%`,
        left: `${5 + (i * 8) % 90}%`,
        width: i % 3 === 0 ? 4 : 2,
        height: i % 3 === 0 ? 4 : 2,
        borderRadius: "50%",
        background: i % 2 === 0 ? "hsl(30 100% 65%)" : "hsl(0 90% 60%)",
        boxShadow: "0 0 6px hsl(30 100% 65%)",
        animation: `ember-float ${2 + (i * 0.4) % 3}s ease-in infinite ${(i * 0.3) % 2}s`,
        "--dx": `${(i % 2 === 0 ? 1 : -1) * (15 + (i * 7) % 40)}px`,
      } as React.CSSProperties} />
    ))}
    {/* Side fire columns */}
    {[-1, 1].map(side => (
      <div key={side} style={{
        position: "absolute", bottom: 0,
        [side === -1 ? "left" : "right"]: 0,
        width: "20%", height: "60%",
        background: `linear-gradient(to top, hsl(0 80% 40% / 0.15), transparent)`,
        animation: `fire-flicker ${2.5 + side * 0.3}s ease-in-out infinite ${side === -1 ? 0 : 1}s`,
      }} />
    ))}
  </div>
);

const JungleBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    {/* Jungle mist */}
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 120% 60% at 50% 100%, hsl(120 60% 20% / 0.2) 0%, transparent 65%)",
      animation: "jungle-pulse 4s ease-in-out infinite",
    }} />
    {/* SVG vines */}
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35 }} viewBox="0 0 400 800" preserveAspectRatio="none">
      <path d="M20,800 Q40,600 10,400 Q-10,200 30,0" stroke="hsl(120,60%,35%)" strokeWidth="3" fill="none"
        strokeDasharray="1000" style={{ animation: "vine-grow 4s ease-in-out infinite" }} />
      <path d="M380,800 Q360,550 390,350 Q410,150 370,0" stroke="hsl(140,55%,30%)" strokeWidth="2.5" fill="none"
        strokeDasharray="1000" style={{ animation: "vine-grow 4.5s ease-in-out infinite 0.5s" }} />
      <path d="M200,800 Q180,600 220,400 Q200,200 190,0" stroke="hsl(130,50%,32%)" strokeWidth="2" fill="none"
        strokeDasharray="1000" style={{ animation: "vine-grow 5s ease-in-out infinite 1s" }} />
      {/* Leaves */}
      {[
        {x:25,y:550,r:-20},{x:15,y:350,r:15},{x:375,y:450,r:25},{x:385,y:250,r:-15},{x:195,y:500,r:10},{x:205,y:300,r:-25}
      ].map((l,i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="20" ry="10"
          fill={`hsl(${120+i*5},${55+i*3}%,${28+i*2}%)`} opacity="0.5"
          transform={`rotate(${l.r},${l.x},${l.y})`}
          style={{ animation: `leaf-sway ${2.5+i*0.4}s ease-in-out infinite ${i*0.3}s` }} />
      ))}
    </svg>
    {/* Fireflies */}
    {[...Array(8)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        top: `${20 + (i * 11) % 60}%`,
        left: `${10 + (i * 13) % 80}%`,
        width: 4, height: 4, borderRadius: "50%",
        background: "hsl(80 100% 70%)",
        boxShadow: "0 0 8px hsl(80 100% 70%), 0 0 16px hsl(80 100% 70% / 0.5)",
        animation: `star-twinkle ${1.5+i*0.5}s ease-in-out infinite ${i*0.4}s`,
      }} />
    ))}
  </div>
);

const MatrixBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    {[...Array(16)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        top: "-10%",
        left: `${(i * 6.5) % 100}%`,
        width: 1.5,
        height: `${30 + (i * 7) % 40}%`,
        background: `linear-gradient(to bottom, transparent, hsl(120 100% 40% / ${0.4 + (i%3)*0.2}), transparent)`,
        animation: `matrix-fall ${2 + (i * 0.3) % 3}s linear infinite ${(i * 0.4) % 3}s`,
        fontFamily: "monospace",
        fontSize: 12,
      }} />
    ))}
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 80% 50% at 50% 100%, hsl(120 100% 20% / 0.15) 0%, transparent 60%)",
    }} />
  </div>
);

const GoldBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 100% 50% at 50% 100%, hsl(45 100% 45% / 0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 30% at 20% 50%, hsl(45 100% 55% / 0.06) 0%, transparent 50%)",
    }} />
    {/* Gold particles */}
    {[...Array(20)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        bottom: `${5 + (i * 5) % 30}%`,
        left: `${(i * 5.2) % 95}%`,
        width: i % 4 === 0 ? 3 : 2,
        height: i % 4 === 0 ? 3 : 2,
        borderRadius: "50%",
        background: "hsl(45 100% 65%)",
        boxShadow: "0 0 6px hsl(45 100% 65%)",
        animation: `gold-particle ${2 + (i * 0.25) % 3}s ease-out infinite ${(i * 0.2) % 2.5}s`,
      }} />
    ))}
    {/* Shimmer line */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
      background: "linear-gradient(90deg, transparent, hsl(45 100% 60% / 0.6), hsl(38 90% 50% / 0.4), transparent)",
      backgroundSize: "200% 100%",
      animation: "gold-shimmer 3s linear infinite",
    }} />
  </div>
);

const PurpleBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 100% 60% at 40% 100%, hsl(275 80% 40% / 0.2) 0%, transparent 65%), radial-gradient(ellipse 70% 40% at 70% 80%, hsl(290 70% 35% / 0.12) 0%, transparent 50%)",
    }} />
    {/* Stars */}
    {[...Array(25)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        top: `${(i * 4) % 80}%`,
        left: `${(i * 4.1) % 95}%`,
        width: i % 5 === 0 ? 3 : 1.5,
        height: i % 5 === 0 ? 3 : 1.5,
        borderRadius: "50%",
        background: "hsl(275 80% 80%)",
        boxShadow: "0 0 4px hsl(275 80% 80%)",
        animation: `star-twinkle ${1 + (i * 0.3) % 3}s ease-in-out infinite ${(i * 0.25) % 3}s`,
      }} />
    ))}
  </div>
);

const ArcticBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 100% 50% at 50% 0%, hsl(195 80% 70% / 0.1) 0%, transparent 60%)",
    }} />
    {[...Array(18)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        top: "-5%",
        left: `${(i * 5.8) % 95}%`,
        width: i % 3 === 0 ? 5 : 3,
        height: i % 3 === 0 ? 5 : 3,
        borderRadius: "50%",
        background: "hsl(195 80% 90%)",
        boxShadow: "0 0 6px hsl(195 80% 90% / 0.8)",
        opacity: 0.7,
        animation: `snow-fall ${3 + (i * 0.4) % 5}s linear infinite ${(i * 0.35) % 4}s`,
      }} />
    ))}
  </div>
);

const SunsetBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(to top, hsl(15 100% 40% / 0.2) 0%, hsl(350 90% 50% / 0.1) 40%, transparent 70%)",
      animation: "fire-flicker 4s ease-in-out infinite",
    }} />
    {[...Array(15)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        bottom: `${5 + (i * 6) % 25}%`,
        left: `${(i * 6.8) % 90}%`,
        width: 3, height: 3, borderRadius: "50%",
        background: i % 2 ? "hsl(25 100% 65%)" : "hsl(350 90% 60%)",
        boxShadow: `0 0 8px ${i % 2 ? "hsl(25 100% 65%)" : "hsl(350 90% 60%)"}`,
        animation: `ember-float ${2.5 + (i * 0.4) % 3}s ease-in infinite ${(i * 0.3) % 2.5}s`,
        "--dx": `${(i % 2 === 0 ? 1 : -1) * (10 + (i * 6) % 35)}px`,
      } as React.CSSProperties} />
    ))}
  </div>
);

const BlueBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 120% 60% at 50% 110%, hsl(210 100% 55% / 0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 30% at 80% 20%, hsl(200 90% 45% / 0.08) 0%, transparent 50%)",
      animation: "jungle-pulse 5s ease-in-out infinite",
    }} />
    {/* Electric sparks */}
    {[...Array(10)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        top: `${(i * 9) % 80}%`,
        left: `${(i * 10) % 90}%`,
        width: 2, height: 2, borderRadius: "50%",
        background: "hsl(210 100% 80%)",
        boxShadow: "0 0 8px hsl(210 100% 80%), 0 0 16px hsl(210 100% 55% / 0.5)",
        animation: `star-twinkle ${0.8 + (i * 0.3) % 2}s ease-in-out infinite ${(i * 0.2) % 1.5}s`,
      }} />
    ))}
  </div>
);

const THEME_BG: Record<string, () => JSX.Element> = {
  lime:         JungleBackground,
  neon_blue:    BlueBackground,
  cyber_red:    FireBackground,
  gold_vip:     GoldBackground,
  purple_haze:  PurpleBackground,
  arctic:       ArcticBackground,
  matrix:       MatrixBackground,
  sunset:       SunsetBackground,
};

const ThemeBackground = () => {
  const [themeId, setThemeId] = useState(() => localStorage.getItem("crp_theme") || "lime");

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const id = document.documentElement.getAttribute("data-theme-id");
      if (id) setThemeId(id);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-id"] });
    return () => observer.disconnect();
  }, []);

  const BgComponent = THEME_BG[themeId] || JungleBackground;
  return <BgComponent />;
};

export default ThemeBackground;
