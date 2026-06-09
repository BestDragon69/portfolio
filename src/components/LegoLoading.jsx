import { useEffect, useMemo, useRef, useState } from 'react';
// makeWeatherMsg et le fetch météo sont désormais dans App.jsx — wx arrive en prop

const STUD      = 19;
const BW        = STUD * 2;
const BH        = 20;
const SH        = 5;
const SW        = 10;
const BRICK_MS  = 6;
const DROP_MS   = 220;
const ROWS       = 24;
const TOW_STUDS  = 12;
const WALL_STUDS = 36;
const TOTAL_STUDS = TOW_STUDS * 2 + WALL_STUDS; // 60

const HILL_EXTRA    = 55;
const HILL_MAX_ROWS = 9;
const UG_ROWS       = 14;

// ── Castle window / detail positions ─────────────────────────────────────────
const CASTLE_WINDOWS = [
  { cs: 5,  row: 3,  cw: 2, rh: 3 },  // left tower  — meurtrière haute
  { cs: 5,  row: 8,  cw: 2, rh: 2 },  // left tower  — meurtrière basse
  { cs: 53, row: 3,  cw: 2, rh: 3 },  // right tower — meurtrière haute
  { cs: 53, row: 8,  cw: 2, rh: 2 },  // right tower — meurtrière basse
  { cs: 15, row: 10, cw: 2, rh: 2 },  // centre gauche — fenêtre
  { cs: 43, row: 10, cw: 2, rh: 2 },  // centre droite — fenêtre
];

function isWindowCell(cs, r) {
  return CASTLE_WINDOWS.some(w => cs >= w.cs && cs < w.cs + w.cw && r >= w.row && r < w.row + w.rh);
}

// ── Castle cell test ──────────────────────────────────────────────────────────
function isCastleCell(cs, r) {
  if (isWindowCell(cs, r)) return false;
  if (cs >= 0 && cs <= 11) {
    if (r === 0) return cs <= 3 || cs >= 8;
    return r >= 1;
  }
  if (cs >= 48 && cs <= 59) {
    const m = cs - 48;
    if (r === 0) return m <= 3 || m >= 8;
    return r >= 1;
  }
  if (cs >= 12 && cs <= 47 && r >= 8) {
    if (r === 8  && (cs - 12) % 8 >= 4) return false;
    if (r === 12 && cs >= 28 && cs <= 31) return false;
    if (r === 13 && cs >= 26 && cs <= 33) return false;
    if (r >= 14  && cs >= 24 && cs <= 35) return false;
    return true;
  }
  return false;
}

// ── Castle brick packing ──────────────────────────────────────────────────────
const BRICK_TYPES = [
  { ws: 2, h: 1 }, { ws: 2, h: 1 },
  { ws: 3, h: 1 }, { ws: 3, h: 1 },
  { ws: 4, h: 1 },
  { ws: 2, h: 2 }, { ws: 3, h: 2 }, { ws: 4, h: 2 },
];

function buildBricks() {
  const occupied = new Set();
  const key = (cs, r) => `${cs},${r}`;
  const isOpen = (cs, r) => r >= 0 && isCastleCell(cs, r) && !occupied.has(key(cs, r));
  const list = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    const rowBricks = [];
    let cs = 0;
    while (cs < TOTAL_STUDS) {
      if (!isOpen(cs, r)) { cs++; continue; }
      const types = BRICK_TYPES.slice().sort(() => Math.random() - 0.5);
      let placed = false;
      for (const t of types) {
        let fits = true;
        for (let dc = 0; dc < t.ws && fits; dc++)
          for (let dr = 0; dr < t.h && fits; dr++)
            if (!isOpen(cs + dc, r - dr)) fits = false;
        if (!fits) continue;
        for (let dc = 0; dc < t.ws; dc++)
          for (let dr = 0; dr < t.h; dr++)
            occupied.add(key(cs + dc, r - dr));
        rowBricks.push({ id: `${r}-${cs}`, cs, r, x: cs * STUD, y: (r - t.h + 1) * BH, w: t.ws * STUD, h: t.h * BH, ws: t.ws });
        cs += t.ws; placed = true; break;
      }
      if (!placed) {
        occupied.add(key(cs, r));
        rowBricks.push({ id: `${r}-${cs}`, cs, r, x: cs * STUD, y: r * BH, w: STUD, h: BH, ws: 1 });
        cs++;
      }
    }
    // Inject window bricks for this row into the same shuffle pool
    for (const w of CASTLE_WINDOWS) {
      for (let dr = 0; dr < w.rh; dr++) {
        if (w.row + dr === r) {
          rowBricks.push({
            id: `win-${w.cs}-${r}`, cs: w.cs, r,
            x: w.cs * STUD, y: r * BH,
            w: w.cw * STUD, h: BH, ws: w.cw,
            isWindow: true, dark: w.row < 8,
          });
        }
      }
    }
    rowBricks.sort(() => Math.random() - 0.5);
    list.push(...rowBricks);
  }
  return list;
}

// ── Hill profile ──────────────────────────────────────────────────────────────
function hillProfile(cs) {
  if (cs < -HILL_EXTRA || cs >= TOTAL_STUDS + HILL_EXTRA) return 0;
  let extra = 0;
  if (cs < 0) {
    const t = (cs + HILL_EXTRA) / HILL_EXTRA;
    extra = Math.round((HILL_MAX_ROWS - 1) * Math.sin(t * Math.PI));
  } else if (cs >= TOTAL_STUDS) {
    const t = (TOTAL_STUDS + HILL_EXTRA - cs) / HILL_EXTRA;
    extra = Math.round((HILL_MAX_ROWS - 1) * Math.sin(t * Math.PI));
  }
  return 1 + extra;
}

// ── Colors ────────────────────────────────────────────────────────────────────
const GREEN_SHADES = [
  [122, 52, 24], [118, 48, 28], [125, 46, 26],
  [120, 54, 22], [115, 50, 30], [122, 50, 32],
  [118, 56, 20], [120, 44, 34],
];
function hillBrickColor(cs, row) {
  const i = Math.abs((cs * 11 + row * 7 + cs * row * 3) % GREEN_SHADES.length);
  const [h, s, l] = GREEN_SHADES[i];
  return `hsl(${h},${s}%,${l}%)`;
}
function hillStudColor(cs, row) {
  const i = Math.abs((cs * 11 + row * 7 + cs * row * 3) % GREEN_SHADES.length);
  const [h, s, l] = GREEN_SHADES[i];
  return `hsl(${h},${s}%,${Math.min(52, l + 10)}%)`;
}

const STONE_SHADES = [
  [28, 12, 38], [22, 10, 42], [32, 14, 35],
  [26, 11, 44], [20, 13, 40], [30,  9, 33],
  [24, 15, 46], [28, 10, 37],
];
function pathBrickColor(cs, row) {
  const i = Math.abs((cs * 7 + row * 13 + cs * row * 5) % STONE_SHADES.length);
  const [h, s, l] = STONE_SHADES[i];
  return `hsl(${h},${s}%,${l}%)`;
}
function pathStudColor(cs, row) {
  const i = Math.abs((cs * 7 + row * 13 + cs * row * 5) % STONE_SHADES.length);
  const [h, s, l] = STONE_SHADES[i];
  return `hsl(${h},${s}%,${Math.min(60, l + 9)}%)`;
}

const TONES = [44, 49, 53, 47, 51, 45, 55, 50];
function brickColor(cs, r) {
  const i = (cs * 13 + r * 7 + cs * r * 3 + r * r * 5) % TONES.length;
  return `hsl(220, ${7 + i % 4}%, ${TONES[i]}%)`;
}
function studColor(cs, r) {
  const i = (cs * 13 + r * 7 + cs * r * 3 + r * r * 5) % TONES.length;
  return `hsl(220, ${7 + i % 4}%, ${Math.min(70, TONES[i] + 13)}%)`;
}

// ── Ground + hill brick packing ───────────────────────────────────────────────
// Path is trapezoidal: narrows toward the castle door (top), widens at the
// bottom (toward the viewer) to simulate perspective/depth.
function buildHillBricks() {
  const bricks = [];
  const WIDTHS = [2, 3, 4, 2, 3, 2];

  function packZone(cs0, cs1, y, idPfx, row, isPath) {
    let cs = cs0;
    while (cs < cs1) {
      const widths = WIDTHS.slice().sort(() => Math.random() - 0.5);
      let placed = false;
      for (const w of widths) {
        if (cs + w > cs1) continue;
        bricks.push({ id: `${idPfx}-${cs}`, cs, row, x: cs * STUD, y, w: w * STUD, ws: 0, isPath });
        cs += w; placed = true; break;
      }
      if (!placed) {
        bricks.push({ id: `${idPfx}-${cs}`, cs, row, x: cs * STUD, y, w: STUD, ws: 0, isPath: false });
        cs++;
      }
    }
  }

  // Underground rows — deepest first so shallower rows render on top.
  // Path expands with depth: halfW = 4 (top) → 8 (bottom), ±1 stud edge jitter.
  for (let k = UG_ROWS - 1; k >= 0; k--) {
    const y = k * BH;
    const t = k / Math.max(1, UG_ROWS - 1);
    const halfW  = 4 + Math.round(4 * t);
    const lNudge = Math.round((Math.random() - 0.5) * 2);
    const rNudge = Math.round((Math.random() - 0.5) * 2);
    const pStart = Math.max(0, 30 - halfW + lNudge);
    const pEnd   = Math.min(TOTAL_STUDS, 30 + halfW + rNudge);
    packZone(-HILL_EXTRA, pStart,                    y, `ugL${k}`, k, false);
    packZone(pStart,      pEnd,                      y, `ugP${k}`, k, true);
    packZone(pEnd,        TOTAL_STUDS + HILL_EXTRA,  y, `ugR${k}`, k, false);
  }

  // Above-ground hill rows — bottom first, top last (top covers lower studs).
  const occupied = new Set();
  const akey = (cs, row) => `${cs},${row}`;
  for (let row = 0; row < HILL_MAX_ROWS; row++) {
    let cs = -HILL_EXTRA;
    while (cs < TOTAL_STUDS + HILL_EXTRA) {
      if (hillProfile(cs) <= row || occupied.has(akey(cs, row))) { cs++; continue; }
      const widths = WIDTHS.slice().sort(() => Math.random() - 0.5);
      let placed = false;
      for (const w of widths) {
        let fits = true;
        for (let dc = 0; dc < w && fits; dc++)
          if (hillProfile(cs + dc) <= row || occupied.has(akey(cs + dc, row))) fits = false;
        if (!fits) continue;
        for (let dc = 0; dc < w; dc++) occupied.add(akey(cs + dc, row));
        bricks.push({ id: `h${row}-${cs}`, cs, row, x: cs * STUD, y: -(row + 1) * BH, w: w * STUD, ws: w, isPath: false });
        cs += w; placed = true; break;
      }
      if (!placed) {
        occupied.add(akey(cs, row));
        bricks.push({ id: `h${row}-${cs}`, cs, row, x: cs * STUD, y: -(row + 1) * BH, w: STUD, ws: 1, isPath: false });
        cs++;
      }
    }
  }
  return bricks;
}

// ── Sky helpers — briques aux mêmes dimensions que le château (STUD=19, BH=20) ──
function legoBrick(x, y, w, h, color, studColor, key) {
  const nStuds = Math.floor(w / STUD);
  return (
    <div key={key} style={{
      position:'absolute', left:x, top:y, width:w, height:h,
      backgroundColor:color,
      boxShadow:[
        'inset 0 0 0 1px rgba(0,0,0,0.22)',
        'inset 0 -2px 0 rgba(0,0,0,0.28)',
        'inset 0 1px 0 rgba(255,255,255,0.1)',
      ].join(', '),
    }}>
      {Array.from({length:nStuds},(_,i)=>(
        <div key={i} style={{
          position:'absolute', left:i*STUD+Math.round((STUD-SW)/2), top:-SH,
          width:SW, height:SH,
          backgroundColor:studColor, borderRadius:'2px 2px 0 0',
          boxShadow:[
            'inset 0 1px 0 rgba(255,255,255,0.4)',
            'inset 1px 0 0 rgba(255,255,255,0.2)',
            'inset -1px 0 0 rgba(0,0,0,0.25)',
          ].join(', '),
        }}/>
      ))}
    </div>
  );
}

const CLOUD_SHAPES = [
  { key:'cl1', top:'14%', del:'-12s', bricks:[[19,5,38,BH],[76,5,38,BH],[0,25,76,BH],[57,25,57,BH],[0,45,114,BH]] },
  { key:'cl2', top:'32%', del:'-22s', bricks:[[19,5,57,BH],[95,5,19,BH],[0,25,95,BH],[0,45,76,BH]] },
  { key:'cl3', top:'7%',  del:'-38s', bricks:[[19,5,38,BH],[76,5,57,BH],[152,5,38,BH],[0,25,76,BH],[57,25,95,BH],[0,45,190,BH]] },
  { key:'cl4', top:'23%', del:'-5s',  bricks:[[0,5,38,BH],[57,5,38,BH],[0,25,95,BH],[19,45,57,BH]] },
];

function skyGradient(isDay, cc) {
  if (!isDay) return cc < 50
    ? 'linear-gradient(180deg,#06091a 0%,#0b1228 40%,#111e3a 80%,#192648 100%)'
    : 'linear-gradient(180deg,#09090f 0%,#0e0e18 40%,#131520 80%,#191b28 100%)';
  if (cc < 20) return 'linear-gradient(180deg,#4A90D9 0%,#6BAED6 40%,#9ECAE1 80%,#C6DBEF 100%)';
  if (cc < 50) return 'linear-gradient(180deg,#6a8fa8 0%,#85a5bc 40%,#a8c0cf 80%,#c0d3de 100%)';
  if (cc < 75) return 'linear-gradient(180deg,#7a8f9a 0%,#95a8b3 40%,#b0c0ca 80%,#c5d0d8 100%)';
  return              'linear-gradient(180deg,#6e7a82 0%,#868e96 40%,#9da5aa 80%,#b2b9bd 100%)';
}

function cloudPalette(cc, isDay) {
  if (!isDay) return cc > 60 ? { m:'#181e2e', s:'#0f1420' } : { m:'#22293c', s:'#181e30' };
  if (cc < 30) return { m:'#eef6ff', s:'#cce0f5' };
  if (cc < 55) return { m:'#c8d8e8', s:'#a8c0d0' };
  if (cc < 75) return { m:'#a0b0bc', s:'#889aa8' };
  return             { m:'#485058', s:'#363c44' };
}


// ── Component ─────────────────────────────────────────────────────────────────
export default function LegoLoading({ wx, onComplete }) {
  const bricks     = useMemo(buildBricks, []);
  const hillBricks = useMemo(buildHillBricks, []);
  const buildDone  = bricks.length * BRICK_MS + DROP_MS;

  const [canEnter, setCanEnter] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [zooming,  setZooming]  = useState(false);
  const zoomingRef  = useRef(false);
  const castleRef   = useRef(null);
  const [zoomOrigin, setZoomOrigin] = useState('50% 60%');
  const [showWxInfo, setShowWxInfo] = useState(false);
  const precipCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = precipCanvasRef.current;
    if (!canvas) return;
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const rawPrecip = wx?.precipitation ?? 0;
    const snow = wx ? (wx.code >= 70 && wx.code <= 77) || (wx.code >= 85 && wx.code <= 86) : false;
    const rain = wx ? (wx.code >= 51 && wx.code <= 67) || (wx.code >= 80 && wx.code <= 84) : false;
    const active = rawPrecip > 0 || snow || rain;
    if (!active) { ctx.clearRect(0, 0, W, H); return; }

    const precip = Math.max(rawPrecip, 1.5);
    const wDir = wx?.windDir ?? 270;
    const wSpd = wx?.windSpeed ?? 0;
    const tiltRad = Math.atan2(-Math.sin(wDir * Math.PI / 180) * wSpd * 0.18, 1);
    const sinT = Math.sin(tiltRad), cosT = Math.cos(tiltRad);
    // dérive horizontale max sur toute la hauteur → zone de spawn élargie
    const maxDrift = Math.abs(sinT / Math.max(cosT, 0.05)) * H;
    const spawnW = W + maxDrift * 2 + 100;
    const spawnX = () => Math.random() * spawnW - maxDrift - 50;

    const particles = snow
      ? Array.from({ length: 180 }, () => ({
          x: spawnX(), y: Math.random() * H,
          r: 1.5 + Math.random() * 3,
          speed: 1 + Math.random() * 1.5,
          drift: sinT * wSpd * 0.03 + (Math.random() - 0.5) * 0.3,
          op: 0.55 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
        }))
      : Array.from({ length: 130 }, () => ({
          x: spawnX(), y: Math.random() * H,
          len: 14 + Math.random() * 18 + precip * 0.6,
          speed: 9 + Math.random() * 10 + precip * 0.5,
          op: 0.25 + Math.random() * 0.45,
        }));

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      if (snow) {
        particles.forEach(p => {
          ctx.globalAlpha = p.op;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speed;
          p.x += p.drift + Math.sin(p.phase + p.y * 0.025) * 0.6;
          if (p.y > H + p.r) { p.y = -p.r; p.x = spawnX(); }
          if (p.x < -maxDrift - p.r) p.x = W + maxDrift + p.r;
          if (p.x > W + maxDrift + p.r) p.x = -maxDrift - p.r;
        });
      } else {
        ctx.strokeStyle = 'rgba(174,214,241,0.75)';
        ctx.lineWidth = 1;
        particles.forEach(p => {
          ctx.globalAlpha = p.op;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + sinT * p.len, p.y + cosT * p.len);
          ctx.stroke();
          p.x += sinT * p.speed; p.y += cosT * p.speed;
          if (p.y > H || p.x < -maxDrift - 60 || p.x > W + maxDrift + 60) {
            p.y = -p.len; p.x = spawnX();
          }
        });
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animId); ctx.clearRect(0, 0, W, H); };
  }, [wx]);

  useEffect(() => {
    const t = setTimeout(() => setCanEnter(true), buildDone + 300);
    return () => clearTimeout(t);
  }, [buildDone]);


  function handleClick() {
    if (!canEnter || zoomingRef.current) return;

    // Calcule l'origine du zoom = centre de l'ouverture de la porte dans le viewport
    if (castleRef.current) {
      const rect = castleRef.current.getBoundingClientRect();
      const sx = rect.width  / castleW;   // facteur d'échelle réel
      const sy = rect.height / castleH;
      const dCx = doorX + doorW / 2;                          // centre X porte
      const dCy = 14 * BH + (ROWS - 14) * BH * 0.4;          // milieu ouverture
      const screenX = rect.left + dCx * sx;
      const screenY = rect.top  + dCy * sy;
      setZoomOrigin(
        `${(screenX / window.innerWidth  * 100).toFixed(2)}% ` +
        `${(screenY / window.innerHeight * 100).toFixed(2)}%`
      );
    }

    zoomingRef.current = true;
    setDoorOpen(true);
    setTimeout(() => setZooming(true),  450);
    setTimeout(() => onComplete(),      1700);
  }

  const castleW = TOTAL_STUDS * STUD;
  const castleH = ROWS * BH;
  const scale = typeof window !== 'undefined'
    ? Math.min(1, (window.innerWidth * 0.88) / castleW)
    : 1;

  const cc         = wx?.cloudCover    ?? 40;
  const isDay      = wx ? wx.isDay     : true;
  const wSpeed     = wx?.windSpeed     ?? 15;
  const wDir       = wx?.windDir       ?? 270;
  const precip     = wx?.precipitation ?? 0;
  const skyBg      = skyGradient(isDay, cc);
  const sunAlpha   = isDay && cc < 85 ? Math.max(0, 1 - Math.max(0, cc-30)/55) : 0;
  const numClouds    = cc < 10 ? 0 : cc < 25 ? 1 : cc < 50 ? 2 : cc < 75 ? 3 : 4;
  const effectiveClouds = precip > 0 ? Math.max(numClouds, 3) : numClouds;
  const activeClouds = CLOUD_SHAPES.slice(0, effectiveClouds);
  const cldDur     = wSpeed < 5 ? '90s' : wSpeed < 15 ? '60s' : wSpeed < 30 ? '35s' : wSpeed < 50 ? '20s' : '12s';
  const cldAnim    = wDir >= 200 && wDir <= 340 ? 'cloud-drift-rtl' : 'cloud-drift';
  const { m: cldM, s: cldS } = cloudPalette(cc, isDay);

  const doorX = 24 * STUD;
  const doorY = 12 * BH;
  const doorW = 12 * STUD;
  const doorH = (ROWS - 12) * BH;

  const archClip = `polygon(${[
    `${2 * BW}px 0`,           `${4 * BW}px 0`,
    `${4 * BW}px ${BH}px`,     `${5 * BW}px ${BH}px`,
    `${5 * BW}px ${2 * BH}px`, `${doorW}px ${2 * BH}px`,
    `${doorW}px ${doorH}px`,   `0 ${doorH}px`,
    `0 ${2 * BH}px`,           `${BW}px ${2 * BH}px`,
    `${BW}px ${BH}px`,         `${2 * BW}px ${BH}px`,
  ].join(', ')})`;

  const plankBg = [
    'repeating-linear-gradient(to right, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 26px)',
    'repeating-linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
  ].join(', ');

  const studOffset = Math.round((STUD - SW) / 2);

  function renderStuds(ws, sc) {
    return Array.from({ length: ws }, (_, si) => (
      <div key={si} style={{
        position: 'absolute',
        left: si * STUD + studOffset,
        top: -SH,
        width: SW, height: SH,
        backgroundColor: sc,
        borderRadius: '2px 2px 0 0',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.4)',
          'inset 1px 0 0 rgba(255,255,255,0.2)',
          'inset -1px 0 0 rgba(0,0,0,0.25)',
        ].join(', '),
      }} />
    ));
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: skyBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Arial Black", Arial, sans-serif',
        userSelect: 'none', overflow: 'hidden',
        cursor: 'default',
        transformOrigin: zoomOrigin,
        animation: zooming ? 'zoom-through 1.45s ease-in forwards' : 'none',
      }}
    >
      {/* ── Lego Sun ── */}
      {sunAlpha > 0 && (
        <div style={{ position:'absolute', top:'4%', right:'13%', zIndex:1, pointerEvents:'none', overflow:'visible', opacity:sunAlpha, transition:'opacity 1s' }}>
          {[
            { x:3*STUD, y:SH+10*BH, w: 5*STUD, color:'#D89800', sc:'#C07800' },
            { x:2*STUD, y:SH+ 9*BH, w: 7*STUD, color:'#EBB800', sc:'#D08800' },
            { x:  STUD, y:SH+ 8*BH, w: 9*STUD, color:'#F5C400', sc:'#D89800' },
            { x:0,      y:SH+ 7*BH, w:11*STUD, color:'#FFD700', sc:'#E8A800' },
            { x:0,      y:SH+ 6*BH, w:11*STUD, color:'#FFD700', sc:'#E8A800' },
            { x:0,      y:SH+ 5*BH, w:11*STUD, color:'#FFD700', sc:'#E8A800' },
            { x:0,      y:SH+ 4*BH, w:11*STUD, color:'#FFD700', sc:'#E8A800' },
            { x:0,      y:SH+ 3*BH, w:11*STUD, color:'#FFD700', sc:'#E8A800' },
            { x:  STUD, y:SH+ 2*BH, w: 9*STUD, color:'#FFD700', sc:'#E8A800' },
            { x:2*STUD, y:SH+   BH, w: 7*STUD, color:'#FFE566', sc:'#FFD000' },
            { x:3*STUD, y:SH,       w: 5*STUD, color:'#FFF0A0', sc:'#FFE040' },
          ].map((b,i) => legoBrick(b.x, b.y, b.w, BH, b.color, b.sc, i))}
        </div>
      )}

      {/* ── Stars + Moon — night only ── */}
      {!isDay && Array.from({length:40},(_,i) => (
        <div key={`star-${i}`} style={{
          position:'absolute',
          left:`${(i*137.508)%97}%`, top:`${(i*83.721)%55}%`,
          width:i%4===0?3:2, height:i%4===0?3:2,
          backgroundColor:`rgba(255,255,255,${0.35+(i%5)*0.1})`,
          borderRadius:'50%', pointerEvents:'none', zIndex:0,
        }}/>
      ))}
      {!isDay && (
        <div style={{ position:'absolute', top:'5%', left:'12%', zIndex:1, pointerEvents:'none', overflow:'visible' }}>
          {[
            { x:3*STUD, y:SH+10*BH, w: 5*STUD, color:'#aaaacc', sc:'#8888aa' },
            { x:2*STUD, y:SH+ 9*BH, w: 7*STUD, color:'#b4b4d4', sc:'#9494b4' },
            { x:  STUD, y:SH+ 8*BH, w: 9*STUD, color:'#bcbcdc', sc:'#9c9cbc' },
            { x:0,      y:SH+ 7*BH, w:11*STUD, color:'#c8c8e0', sc:'#a8a8c4' },
            { x:0,      y:SH+ 6*BH, w:11*STUD, color:'#d0d0e8', sc:'#b0b0cc' },
            { x:0,      y:SH+ 5*BH, w:11*STUD, color:'#d8d8f0', sc:'#b8b8d4' },
            { x:0,      y:SH+ 4*BH, w:11*STUD, color:'#d8d8f0', sc:'#b8b8d4' },
            { x:0,      y:SH+ 3*BH, w:11*STUD, color:'#d4d4ec', sc:'#b4b4cc' },
            { x:  STUD, y:SH+ 2*BH, w: 9*STUD, color:'#cccce4', sc:'#acacc4' },
            { x:2*STUD, y:SH+   BH, w: 7*STUD, color:'#c4c4dc', sc:'#a4a4bc' },
            { x:3*STUD, y:SH,       w: 5*STUD, color:'#bcbcd4', sc:'#9c9cb4' },
          ].map((b,i) => legoBrick(b.x, b.y, b.w, BH, b.color, b.sc, i))}
        </div>
      )}

      {/* ── Lego Clouds — dynamic ── */}
      {activeClouds.map(cl => (
        <div key={cl.key} style={{
          position:'absolute', top:cl.top, left:0, zIndex:1, pointerEvents:'none',
          animation:`${cldAnim} ${cldDur} ${cl.del} linear infinite`,
        }}>
          {cl.bricks.slice().sort((a,b)=>b[1]-a[1]).map(([x,y,w,h],i) =>
            legoBrick(x, y, w, h, cldM, cldS, i)
          )}
        </div>
      ))}

      {/* ── Oiseaux CSS ── */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', zIndex:1, pointerEvents:'none' }}>
        {[
          { top:'11%', scale:1.0,  dur:'9s',  del:'0s',    rtl:false },
          { top:'21%', scale:0.68, dur:'13s', del:'-4.5s', rtl:false },
          { top:'6%',  scale:0.5,  dur:'17s', del:'-8s',   rtl:true  },
          { top:'16%', scale:0.82, dur:'11s', del:'-1.5s', rtl:true  },
        ].map((c, i) => (
          <div key={`bird-${i}`} style={{
            position:'absolute', top:c.top, left:0,
            animation:`${c.rtl ? 'bird-rtl' : 'bird-ltr'} ${c.dur} ${c.del} linear infinite`,
          }}>
            <div style={{ position:'relative', width:38, height:14, transform:`scale(${c.scale})` }}>
              <div style={{
                position:'absolute', left:0, top:4, width:17, height:5,
                background:'#1e1e1e', borderRadius:'2px 0 0 2px',
                transformOrigin:'right center',
                animation:`wing-up 0.42s ease-in-out ${i*0.13}s infinite alternate`,
              }}/>
              <div style={{ position:'absolute', left:17, top:1, width:5, height:9, background:'#111', borderRadius:2 }}/>
              <div style={{
                position:'absolute', left:22, top:4, width:17, height:5,
                background:'#1e1e1e', borderRadius:'0 2px 2px 0',
                transformOrigin:'left center',
                animation:`wing-down 0.42s ease-in-out ${i*0.13}s infinite alternate`,
              }}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Rain / Snow — canvas animé ── */}
      <canvas ref={precipCanvasRef} style={{ position:'fixed', inset:0, zIndex:2, pointerEvents:'none', width:'100%', height:'100%' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontWeight: 900,
          color: 'white', letterSpacing: '5px',
          textShadow: [
            '3px 3px 0 #E3000B', '-2px -2px 0 #1D1D1B', '2px -2px 0 #1D1D1B',
            '-2px 2px 0 #1D1D1B', '2px 2px 0 #1D1D1B',
          ].join(', '),
          marginBottom: '0.2rem',
        }}>PORTFOLIO</div>

        <div style={{
          fontSize: 'clamp(0.75rem, 1.5vw, 1rem)', fontWeight: 900,
          color: '#1D1D1B', letterSpacing: '4px', marginBottom: '1.2rem',
        }}>FLORIAN QUILLON</div>

        {/* Castle */}
        <div ref={castleRef} style={{
          position: 'relative', width: castleW, height: castleH,
          transform: `scale(${scale})`, transformOrigin: 'top center',
        }}>
          {/* Ground */}
          <div style={{
            position: 'absolute', zIndex: 0,
            top: castleH - 4,
            left: -5000, right: -5000, bottom: -5000,
            backgroundColor: '#1B5E20',
          }}>
            {hillBricks.map(b => {
              const bc = b.isPath ? pathBrickColor(b.cs, b.row) : hillBrickColor(b.cs, b.row);
              const sc = b.isPath ? pathStudColor(b.cs, b.row)  : hillStudColor(b.cs, b.row);
              return (
                <div key={b.id} style={{
                  position: 'absolute',
                  left: b.x + 5000,
                  top: b.y,
                  width: b.w, height: BH,
                }}>
                  {renderStuds(b.ws, sc)}
                  <div style={{
                    position: 'absolute', left: 0, top: 0,
                    width: b.w, height: BH,
                    backgroundColor: bc,
                    boxShadow: [
                      'inset 0 0 0 1px rgba(0,0,0,0.22)',
                      'inset 0 -2px 0 rgba(0,0,0,0.28)',
                      'inset 0 1px 0 rgba(255,255,255,0.09)',
                    ].join(', '),
                  }} />
                </div>
              );
            })}
          </div>

          {/* Lumière intérieure — zIndex:0, révélée quand les portes s'ouvrent */}
          <div style={{
            position: 'absolute', left: doorX, top: doorY,
            width: doorW, height: doorH,
            clipPath: archClip, zIndex: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 90% at 50% 65%, #ffffff 0%, #f4f8ff 25%, #dce8ff 55%, transparent 100%)',
          }} />

          {/* Halo externe — lumière qui se répand sur le château à l'ouverture */}
          {doorOpen && (
            <div style={{
              position: 'absolute',
              left: doorX - 90, top: doorY - 70,
              width: doorW + 180, height: doorH + 140,
              background: 'radial-gradient(ellipse at 50% 75%, rgba(255,255,255,0.82) 0%, rgba(200,220,255,0.38) 42%, transparent 65%)',
              zIndex: 3, filter: 'blur(20px)',
              mixBlendMode: 'screen', pointerEvents: 'none',
              animation: 'door-glow 0.55s ease-out both',
            }} />
          )}

          {/* Door panels */}
          <div style={{
            position: 'absolute', left: doorX, top: doorY,
            width: doorW, height: doorH,
            clipPath: archClip, zIndex: 1, display: 'flex',
          }}>
            <div style={{
              flex: 1, height: '100%', backgroundColor: '#7B3F15',
              backgroundImage: plankBg, transformOrigin: 'left center',
              animation: doorOpen ? 'door-left 0.7s ease-in forwards' : 'none',
            }} />
            <div style={{
              flex: 1, height: '100%', backgroundColor: '#7B3F15',
              backgroundImage: plankBg, transformOrigin: 'right center',
              animation: doorOpen ? 'door-right 0.7s ease-in forwards' : 'none',
            }} />
          </div>

          {/* Castle bricks */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            {bricks.map((b, i) => {
              const bc = b.isWindow
                ? (b.dark ? '#0c0c0e' : '#0f1830')
                : brickColor(b.cs, b.r);
              const sc = b.isWindow
                ? (b.dark ? '#1a1a1c' : '#1c2a48')
                : studColor(b.cs, b.r);
              const shadow = b.isWindow
                ? 'inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 -2px 0 rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03)'
                : 'inset 0 0 0 1px rgba(0,0,0,0.22), inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)';
              const anim = `brick-appear ${DROP_MS}ms ease-out ${i * BRICK_MS}ms backwards`;
              return (
                <div key={b.id} style={{
                  position: 'absolute', left: b.x, top: b.y,
                  width: b.w, height: b.h,
                  animation: anim,
                }}>
                  {renderStuds(b.ws, sc)}
                  <div style={{
                    position: 'absolute', left: 0, top: 0,
                    width: b.w, height: b.h,
                    backgroundColor: bc,
                    boxShadow: shadow,
                  }} />
                </div>
              );
            })}
          </div>

          {/* ── Bannières sur les tours ── */}
          {[
            { cx: 6 * STUD, color: '#CC2222' },
            { cx: 54 * STUD, color: '#2244BB' },
          ].flatMap(({ cx, color }, i) => {
            const FW    = Math.round(STUD * 3);   // largeur ≈ 57px
            const FH    = Math.round(FW * 2.5);   // hauteur ≈ 142px
            const MERLY = BH;                     // hauteur d'un merlon = 1 rang
            const delay = buildDone + 300 + i * 120;
            const anim  = `banner-drop ${DROP_MS}ms ease-out ${delay}ms forwards`;
            return [
              // Poteau — z:1 (derrière les briques z:2), ancré d'un merlon dans la tour
              <div key={`pole-${i}`} style={{
                position: 'absolute',
                left: cx - 2,
                top: -FH,
                zIndex: 1,
                width: 4,
                height: FH + MERLY,
                opacity: 0,
                backgroundColor: '#6b3a10',
                boxShadow: '1px 0 0 rgba(0,0,0,0.4)',
                animation: anim,
              }} />,
              // Fanion — z:3 (devant les briques), bas = haut du château
              <div key={`flag-${i}`} style={{
                position: 'absolute',
                left: cx - FW/2,
                top: -FH,
                zIndex: 3,
                width: FW,
                height: FH,
                opacity: 0,
                animation: anim,
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: FW, height: FH,
                  backgroundColor: color,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
                  boxShadow: [
                    'inset 0 0 0 1px rgba(0,0,0,0.25)',
                    'inset 0 1px 0 rgba(255,255,255,0.18)',
                  ].join(','),
                }} />
              </div>,
            ];
          })}

          {/* ENTREZ label inside door */}
          {canEnter && !doorOpen && (
            <div style={{
              position: 'absolute', left: doorX,
              top: 14 * BH + (ROWS - 14) * BH * 0.4,
              width: doorW, zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fade-in 0.4s ease-out both',
              pointerEvents: 'none',
            }}>
              <span style={{
                color: '#fff', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '3px',
                textShadow: '1px 1px 0 #1D1D1B, -1px -1px 0 #1D1D1B',
              }}>ENTREZ</span>
            </div>
          )}

          {/* Zone de clic — porte uniquement */}
          {canEnter && !zooming && (
            <div
              onClick={handleClick}
              style={{
                position: 'absolute', left: doorX, top: doorY,
                width: doorW, height: doorH,
                clipPath: archClip,
                zIndex: 10, cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            />
          )}

          {/* ── Roi Lego + bulle météo ── */}
          {wx?.msg && (
            <>
              {/* Personnage — zIndex:0 → derrière la porte (zIndex:1) et les briques (zIndex:2) */}
              <img
                src="/lego_roi.png" alt=""
                style={{
                  position: 'absolute',
                  left: doorX + Math.round(doorW / 2) - 50,
                  top: 8 * BH - 105,
                  height: 125, width: 'auto',
                  imageRendering: 'auto',
                  zIndex: 0, pointerEvents: 'none',
                  animation: `king-rise 1.6s ease-out ${buildDone}ms both`,
                }}
              />
              {/* Bulle à droite du personnage, queue pointant à gauche */}
              <div style={{
                position: 'absolute',
                left: doorX + Math.round(doorW / 2) + 45,
                top: 8 * BH - 95,
                width: 240, zIndex: 5, pointerEvents: 'auto',
                animation: `fade-in 0.6s ease-out ${buildDone + 1700}ms both`,
              }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{
                  backgroundColor: 'white',
                  border: '3px solid #1D1D1B',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.68rem', fontWeight: 900,
                  color: '#1D1D1B', lineHeight: 1.5,
                  boxShadow: '3px 3px 0 #1D1D1B',
                  fontFamily: '"Arial Black", Arial, sans-serif',
                  position: 'relative',
                }}>
                  {wx.msg}
                  {/* Bouton info */}
                  <button
                    onClick={e => { e.stopPropagation(); setShowWxInfo(v => !v); }}
                    title="Comment fonctionne la météo ?"
                    style={{
                      position: 'absolute', top: -10, right: -10,
                      width: 20, height: 20,
                      backgroundColor: showWxInfo ? '#E3000B' : '#1D1D1B',
                      color: 'white', border: '2px solid white',
                      borderRadius: '50%', fontSize: '0.65rem', fontWeight: 900,
                      cursor: 'pointer', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color 0.2s',
                      boxShadow: '1px 1px 0 #1D1D1B',
                    }}
                  >i</button>
                  {/* Queue pointant à gauche — outer */}
                  <div style={{
                    position: 'absolute', left: -18, top: '40%',
                    transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '10px solid transparent',
                    borderBottom: '10px solid transparent',
                    borderRight: '18px solid #1D1D1B',
                  }} />
                  {/* Queue pointant à gauche — inner */}
                  <div style={{
                    position: 'absolute', left: -11, top: '40%',
                    transform: 'translateY(-50%)',
                    width: 0, height: 0,
                    borderTop: '7px solid transparent',
                    borderBottom: '7px solid transparent',
                    borderRight: '11px solid white',
                  }} />
                </div>

                {/* Panneau d'info météo */}
                {showWxInfo && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', left: 0,
                    width: 240, zIndex: 6,
                    backgroundColor: 'white',
                    border: '3px solid #1D1D1B',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    boxShadow: '3px 3px 0 #1D1D1B',
                    fontFamily: '"Arial Black", Arial, sans-serif',
                    animation: 'fade-in 0.2s ease-out both',
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#1D1D1B', marginBottom: 8 }}>
                      ☁️ Météo en temps réel
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#333', lineHeight: 1.6 }}>
                      La météo de cette page est générée à partir de tes vraies conditions météo&nbsp;!
                      <br /><br />
                      Le ciel, les nuages, la pluie, la neige, la vitesse et la direction du vent sont
                      calculés en temps réel via l'API <span style={{ color: '#E3000B' }}>Open-Meteo</span> — open source, sans clé API requise.
                      <br /><br />
                      Ta géolocalisation est utilisée pour récupérer les données météo actuelles de ta ville.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Flash blanc — s'intensifie pendant le zoom */}
      {zooming && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          backgroundColor: 'white', pointerEvents: 'none',
          animation: 'screen-whiten 1.1s ease-in forwards',
        }} />
      )}

      <style>{`
        @keyframes brick-appear {
          from { transform: translateY(-${BH * 2}px); opacity: 0; }
          65%  { transform: translateY(${Math.round(BH * 0.15)}px); opacity: 1; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes banner-drop {
          from { transform: translateY(-${BH * 2}px); opacity: 0; }
          65%  { transform: translateY(${Math.round(BH * 0.15)}px); opacity: 1; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes door-left  { to { transform: translateX(-100%); } }
        @keyframes door-right { to { transform: translateX(100%);  } }
        @keyframes door-glow  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes king-rise  {
          from { transform: translateY(260px); opacity: 1; }
          80%  { transform: translateY(-4px); }
          to   { transform: translateY(0); }
        }
        @keyframes zoom-through {
          from { transform: scale(1); }
          to   { transform: scale(28); }
        }
        @keyframes screen-whiten {
          0%   { opacity: 0; }
          60%  { opacity: 0.05; }
          100% { opacity: 1; }
        }
        @keyframes cloud-drift {
          from { transform: translateX(110vw); }
          to   { transform: translateX(-110vw); }
        }
        @keyframes cloud-drift-rtl {
          from { transform: translateX(-110vw); }
          to   { transform: translateX(110vw); }
        }
        @keyframes rain-fall {
          from { background-position: 0 0; }
          to   { background-position: 0 60px; }
        }
        @keyframes snow-fall {
          from { background-position: 0 0; }
          to   { background-position: 0 40px; }
        }
        @keyframes bird-ltr  { from { transform:translateX(-10vw); } to { transform:translateX(112vw); } }
        @keyframes bird-rtl  { from { transform:translateX(112vw); } to { transform:translateX(-10vw); } }
        @keyframes wing-up   { from { transform:rotate(-28deg); }    to { transform:rotate(12deg); }  }
        @keyframes wing-down { from { transform:rotate(28deg);  }    to { transform:rotate(-12deg); } }
      `}</style>
    </div>
  );
}
