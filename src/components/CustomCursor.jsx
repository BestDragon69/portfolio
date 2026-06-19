import { useEffect, useRef, useState } from 'react';

const STYLE = `
@keyframes sword-swing {
  0%   { transform: rotate(0deg) scale(1); }
  30%  { transform: rotate(-45deg) scale(1.2); }
  60%  { transform: rotate(15deg) scale(0.95); }
  100% { transform: rotate(0deg) scale(1); }
}
.sword-click {
  animation: sword-swing 0.3s ease-out forwards;
}
`;

// Pointe de la lame = hotspot (0,0). L'épée s'étend vers (+40, +43).
// Ces points couvrent la zone visible de l'épée pour le fat-click.
const SWORD_SAMPLES = [
  [14, 10], [28, 10],
  [8,  24], [24, 24],
  [14, 38], [30, 38],
];

export default function CustomCursor() {
  const ref    = useRef(null);
  const pos    = useRef({ x: -999, y: -999 });
  const [swinging, setSwinging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const onMove = e => { pos.current.x = e.clientX; pos.current.y = e.clientY; };
    let rafId;
    const tick = () => {
      el.style.transform = `translate(${pos.current.x - 8}px, ${pos.current.y - 5}px)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { capture: true });
    return () => { window.removeEventListener('pointermove', onMove, { capture: true }); cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      // Animation d'estoc
      setSwinging(false);
      requestAnimationFrame(() => setSwinging(true));

      // Fat-click : propager le clic aux éléments interactifs couverts par l'épée
      // La pointe [0,0] est déjà gérée par l'événement natif → on évite le double-clic
      const tipEl = document.elementFromPoint(e.clientX, e.clientY);
      const tipInteractive = tipEl?.closest('button, a, [role="button"]');
      const seen = new Set();
      if (tipInteractive) seen.add(tipInteractive);

      for (const [dx, dy] of SWORD_SAMPLES) {
        const target = document.elementFromPoint(e.clientX + dx, e.clientY + dy);
        if (!target) continue;
        const interactive = target.closest('button, a, [role="button"]');
        if (interactive && !seen.has(interactive)) {
          seen.add(interactive);
          interactive.click();
        }
      }
    };
    window.addEventListener('pointerdown', onDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onDown, { capture: true });
  }, []);

  return (
    <>
      <style>{STYLE}</style>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 48,
          height: 48,
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
        }}
      >
        <img
          src="/logo_souris.png"
          alt=""
          draggable={false}
          className={swinging ? 'sword-click' : ''}
          onAnimationEnd={() => setSwinging(false)}
          style={{ width: '100%', height: '100%', userSelect: 'none', display: 'block' }}
        />
      </div>
    </>
  );
}
