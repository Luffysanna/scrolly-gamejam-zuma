// Next, React
import { FC, useState, useEffect, useRef,useMemo} from 'react';
import pkg from '../../../package.json';

// ❌ DO NOT EDIT ANYTHING ABOVE THIS LINE

export const HomeView: FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* HEADER – fake Scrolly feed tabs */}
      <header className="flex items-center justify-center border-b border-white/10 py-3">
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-[11px]">
          <button className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
            Feed
          </button>
          <button className="rounded-full px-3 py-1 text-slate-400">
            Casino
          </button>
          <button className="rounded-full px-3 py-1 text-slate-400">
            Kids
          </button>
        </div>
      </header>

      {/* MAIN – central game area (phone frame) */}
      <main className="flex flex-1 items-center justify-center px-4 py-3">
        <div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-[0_0_40px_rgba(56,189,248,0.35)]">
          {/* Fake “feed card” top bar inside the phone */}
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-slate-400">
            <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] uppercase tracking-wide">
              Scrolly Game
            </span>
            <span className="text-[9px] opacity-70">#NoCodeJam</span>
          </div>

          {/* The game lives INSIDE this phone frame */}
          <div className="flex h-[calc(100%-26px)] flex-col items-center justify-start px-3 pb-3 pt-1">
            <GameSandbox />
          </div>
        </div>
      </main>

      {/* FOOTER – tiny version text */}
      <footer className="flex h-5 items-center justify-center border-t border-white/10 px-2 text-[9px] text-slate-500">
        <span>Scrolly · v{pkg.version}</span>
      </footer>
    </div>
  );
};

// ✅ THIS IS THE ONLY PART YOU EDIT FOR THE JAM
// Replace this entire GameSandbox component with the one AI generates.
// Keep the name `GameSandbox` and the `FC` type.


const GameSandbox: FC = () => {
  /* ---------- CONFIG ---------- */
  const ALL_COLORS = ["red", "blue", "green", "yellow", "purple", "orange"] as const;
  type Color = (typeof ALL_COLORS)[number];

  const CONTAINER_WIDTH = 320;
  const CONTAINER_HEIGHT = 568;

  const CENTER_X = CONTAINER_WIDTH / 2;
  const CENTER_Y = CONTAINER_HEIGHT / 2;

  const MARBLE_SIZE = 24;

  const BASE_SPEED = 0.005;
  const BASE_SPACING = 0.23;

  /* ---------- STATE ---------- */
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isSfxOn, setIsSfxOn] = useState(true);
  const [state, setState] = useState<"menu" | "play" | "over">("menu");

  const [marbles, setMarbles] = useState<
    { t: number; color: Color; id: number }[]
  >([]);

  const [projectile, setProjectile] = useState<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: Color;
  } | null>(null);

  const [loadedColor, setLoadedColor] = useState<Color>("red");
  const [nextColor, setNextColor] = useState<Color>("blue");
  const [angle, setAngle] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const incomingMarbles = useRef<Color[]>([]);
  const comboTimeoutRef = useRef<any>(null);
  const comboRef = useRef(0);

  // Derived speed: increases with level
  const speed = BASE_SPEED + (level - 1) * 0.001;

  /* ---------- SPIRAL CONFIG ---------- */
  const getPathParams = (lvl: number) => {
    const mode = (lvl - 1) % 5;
    const maxR = Math.min(CONTAINER_WIDTH, CONTAINER_HEIGHT) / 2 - 20;

    let a, maxT;
    switch (mode) {
      case 1: // Design 2: Tight center, more loops
        a = 15;
        maxT = 32;
        break;
      case 2: // Design 3: Wide center, fewer loops
        a = 65;
        maxT = 18;
        break;
      case 3: // Design 4: Very tight spiral
        a = 10;
        maxT = 40;
        break;
      case 4: // Design 5: Very wide spiral
        a = 80;
        maxT = 15;
        break;
      default: // Design 1: Balanced
        a = 25;
        maxT = 25;
        break;
    }
    const b = (maxR - a) / maxT;
    return { SPIRAL_A: a, SPIRAL_B: b, MAX_T: maxT };
  };

  const { SPIRAL_A, SPIRAL_B, MAX_T } = useMemo(() => getPathParams(level), [level]);

  /* ---------- HELPERS ---------- */
  const getPos = (t: number) => {
    const r = SPIRAL_A + SPIRAL_B * t;
    return {
      x: CENTER_X + Math.cos(t) * r,
      y: CENTER_Y + Math.sin(t) * r,
    };
  };

  const mouthPos = getPos(MAX_T);

  const pathData = useMemo(() => {
    let d = "";
    for (let t = 0; t <= MAX_T; t += 0.1) {
      const { x, y } = getPos(t);
      d += `${t === 0 ? "M" : "L"} ${x} ${y}`;
    }
    return d;
  }, [MAX_T, SPIRAL_A, SPIRAL_B]);

  const activeColors = ALL_COLORS.slice(
    0,
    Math.min(3 + Math.floor(level / 2), ALL_COLORS.length)
  );

  const randomColor = (): Color =>
    activeColors[Math.floor(Math.random() * activeColors.length)];

  /* ---------- INIT ---------- */
  const generateLevelQueue = (lvl: number) => {
    const levelSpeed = BASE_SPEED + (lvl - 1) * 0.001;
    const ballsPerSecond = (levelSpeed * 60) / BASE_SPACING;
    const duration = 60;
    const incomingCount = Math.ceil(duration * ballsPerSecond);
    const count = Math.min(20 + incomingCount, 300);

    // Calculate active colors for this specific level
    const levelColors = ALL_COLORS.slice(
      0,
      Math.min(3 + Math.floor(lvl / 2), ALL_COLORS.length)
    );

    return Array.from({ length: count }).map(() => 
      levelColors[Math.floor(Math.random() * levelColors.length)]
    );
  };

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem("scrolly-highscore");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Update High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("scrolly-highscore", score.toString());
    }
  }, [score, highScore]);

  // Cleanup combo timer on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, []);

  /* ---------- SFX HELPER ---------- */
  const playSfx = (type: 'shoot' | 'hit' | 'combo' | 'gameover' | 'levelup' | 'click') => {
    if (!isSfxOn || typeof window === 'undefined') return;
    const files = {
      shoot: '/shoot.mp3',
      hit: '/hit.mp3',
      combo: '/combo.mp3',
      gameover: '/gameover.mp3',
      levelup: '/levelup.mp3',
      click: '/click.mp3',
    };
    const audio = new Audio(files[type]);
    audio.volume = 1.0;

    // Zuma-like Pitch Scaling
    // Use ref to get fresh combo count even inside closures
    if (type === 'combo' || (type === 'hit' && comboRef.current > 0)) {
       // Pitch rises with combo count (cap at 2.0x speed/pitch)
       const rate = Math.min(1.0 + (comboRef.current * 0.1), 2.0);
       audio.playbackRate = rate;
       // @ts-ignore
       if (audio.preservesPitch !== undefined) audio.preservesPitch = false;
       // @ts-ignore
       if (audio.mozPreservesPitch !== undefined) audio.mozPreservesPitch = false;
    } else if (type === 'shoot') {
       // Slight organic variation
       audio.playbackRate = 0.95 + Math.random() * 0.1;
    }

    audio.play().catch((e) => console.warn("SFX failed:", e));
  };

  const startLevel = (lvl: number) => {
    setLevel(lvl);
    setScore(0);
    setCombo(0);
    comboRef.current = 0;
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    setState("play");
    setProjectile(null);
    
    const { MAX_T: initMaxT } = getPathParams(lvl);

    const queue = generateLevelQueue(lvl);
    const initialCount = 20;
    const initialMarbles = queue.slice(0, initialCount).map((color, i) => ({
      t: initMaxT - (initialCount - 1 - i) * BASE_SPACING,
      color,
      id: nextId.current++,
    }));
    setMarbles(initialMarbles);
    incomingMarbles.current = queue.slice(initialCount);
    
    // Reset colors for this level
    const levelColors = ALL_COLORS.slice(
      0,
      Math.min(3 + Math.floor(lvl / 2), ALL_COLORS.length)
    );
    setLoadedColor(levelColors[Math.floor(Math.random() * levelColors.length)]);
    setNextColor(levelColors[Math.floor(Math.random() * levelColors.length)]);
  };

  /* ---------- LEVEL UP ---------- */
  useEffect(() => {
    // If cleared all marbles and we have score (meaning we played), level up
    if (state === "play" && marbles.length === 0 && incomingMarbles.current.length === 0 && score > 0) {
      setLevel((l) => l + 1);
      playSfx('levelup');
    }
  }, [marbles, state, score]);

  useEffect(() => {
    // Spawn new wave when level increases (but not on initial reset to 1)
    if (level > 1) {
      const queue = generateLevelQueue(level);
      const initialCount = 20;
      const initialMarbles = queue.slice(0, initialCount).map((color, i) => ({
        t: MAX_T - (initialCount - 1 - i) * BASE_SPACING,
        color,
        id: nextId.current++,
      }));
      setMarbles(initialMarbles);
      incomingMarbles.current = queue.slice(initialCount);
    }
  }, [level]);

  /* ---------- GAME LOOP ---------- */
  useEffect(() => {
    if (state !== "play") return;

    const id = setInterval(() => {
      setMarbles((prev) => {
        const moved = prev.map((m) => ({ ...m, t: m.t - speed }));
        const closingSpeed = 0.04;

        // Forward pass: Resolve overlaps (Push outer marbles OUT)
        for (let i = 1; i < moved.length; i++) {
          const minT = moved[i - 1].t + BASE_SPACING;
          if (moved[i].t < minT) {
            moved[i].t = minT;
          }
        }

        // Clamp to mouth (prevent going beyond MAX_T)
        for (let i = moved.length - 1; i >= 0; i--) {
          if (moved[i].t > MAX_T) {
            moved[i].t = MAX_T;
          }
          // If we clamped this one (or it was already blocked), ensure the previous one respects spacing
          if (i > 0) {
            const maxPrevT = moved[i].t - BASE_SPACING;
            if (moved[i - 1].t > maxPrevT) {
              moved[i - 1].t = maxPrevT;
            }
          }
        }

        // Backward pass: Resolve gaps (Pull inner marbles OUT/BACKWARD)
        for (let i = moved.length - 1; i > 0; i--) {
          const maxInnerT = moved[i].t - BASE_SPACING;
          if (moved[i - 1].t < maxInnerT) {
            moved[i - 1].t = Math.min(maxInnerT, moved[i - 1].t + closingSpeed);
          }
        }

        // Check for matches formed by collisions (chain reactions)
        let i = 0;
        while (i < moved.length) {
          let j = i;
          const color = moved[i].color;

          // Find contiguous block of same color that is touching
          while (
            j + 1 < moved.length &&
            moved[j + 1].color === color &&
            moved[j + 1].t - moved[j].t <= BASE_SPACING + 0.05
          ) {
            j++;
          }

          const count = j - i + 1;
          if (count >= 3) {
            moved.splice(i, count);
            setScore((s) => s + count * 50);
            
            // Combo Logic
            const newCombo = comboRef.current + 1;
            setCombo(newCombo);
            comboRef.current = newCombo;
            
            playSfx('combo');

            if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
            comboTimeoutRef.current = setTimeout(() => {
              setCombo(0);
              comboRef.current = 0;
            }, 5000);

            break; // Handle one match per frame to allow chain reactions to animate
          }

          i = j + 1;
        }

        // Spawn new marbles from queue
        if (incomingMarbles.current.length > 0) {
          const tail = moved[moved.length - 1];
          if (!tail || tail.t <= MAX_T - BASE_SPACING) {
            const nextColor = incomingMarbles.current.shift();
            if (nextColor) {
              moved.push({
                t: MAX_T,
                color: nextColor,
                id: nextId.current++,
              });
            }
          }
        }

        return moved;
      });

      setProjectile((p) => {
        if (!p) return null;
        const x = p.x + p.vx;
        const y = p.y + p.vy;
        if (
          x < -50 ||
          x > CONTAINER_WIDTH + 50 ||
          y < -50 ||
          y > CONTAINER_HEIGHT + 50
        )
          return null;
        return { ...p, x, y };
      });
    }, 16);

    return () => clearInterval(id);
  }, [state, speed, level]);

  /* ---------- MATCH LOGIC ---------- */
  const resolveMatches = (
    chain: { t: number; color: Color; id: number }[],
    hitIndex: number
  ) => {
    let start = hitIndex;
    let end = hitIndex;
    const color = chain[hitIndex].color;

    while (chain[start - 1]?.color === color) start--;
    while (chain[end + 1]?.color === color) end++;

    const count = end - start + 1;
    if (count < 3) return { chain, removed: 0 };

    const newChain = [...chain];
    newChain.splice(start, count);

    return { chain: newChain, removed: count };
  };

  /* ---------- COLLISION ---------- */
  useEffect(() => {
    if (!projectile) return;

    for (let i = 0; i < marbles.length; i++) {
      const { x, y } = getPos(marbles[i].t);

      if (Math.hypot(x - projectile.x, y - projectile.y) < MARBLE_SIZE) {
        let chain = [...marbles];

        chain.splice(i, 0, {
          t: marbles[i].t,
          color: projectile.color,
          id: nextId.current++,
        });

        for (let j = i + 1; j < chain.length; j++) {
          chain[j].t = chain[j - 1].t + BASE_SPACING;
        }

        const result = resolveMatches(chain, i);
        if (result.removed > 0) {
          setScore((s) => s + result.removed * 100);

          // Combo Logic
          const newCombo = comboRef.current + 1;
          setCombo(newCombo);
          comboRef.current = newCombo;

          playSfx('hit');

          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = setTimeout(() => {
            setCombo(0);
            comboRef.current = 0;
          }, 5000);
        }

        setMarbles(result.chain);
        setProjectile(null);
        return;
      }
    }
  }, [projectile, marbles, level]);

  /* ---------- GAME OVER ---------- */
  useEffect(() => {
    if (state === 'play' && marbles.some((m) => m.t <= 0)) {
      setState("over");
      playSfx('gameover');
    }
  }, [marbles, state]);

  /* ---------- SHOOT ---------- */
  const shoot = (clientX: number, clientY: number) => {
    if (!containerRef.current || projectile || state !== "play") return;

    const rect = containerRef.current.getBoundingClientRect();
    const dx = clientX - rect.left - CENTER_X;
    const dy = clientY - rect.top - CENTER_Y;
    const mag = Math.hypot(dx, dy);

    playSfx('shoot');

    setProjectile({
      x: CENTER_X,
      y: CENTER_Y,
      vx: (dx / mag) * 12,
      vy: (dy / mag) * 12,
      color: loadedColor,
    });

    setLoadedColor(nextColor);
    setNextColor(randomColor());
  };

  /* ---------- RENDER ---------- */
  return (
    <div
      ref={containerRef}
      className="relative w-[320px] h-[568px] bg-[#022c22] rounded-xl overflow-hidden select-none shadow-2xl"
      onMouseMove={(e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setAngle(
          Math.atan2(
            e.clientY - rect.top - CENTER_Y,
            e.clientX - rect.left - CENTER_X
          )
        );
      }}
      onClick={(e) => shoot(e.clientX, e.clientY)}
    >
      {/* JUNGLE BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* 1. Deep Jungle Base */}
        <div className="absolute inset-0 bg-[#022c22]" />

        {/* 2. Leaf Pattern Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
            <defs>
                <pattern id="leafPattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M40,0 Q60,20 40,40 Q20,20 40,0" fill="#10b981" />
                    <path d="M0,40 Q20,60 0,80 Q-20,60 0,40" fill="#059669" />
                    <path d="M80,40 Q100,60 80,80 Q60,60 80,40" fill="#059669" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#leafPattern)" />
        </svg>

        {/* 3. Hanging Vines & Overgrowth */}
        <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
             {/* Left Vine */}
             <path d="M20,0 Q40,100 10,250 T30,500" fill="none" stroke="#064e3b" strokeWidth="4" />
             {/* Right Vine */}
             <path d="M300,0 Q260,150 310,350 T280,550" fill="none" stroke="#064e3b" strokeWidth="5" />
             {/* Top Drapes */}
             <path d="M0,0 Q160,100 320,0" fill="none" stroke="#065f46" strokeWidth="60" opacity="0.5" />
        </svg>

        {/* 4. Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,20,5,0.9)_100%)]" />
      </div>

      {/* DASHBOARD */}
      {state !== "menu" && (
      <>
        <div className="absolute top-0 left-0 w-full h-24 bg-[#805b15] border-b-4 border-[#4a3308] z-40 flex items-center justify-between px-5 shadow-2xl">
          {/* Score Group */}
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-amber-200 font-bold tracking-widest uppercase mb-0.5">Score</span>
            <span className="text-2xl font-black text-white font-mono tracking-tighter drop-shadow-md">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Level Badge */}
          <div className="flex flex-col items-center justify-center -mt-1">
             <div className="relative">
               <div className="absolute inset-0 bg-yellow-500 blur-md opacity-20 rounded-full"></div>
               <div className="relative w-12 h-12 rounded-full bg-gradient-to-b from-[#a07625] to-[#805b15] border-2 border-[#ffd700] flex items-center justify-center shadow-inner">
                 <span className="text-xl font-black text-yellow-500">{level}</span>
               </div>
               <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#6b4c11] px-1.5 py-0.5 rounded text-[8px] font-bold text-amber-200 border border-[#4a3308] uppercase tracking-wider">
                 Lvl
               </div>
             </div>
          </div>

          {/* High Score Group */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-amber-200 font-bold tracking-widest uppercase mb-0.5">Best</span>
            <span className="text-xl font-bold text-emerald-400 font-mono tracking-tighter">
              {highScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Volume Setting Under Scoreboard */}
        <div className="absolute top-24 left-0 w-full flex justify-center gap-2 z-30 pointer-events-none">
           <button 
             className="pointer-events-auto bg-[#805b15] border-x border-b border-[#4a3308] text-amber-200 hover:text-white px-4 py-1.5 rounded-b-xl text-[10px] font-bold shadow-xl flex items-center gap-2 transition-all hover:pt-2"
             onClick={() => {
               playSfx('click');
               setIsSfxOn(!isSfxOn);
             }}
           >
             <span>{isSfxOn ? 'SFX ON' : 'SFX OFF'}</span>
             <span className="text-base">{isSfxOn ? '🔊' : '🔇'}</span>
           </button>
        </div>
      </>
      )}

      {/* COMBO DISPLAY */}
      {combo > 0 && state === "play" && (
        <div className="absolute top-32 left-0 w-full flex justify-center z-50 pointer-events-none">
           <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] stroke-black tracking-tighter animate-bounce">
             COMBO x{combo}
           </div>
        </div>
      )}

      {/* Spiral Path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="rockyDisplacement">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
          </filter>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor="#291d19" />
             <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
        </defs>

        {/* Rough Outer Edge (The "Cave Floor" cut) */}
        <path 
          d={pathData} 
          stroke="#000000" 
          strokeWidth="38" 
          fill="none" 
          filter="url(#rockyDisplacement)" 
          opacity="0.8"
          strokeLinecap="round"
        />

        {/* Stone Channel */}
        <path d={pathData} stroke="url(#pathGradient)" strokeWidth="28" fill="none" strokeLinecap="round" />

        {/* Inner Shadow for Depth */}
        <path d={pathData} stroke="#000000" strokeWidth="20" fill="none" opacity="0.5" strokeLinecap="round" />
      </svg>

      {/* Mouth */}
      <div
        className="absolute w-12 h-12 bg-orange-900/50 rounded-full flex items-center justify-center border-2 border-orange-500/30 z-0"
        style={{ left: mouthPos.x - 24, top: mouthPos.y - 24 }}
      >
        <span className="text-orange-500 text-xs font-bold">🕳️</span>
      </div>

      {/* Marbles */}
      {marbles.map((m) => {
        const { x, y } = getPos(m.t);
        return (
          <div
            key={m.id}
            className="absolute rounded-full z-10"
            style={{
              width: MARBLE_SIZE,
              height: MARBLE_SIZE,
              left: x - MARBLE_SIZE / 2,
              top: y - MARBLE_SIZE / 2,
              background: `radial-gradient(circle at 30% 30%, white, ${m.color})`,
            }}
          />
        );
      })}

      {/* Projectile */}
      {projectile && (
        <div
          className="absolute rounded-full z-20"
          style={{
            width: MARBLE_SIZE,
            height: MARBLE_SIZE,
            left: projectile.x - MARBLE_SIZE / 2,
            top: projectile.y - MARBLE_SIZE / 2,
            background: `radial-gradient(circle at 30% 30%, white, ${projectile.color})`,
          }}
        />
      )}

      {/* Frog */}
      <div
        className="absolute z-30"
        style={{
          left: CENTER_X - 32,
          top: CENTER_Y - 32,
          width: 64,
          height: 64,
          transform: `rotate(${angle}rad)`,
        }}
      >
        <div className="relative w-full h-full">
          {/* Frog Body SVG */}
          <svg
            viewBox="0 0 100 100"
            className="absolute -top-[25%] -left-[25%] w-[150%] h-[150%] drop-shadow-2xl pointer-events-none"
          >
            {/* Legs */}
            <path
              d="M20,20 Q0,10 10,40"
              fill="none"
              stroke="#15803d"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M20,80 Q0,90 10,60"
              fill="none"
              stroke="#15803d"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Main Body */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="#16a34a"
              stroke="#052e16"
              strokeWidth="3"
            />

            {/* Eyes */}
            <circle cx="65" cy="25" r="10" fill="#16a34a" stroke="#052e16" strokeWidth="2" />
            <circle cx="65" cy="75" r="10" fill="#16a34a" stroke="#052e16" strokeWidth="2" />
            <circle cx="70" cy="25" r="4" fill="black" />
            <circle cx="70" cy="75" r="4" fill="black" />
          </svg>

          {/* Next Ball (Indicator on back) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-black/20 shadow-inner"
            style={{
              background: nextColor,
              marginLeft: "-12px", // Shift to back
              zIndex: 10,
            }}
          />

          {/* Loaded Ball (In Mouth) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-sm"
            style={{
              width: MARBLE_SIZE,
              height: MARBLE_SIZE,
              background: `radial-gradient(circle at 30% 30%, white, ${loadedColor})`,
              marginLeft: "20px", // Shift to front (mouth)
              zIndex: 20,
            }}
          />
        </div>
      </div>

      {/* MENU SCREEN */}
      {state === "menu" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-24 pointer-events-none bg-black/40 backdrop-blur-[2px]">
          <div className="mt-8">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-tighter">
              ZUMA
            </h1>
          </div>
          
          <div className="mb-12 pointer-events-auto">
             <button 
                className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-2xl rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] border-4 border-green-400 hover:scale-105 active:scale-95 transition-transform"
                onClick={() => {
                  playSfx('click');
                  startLevel(1);
                }}
             >
               PLAY ME
             </button>
          </div>
        </div>
      )}

      {state === "over" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-50">
          <h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2>
          <p className="mb-6">Final Score: {score}</p>
          <button
            className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-full"
            onClick={() => {
              playSfx('click');
              startLevel(level);
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default GameSandbox;
