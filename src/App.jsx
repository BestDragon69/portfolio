import { useEffect, useState } from 'react';
import LegoLoading from './components/LegoLoading';
import LegoIntro from './components/LegoIntro';
import NotFound from './components/NotFound';

function makeWeatherMsg(code, temp, cc, ws, wd, pre, day) {
  const dirs = ['Nord','N-Est','Est','S-Est','Sud','S-Ouest','Ouest','N-Ouest'];
  const dirName = dirs[Math.round(wd / 45) % 8];
  let sky;
  if (!day) {
    const n = [
      `${temp}°C cette nuit... j'entends des trucs dans les douves !`,
      `Nuit noire, ${temp}°C. Quelqu'un peut rallumer les torches ?!`,
      `${temp}°C et pas une étoile... ou c'est les nuages ?`,
    ];
    sky = n[code % n.length];
  } else if (code === 0) {
    sky = `Soleil radieux, ${temp}°C ! Je suis magnifique sous cette lumière !`;
  } else if (code <= 3) {
    sky = cc > 60
      ? `${temp}°C et couvert... j'accuse les sorciers du village !`
      : `Nuageux à ${temp}°C. Bien, personne ne verra mes cheveux abîmés par le casque.`;
  } else if (code <= 48) {
    sky = `${temp}°C, brouillard épais ! Si je disparais, prévenez la reine !`;
  } else if (code <= 67) {
    sky = pre > 6
      ? `Déluge à ${temp}°C ! J'aurais dû choisir le métier de boulanger !`
      : `${temp}°C, il bruine... mes parchemins sont foutus !`;
  } else if (code <= 77) {
    sky = `${temp}°C, il neige ! Mon dragon fait du patin à glace, pas terrible.`;
  } else if (code <= 82) {
    sky = `${temp}°C, averses ! J'avais promis un pique-nique aux chevaliers... foiré.`;
  } else {
    sky = `${temp}°C, tempête ! Le château tient... pour l'instant.`;
  }
  if (ws > 50)      sky += ` ${ws}km/h du ${dirName}, mon casque s'est envolé !`;
  else if (ws > 25) sky += ` Vent du ${dirName} (${ws}km/h), les bannières claquent !`;
  else if (ws > 10) sky += ` Brise du ${dirName}, ${ws}km/h.`;
  return sky;
}

const WX_FALLBACK = { msg: 'Météo inconnue... le château tient bon !', code: -1, temp: 0, cloudCover: 40, windSpeed: 15, windDir: 270, precipitation: 0, isDay: true };

async function fetchWeather(lat, lon, attempt = 0) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,` +
    `wind_direction_10m,cloud_cover,precipitation,is_day&timezone=auto`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  const c    = d.current;
  const code = c.weather_code ?? c.weathercode;
  const temp = Math.round(c.temperature_2m);
  const cc   = c.cloud_cover;
  const ws   = Math.round(c.wind_speed_10m);
  const wd   = c.wind_direction_10m;
  const pre  = c.precipitation;
  const day  = !!c.is_day;
  const msg  = makeWeatherMsg(code, temp, cc, ws, wd, pre, day);
  return { msg, code, temp, cloudCover: cc, windSpeed: ws, windDir: wd, precipitation: pre, isDay: day };
}

// Phases: init (fetch météo silencieux) → loading → intro → main
function App() {
  const [phase, setPhase] = useState('init');
  const [wx, setWx]       = useState(null);

  useEffect(() => {
    // ── DEV : remplace null par un objet pour tester sans l'API ──────────────
    const DEV_WX = null;
    if (DEV_WX) {
      const msg = makeWeatherMsg(DEV_WX.code, 15, DEV_WX.cloudCover, DEV_WX.windSpeed, DEV_WX.windDir, DEV_WX.precipitation, DEV_WX.isDay);
      setWx({ msg, temp: 15, ...DEV_WX });
      setPhase('loading');
      return;
    }

    let done = false;
    // Timeout de sécurité : si géoloc ou réseau trop lents on démarre quand même
    const safetyTimer = setTimeout(() => {
      if (!done) { done = true; setWx(WX_FALLBACK); setPhase('loading'); }
    }, 4000);

    const doFetch = (lat, lon, attempt = 0) => {
      fetchWeather(lat, lon).then(data => {
        if (!done) { done = true; clearTimeout(safetyTimer); setWx(data); setPhase('loading'); }
      }).catch(() => {
        if (attempt < 2) {
          setTimeout(() => doFetch(lat, lon, attempt + 1), 1500 * (attempt + 1));
        } else if (!done) {
          done = true; clearTimeout(safetyTimer); setWx(WX_FALLBACK); setPhase('loading');
        }
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => doFetch(p.coords.latitude, p.coords.longitude),
        () => doFetch(48.85, 2.35)
      );
    } else {
      doFetch(48.85, 2.35);
    }

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <>
      {(window.location.pathname !== '/' && window.location.pathname !== '') ? (
        <NotFound />
      ) : (
        <>
{phase === 'loading' && (
            <LegoLoading wx={wx} onComplete={() => setPhase('intro')} />
          )}

          {/* Monté dès le départ pour que Three.js, textures s'initialisent
              en arrière-plan pendant que le château de chargement se construit */}
          {phase !== 'main' && (
            <div style={phase !== 'intro' ? {
              position: 'fixed', inset: 0,
              visibility: 'hidden', pointerEvents: 'none',
              zIndex: -1,
            } : undefined}>
              <LegoIntro onExited={() => setPhase('loading')} />
            </div>
          )}
        </>
      )}
    </>
  );
}

export default App;
