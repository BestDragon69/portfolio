import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── Unités ───────────────────────────────────────────────────────────────────
const U_FLOOR = { stud: 19, bh: 20, sh: 8,  sw: 12 };
const U_WALL  = { stud: 38, bh: 40, sh: 14, sw: 22 };

const BRICK_TYPES_WALL = [
  { ws: 2, hs: 1 }, { ws: 2, hs: 1 }, { ws: 2, hs: 1 },
  { ws: 3, hs: 1 }, { ws: 3, hs: 1 },
  { ws: 4, hs: 1 },
  { ws: 2, hs: 2 }, { ws: 3, hs: 2 }, { ws: 4, hs: 2 },
];
const BRICK_TYPES_FLOOR = [
  { ws: 2, hs: 1 }, { ws: 3, hs: 1 }, { ws: 4, hs: 1 },
  { ws: 2, hs: 2 }, { ws: 3, hs: 2 }, { ws: 4, hs: 2 },
  { ws: 2, hs: 3 }, { ws: 3, hs: 3 },
];

// ── Constantes soleil overlay ────────────────────────────────────────────────
const SUN_STUD = 19;
const SUN_BH   = 20;

function drawLegoSunCanvas() {
  const rows = [
    [3, 5, '#D89800', '#C07800'],
    [2, 7, '#EBB800', '#D08800'],
    [1, 9, '#F5C400', '#D89800'],
    [0,11, '#FFD700', '#E8A800'],
    [0,11, '#FFD700', '#E8A800'],
    [0,11, '#FFD700', '#E8A800'],
    [0,11, '#FFD700', '#E8A800'],
    [0,11, '#FFD700', '#E8A800'],
    [1, 9, '#FFD700', '#E8A800'],
    [2, 7, '#FFE566', '#FFD000'],
    [3, 5, '#FFF0A0', '#FFE040'],
  ];
  const PAD = 4;
  const canvas = document.createElement('canvas');
  canvas.width  = 11 * SUN_STUD + PAD * 2;
  canvas.height = 11 * SUN_BH + PAD * 2;
  const ctx = canvas.getContext('2d');
  rows.forEach(([xS, wS, color], row) => {
    const bx = PAD + xS * SUN_STUD, by = PAD + row * SUN_BH, bw = wS * SUN_STUD;
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw, SUN_BH);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(bx, by, bw, Math.max(2, Math.floor(SUN_BH * 0.22)));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx, by + SUN_BH - 2, bw, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, SUN_BH - 1);
  });
  return canvas;
}

function drawLegoMoonCanvas() {
  const rows = [
    [3, 5, '#aaaacc', '#8888aa'],
    [2, 7, '#b4b4d4', '#9494b4'],
    [1, 9, '#bcbcdc', '#9c9cbc'],
    [0,11, '#c8c8e0', '#a8a8c4'],
    [0,11, '#d0d0e8', '#b0b0cc'],
    [0,11, '#d8d8f0', '#b8b8d4'],
    [0,11, '#d8d8f0', '#b8b8d4'],
    [0,11, '#d4d4ec', '#b4b4cc'],
    [1, 9, '#cccce4', '#acacc4'],
    [2, 7, '#c4c4dc', '#a4a4bc'],
    [3, 5, '#bcbcd4', '#9c9cb4'],
  ];
  const PAD = 4;
  const canvas = document.createElement('canvas');
  canvas.width  = 11 * SUN_STUD + PAD * 2;
  canvas.height = 11 * SUN_BH   + PAD * 2;
  const ctx = canvas.getContext('2d');
  rows.forEach(([xS, wS, color], row) => {
    const bx = PAD + xS * SUN_STUD, by = PAD + row * SUN_BH, bw = wS * SUN_STUD;
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw, SUN_BH);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx, by, bw, Math.max(2, Math.floor(SUN_BH * 0.22)));
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(bx, by + SUN_BH - 2, bw, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, SUN_BH - 1);
  });
  return canvas;
}

// ── Ciel météo ────────────────────────────────────────────────────────────────
function makeSkyTexture(isDay, cc) {
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  let stops;
  if (!isDay) {
    stops = cc < 50
      ? [['#06091a',0],['#0b1228',.4],['#111e3a',.8],['#192648',1]]
      : [['#09090f',0],['#0e0e18',.4],['#131520',.8],['#191b28',1]];
  } else if (cc < 20) {
    stops = [['#4A90D9',0],['#6BAED6',.4],['#9ECAE1',.8],['#C6DBEF',1]];
  } else if (cc < 50) {
    stops = [['#6a8fa8',0],['#85a5bc',.4],['#a8c0cf',.8],['#c0d3de',1]];
  } else if (cc < 75) {
    stops = [['#7a8f9a',0],['#95a8b3',.4],['#b0c0ca',.8],['#c5d0d8',1]];
  } else {
    stops = [['#6e7a82',0],['#868e96',.4],['#9da5aa',.8],['#b2b9bd',1]];
  }
  stops.forEach(([color, stop]) => grad.addColorStop(stop, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── RNG déterministe ─────────────────────────────────────────────────────────
function makePRNG(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Couleurs ─────────────────────────────────────────────────────────────────
const WALL_TONES  = [62, 67, 70, 64, 68, 60, 72, 66, 63, 69];
const FLOOR_TONES = [52, 56, 49, 58, 54, 48, 60, 51, 55];
const wallBrickColor  = r => { const i = Math.floor(r() * WALL_TONES.length);  return `hsl(220,${5+(i%3)}%,${WALL_TONES[i]}%)`; };
const wallStudColor   = r => { const i = Math.floor(r() * WALL_TONES.length);  return `hsl(220,${5+(i%3)}%,${Math.min(82,WALL_TONES[i]+13)}%)`; };
const floorBrickColor = r => { const i = Math.floor(r() * FLOOR_TONES.length); return `hsl(28,${9+(i%5)}%,${FLOOR_TONES[i]}%)`; };
const floorStudColor  = r => { const i = Math.floor(r() * FLOOR_TONES.length); return `hsl(28,${9+(i%5)}%,${Math.min(60,FLOOR_TONES[i]+9)}%)`; };

// ── Packing de briques ────────────────────────────────────────────────────────
function packBricks(wStuds, hRows, types, colorFn, studFn, seed, u) {
  const { stud, bh } = u;
  const rand = makePRNG(seed);
  const occupied = new Set();
  const key = (c, r) => `${c},${r}`;
  const isOpen = (c, r) => r >= 0 && r < hRows && c >= 0 && c < wStuds && !occupied.has(key(c, r));
  const list = [];
  for (let r = hRows - 1; r >= 0; r--) {
    let c = 0;
    while (c < wStuds) {
      if (!isOpen(c, r)) { c++; continue; }
      const shuffled = types.slice().sort(() => rand() - 0.5);
      let placed = false;
      for (const t of shuffled) {
        let fits = true;
        for (let dc = 0; dc < t.ws && fits; dc++)
          for (let dr = 0; dr < t.hs && fits; dr++)
            if (!isOpen(c+dc, r-dr)) fits = false;
        if (!fits) continue;
        for (let dc = 0; dc < t.ws; dc++)
          for (let dr = 0; dr < t.hs; dr++)
            occupied.add(key(c+dc, r-dr));
        const col = colorFn(rand), sc = studFn(rand);
        list.push({ x: c*stud, y: (r-t.hs+1)*bh, w: t.ws*stud, h: t.hs*bh, ws: t.ws, color: col, studColor: sc });
        c += t.ws; placed = true; break;
      }
      if (!placed) {
        occupied.add(key(c, r));
        const col = colorFn(rand), sc = studFn(rand);
        list.push({ x: c*stud, y: r*bh, w: stud, h: bh, ws: 1, color: col, studColor: sc });
        c++;
      }
    }
  }
  return list;
}

// ── Dessin canvas ─────────────────────────────────────────────────────────────
function drawBricksOnCanvas(canvas, bricks, mortarColor, u) {
  const { stud, sh, sw } = u;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const b of bricks) {
    const { x, y, w, h, ws, color, studColor } = b;
    ctx.fillStyle = color;
    ctx.fillRect(x+1, y+1, w-2, h-2);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x+1, y+1, w-2, Math.max(2, Math.floor(h*0.22)));
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x+1, y+h-3, w-2, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+1.5, y+1.5, w-3, h-3);
    for (let i = 0; i < ws; i++) {
      const sx = x + i*stud + Math.round((stud-sw)/2), sy = y - sh;
      ctx.fillStyle = studColor;
      ctx.beginPath();
      ctx.roundRect(sx, sy, sw, sh, [2,2,0,0]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.40)';
      ctx.fillRect(sx+1, sy+1, sw-2, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(sx+sw-1, sy, 1, sh);
    }
  }
}


// ── Constantes de scène ───────────────────────────────────────────────────────
const EYE_Y     = 650;
const WALL_DIST = 4000;
const WALL_ROWS = 54;
const WALL_H    = WALL_ROWS * U_WALL.bh;

const MERLON_STUDS  = 6;
const CRENEL_STUDS  = 4;
const MERLON_ROWS   = 4;
const MERLON_W_PX   = MERLON_STUDS * U_WALL.stud;
const CRENEL_W_PX   = CRENEL_STUDS * U_WALL.stud;
const MERLON_H_PX   = MERLON_ROWS  * U_WALL.bh;
const MERLON_PERIOD = MERLON_W_PX + CRENEL_W_PX;

const TOWER_STUDS = 26;
const TOWER_W_PX  = TOWER_STUDS * U_WALL.stud;
const TOWER_ROWS  = WALL_ROWS + 5;
const TOWER_H_PX  = TOWER_ROWS * U_WALL.bh;

const WALL_W        = 2 * (WALL_DIST - TOWER_W_PX);
const WALL_STUDS_3D = Math.round(WALL_W / U_WALL.stud);
const MERLON_N      = Math.floor((WALL_W + CRENEL_W_PX) / MERLON_PERIOD);
const WALL_CRENEL_W = Math.round((WALL_W - MERLON_N * MERLON_W_PX) / (MERLON_N - 1));

const FLOOR_SIZE  = 8000;
const FLOOR_STUDS = Math.ceil(FLOOR_SIZE / U_FLOOR.stud);
const FLOOR_ROWS  = Math.ceil(FLOOR_SIZE / U_FLOOR.bh);

// ── Données de briques (pré-calculées) ───────────────────────────────────────
const WALL_DATA_N  = packBricks(WALL_STUDS_3D, WALL_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 42,  U_WALL);
const WALL_DATA_S  = packBricks(WALL_STUDS_3D, WALL_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 137, U_WALL);
const WALL_DATA_E  = packBricks(WALL_STUDS_3D, WALL_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 93,  U_WALL);
const WALL_DATA_W  = packBricks(WALL_STUDS_3D, WALL_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 251, U_WALL);
const TOWER_DATA_NE = packBricks(TOWER_STUDS, TOWER_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 11, U_WALL);
const TOWER_DATA_NW = packBricks(TOWER_STUDS, TOWER_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 22, U_WALL);
const TOWER_DATA_SE = packBricks(TOWER_STUDS, TOWER_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 33, U_WALL);
const TOWER_DATA_SW = packBricks(TOWER_STUDS, TOWER_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 44, U_WALL);
const FLOOR_DATA    = packBricks(FLOOR_STUDS, FLOOR_ROWS, BRICK_TYPES_FLOOR, floorBrickColor, floorStudColor, 77, U_FLOOR);

// ── Messages tutoriel roi ─────────────────────────────────────────────────────
const KING_MESSAGES = [
  "Bienvenue, voyageur... La place est bien silencieuse aujourd'hui. Je suis le Roi de ce royaume — développeur et bâtisseur de ce portfolio.",
  "Il y a trois lunes, un Sorcier est apparu. D'un seul sortilège, il a enchanté tous les objets des marchands... et les neuf marchands se sont évaporés dans la nuit !",
  "Le Sorcier rôde toujours parmi les stands — côté ouest. Il détient la Poudre Révélatrice, seule capable de briser ses enchantements et révéler les parchemins cachés. En cadeau de bienvenue, voici 10 pièces d'or ! 🪙",
  "Pour naviguer : clique-glisse pour regarder autour de toi. Clique sur un stand pour t'en approcher, puis sur un objet pour l'examiner. Appuie sur Échap ou le bouton pour revenir sur la place.",
  "Chaque stand renferme 3 objets enchantés. Saupoudre-les avec la Poudre Révélatrice pour briser le sort et lire les parchemins ! Une fois ouvert, utilise la molette pour le dérouler.",
  "🤫 Les anciens racontent qu'au fond du château sommeille un secret bien gardé... Appuyez sur ce qui dépasse du sol — parfois, ce qui monte cache ce qui descend.",
  "🔥 On dit aussi que les flammes murmurent un ordre précis... Le feu s'éteint pour ceux qui savent écouter.",
];

// ── Contenu des stands — items 3D + popups ────────────────────────────────────
// Modifier ce tableau pour personnaliser le contenu de chaque stand.
const STANDS_CONTENT = [
  // 0 — Forgeron — Profil
  { popupTheme: 'shield', items: [
    { label: 'Portrait', title: '⚔️ Qui suis-je ?', content: [
      'Florian Quillon, développeur Full-Stack de 19 ans avec une affinité marquée pour le front-end et les interfaces interactives.',
      'Autodidacte et curieux, je passe facilement d\'une techno à l\'autre et j\'apprécie autant travailler en totale autonomie qu\'au sein d\'une équipe.',
      'Actuellement en BUT Informatique à l\'IUT Lyon 1, je suis ouvert aux missions, stages et collaborations.',
    ]},
    { label: 'Démarche', title: '🛡️ Ma démarche', content: [
      'J\'aborde chaque projet avec rigueur : comprendre le besoin avant de coder, structurer ma réflexion, puis construire proprement.',
      'Je soigne l\'expérience utilisateur autant que la qualité du code, et j\'aime quand les deux se rejoignent.',
      'Je m\'adapte aussi bien à un cahier des charges strict qu\'à un environnement créatif en évolution.',
    ]},
    { label: 'Portfolio', title: '🏰 Ce portfolio', content: [
      'Ce château cache 2 easter eggs secrets — saurez-vous les trouver ?',
      'Chaque recoin mérite d\'être exploré... certains indices ont peut-être déjà été glissés quelque part.',
      'Pour me contacter, rendez-vous chez le Boulanger !',
    ]},
  ]},
  // 1 — Moine — Compétences
  { popupTheme: 'parchment', items: [
    { label: 'Techniques', title: '📜 Compétences techniques', content: [
      'Plusieurs années de pratique sur C, C++, C# et Java pour les bases algorithmiques et systèmes.',
      'En web : HTML, CSS, PHP et JavaScript au quotidien, avec React et Node.js côté frameworks.',
      'Les bases de données via SQL et PL/SQL, versioning avec Git, conteneurs avec Docker.',
    ]},
    { label: 'Savoir-être', title: '📖 Savoir-être', content: [
      'Organisé et méthodique, je planifie avant d\'agir et garde une vision d\'ensemble sans perdre le détail.',
      'Résolution de problèmes, esprit de synthèse et patience : des qualités renforcées par une participation pluriannuelle aux concours nationaux de mathématiques et d\'informatique.',
      'Flexible et autonome, je m\'intègre rapidement dans n\'importe quel contexte de travail.',
    ]},
    { label: 'Langues', title: '✒️ Langues', content: [
      'Français — Langue maternelle',
      'Anglais — Intermédiaire (B2)',
      'Espagnol — Intermédiaire (B1)',
      'Japonais — Débutant',
    ]},
  ]},
  // 2 — Artisan — Projets
  { popupTheme: 'workshop', items: [
    { label: 'Annuaire', title: '📂 Logiciel Annuaire (C)', content: [
      'Logiciel de gestion d\'annuaires développé en C.',
      'Fonctionnalités : ajout, suppression, recherche et tri de contacts avec persistence des données en fichier.',
      'Projet académique mené avec des contraintes techniques réelles.',
    ]},
    { label: 'Trajets', title: '🗺️ Application Trajets (Java)', content: [
      'Application de gestion de trajets développée en Java.',
      'Interface graphique, saisie d\'itinéraires, calcul et affichage des trajets.',
      'Projet académique avec conception orientée objet.',
    ]},
    { label: 'Idle', title: '⚙️ Idle Game Web', content: [
      'Jeu web incrémental interactif de type idle, jouable directement dans le navigateur.',
      'Progression automatisée, système de ressources, achats et événements. Un projet idéal pour maîtriser la gestion d\'état côté client.',
      'Stack : PHP, JavaScript, HTML/CSS.',
    ]},
  ]},
  // 3 — Paysan — Formation
  { popupTheme: 'harvest', items: [
    { label: 'BUT Info', title: '🎓 BUT Informatique', content: [
      'IUT Lyon 1, diplôme en cours (2024–2027).',
      'Formation pluridisciplinaire couvrant le développement logiciel, les bases de données, les réseaux et la gestion de projet.',
    ]},
    { label: 'Bac STI2D', title: '📋 Baccalauréat STI2D', content: [
      'Lycée René Cassin — Tarare, obtenu en juin 2024.',
      'Mention Assez Bien avec une note de 13,7/20. Spécialité Technologies de l\'Information et du Numérique.',
    ]},
    { label: 'TUMO & +', title: '🌱 TUMO Lyon & Certifications', content: [
      'TUMO Lyon (Charbonnières-les-Bains) de 2021 à 2024 : formation intensive en programmation web, développement de jeux vidéo et robotique.',
      'Certification PIX obtenue, validant un socle de compétences numériques.',
    ]},
  ]},
  // 4 — Boucher — Expériences
  { popupTheme: 'butcher', items: [
    { label: 'Travail', title: '💼 Expériences professionnelles', content: [
      'Développeur stagiaire chez ELISSAR (avril – juin 2026) : développement de fonctionnalités React / Node.js pour le portail citoyen.',
      'Technicien informatique stagiaire chez ASTIAS Informatique (décembre 2020) : conseil, vente de matériel et réparation logicielle et hardware.',
      'Valet polyvalent au CITOTEL Côté Hôtel (juillet – septembre 2025) : ménage, réception, cuisine et veille de nuit.',
    ]},
    { label: 'Asso', title: '🤝 Engagement associatif', content: [
      'Responsable projets au BDE Informatique (mars 2025 – mars 2026) : pilotage de projets et événements de bout en bout.',
      'Membre actif au Student Club (janvier – juin 2026) : pré-organisation et logistique des événements associatifs.',
    ]},
    { label: 'Concours', title: '🏅 Concours nationaux', content: [
      'Participant pluriannuel aux concours nationaux de mathématiques et d\'informatique.',
      'Ces compétitions ont renforcé mon goût pour la résolution de problèmes complexes et la pensée algorithmique.',
    ]},
  ]},
  // 5 — Poissonnier — Centres d'intérêt
  { popupTheme: 'fishboard', items: [
    { label: 'Asso', title: '🌐 Le monde associatif', content: [
      'Très impliqué dans la vie associative depuis plusieurs années : organisation d\'événements, gestion de projets et dynamique de groupe.',
      'Une école de la responsabilité et du collectif que je retrouve aussi bien dans mon BDE qu\'au Student Club.',
    ]},
    { label: 'Legos', title: '🧱 Construction LEGO', content: [
      'La construction LEGO est pour moi une passion qui mêle créativité, architecture et patience.',
      'Des petites structures du quotidien aux grands MOC inspirés de châteaux médiévaux — les briques m\'accompagnent depuis l\'enfance.',
    ]},
    { label: 'Japon', title: '🎌 Culture japonaise', content: [
      'Passionné par la culture japonaise : mangas, animés, langue et esthétique.',
      'J\'apprends le japonais en autodidacte et m\'y intéresse autant pour la narration que pour la philosophie qu\'il véhicule.',
    ]},
  ]},
  // 6 — Boulanger — Contact
  { popupTheme: 'bread', items: [
    { label: 'Email', title: '📬 Envoyer un message', content: [
      'Je réponds sous 24h et suis ouvert aux offres de stage, missions freelance, collaborations ou simplement pour échanger sur un projet.',
    ], links: [{ label: '✉️ quillon.florian@gmail.com', url: 'mailto:quillon.florian@gmail.com' }] },
    { label: 'LinkedIn', title: '🤝 LinkedIn', content: [
      'Mon parcours complet, mis à jour régulièrement. Toujours ouvert aux opportunités professionnelles.',
    ], links: [{ label: '🔗 Voir mon profil LinkedIn', url: 'https://www.linkedin.com/in/florian-quillon-1a92b1311' }] },
    { label: 'GitHub', title: '💻 GitHub', content: [
      'Mes projets personnels, expérimentations et contributions. Pour un contact direct : 06 68 41 32 91.',
    ], links: [{ label: '⌨️ github.com/Florian-QUILLON', url: 'https://github.com/Florian-QUILLON' }] },
  ]},
  // 7 — Tavernier — Réalisations
  { popupTheme: 'tavern', items: [
    { label: 'FPS', title: '🎮 Jeu FPS d\'horreur', content: [
      'Jeu d\'horreur à la première personne développé en solo sous Unity (C#).',
      'Atmosphère immersive, mécaniques de survie et exploration. Gestion de scènes 3D, collisions, IA et audio.',
      'Projet personnel réalisé en dehors du cursus scolaire.',
    ]},
    { label: 'Jeu96', title: '🎲 Jeu du 96', content: [
      'Jeu web interactif disponible en ligne, conçu et développé entièrement en solo.',
      'Jouable directement dans le navigateur — testez-le !',
    ], links: [{ label: '🌐 Jouer au Jeu du 96', url: 'https://jeudu96.vercel.app' }] },
    { label: 'Portfolio', title: '🏰 Portfolio médiéval LEGO', content: [
      'Ce portfolio interactif en 3D que vous explorez en ce moment — construit avec React et Three.js.',
      'Château médiéval entièrement procédural, 9 stands, sorcier animé, musique d\'ambiance et easter eggs cachés.',
    ], links: [{ label: '🔗 florianquillon.fr', url: 'https://florianquillon.fr' }] },
  ]},
  // 8 — Sorcier — Boutique
  { popupTheme: 'cauldron', items: [
    { label: 'Poudre',  title: '✨ Poudre Révélatrice', content: ['Révèle les secrets inscrits sur les parchemins des marchands. Indispensable pour tout aventurier !'], cost: 5 },
    { label: 'PDF',     title: '📜 Parchemin de Synthèse', content: ['Un résumé complet de mon profil en version PDF — pour ceux qui préfèrent aller à l\'essentiel sans parcourir le château.'], cost: 5,
      links: [{ label: '⬇️ Télécharger le portfolio (PDF)', url: '/florian-quillon-portfolio.pdf', download: 'Florian-Quillon-Portfolio.pdf' }] },
    { label: 'Mystère', title: '🔮 Objet Mystérieux',   content: ['Son pouvoir est inconnu... Peut-être ne vaut-il rien. Peut-être tout.'], cost: 100 },
  ]},
];

// Surface pour les stands bouclier/parchemin ; les autres utilisent makeItem3D
const BOARD_TYPES = [
  null,        // 0 Forgeron    → makeItem3D (sword, shield, helm)
  null,        // 1 Moine       → makeItem3D (book, scroll, candle)
  null,        // 2 Artisan     → makeItem3D
  null,        // 3 Paysan      → makeItem3D
  null,        // 4 Boucher     → makeItem3D
  null,        // 5 Poissonnier → makeItem3D
  null,        // 6 Boulanger   → makeItem3D
  null,        // 7 Tavernier   → makeItem3D
  null,        // 8 Sorcier     → makeItem3D
];

// Formes 3D pour les stands sans bouclier/parchemin
const ITEM_SHAPES = [
  ['sword',   'shield',  'helm'    ],  // 0 Forgeron    (non-utilisé)
  ['book',    'scroll',  'candle'  ],  // 1 Moine       (non-utilisé)
  ['hammer',  'jar',     'wheat'   ],  // 2 Artisan
  ['wheat',   'book',    'scroll'  ],  // 3 Paysan      (non-utilisé)
  ['joint',   'cleaver', 'jar'     ],  // 4 Boucher
  ['fish',    'rod',     'net'     ],  // 5 Poissonnier
  ['loaf',    'baguette','mug'     ],  // 6 Boulanger
  ['barrel',  'mug',     'potion'  ],  // 7 Tavernier
  ['potion',  'scroll',  'star'    ],  // 8 Sorcier (fiole + parchemin PDF + mystère)
];

// ── Feux d'artifice (canvas overlay) ──────────────────────────────────────────
function Fireworks({ active }) {
  const cvRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    let lastBurst = -9999;
    let raf;

    const burst = (time) => {
      lastBurst = time;
      const x = cv.width  * (0.12 + Math.random() * 0.76);
      const y = cv.height * (0.05 + Math.random() * 0.50);
      const hue = Math.random() * 360;
      const n = 55 + Math.floor(Math.random() * 35);
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.15;
        const speed = 1.5 + Math.random() * 4.5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          hue: hue + Math.random() * 40 - 20,
          sat: 90 + Math.floor(Math.random() * 10),
          life: 1,
          decay: 0.010 + Math.random() * 0.016,
          size: 2 + Math.random() * 2.5,
          trail: [],
        });
      }
    };

    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (t - lastBurst > 500 + Math.random() * 500) burst(t);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();
        p.x  += p.vx; p.vx *= 0.97;
        p.y  += p.vy; p.vy  = p.vy * 0.97 + 0.07;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        // Traîne
        p.trail.forEach((pt, ti) => {
          const ta = (ti / p.trail.length) * p.life * 0.5;
          ctx.globalAlpha = ta;
          ctx.fillStyle = `hsl(${p.hue},${p.sat}%,70%)`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        });
        // Point principal
        ctx.globalAlpha = p.life;
        ctx.shadowColor = `hsl(${p.hue},100%,70%)`;
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = `hsl(${p.hue},${p.sat}%,75%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [active]);

  if (!active) return null;
  return <canvas ref={cvRef} style={{ position:'fixed', inset:0, zIndex:905, pointerEvents:'none' }} />;
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function LegoIntro({ onExited }) {
  const [flashIn,  setFlashIn]  = useState(true);
  const [wx,       setWx]       = useState(null);
  const [showKing, setShowKing] = useState(false);
  const [kingMsg,  setKingMsg]  = useState(0);
  const [kingGone, setKingGone] = useState(false);
  const [atStand,   setAtStand]   = useState(false);
  const [holdState, setHoldState] = useState(null);
  // holdState = null | { standIdx, itemIdx, phase: 'center'|'revealed' }
  const [sprinkling, setSprinkling]   = useState(false);
  const [smokingPhase, setSmokingPhase] = useState(false);
  const [torchEggDone,    setTorchEggDone]    = useState(false);
  const [fireworksActive, setFireworksActive] = useState(false);
  const [revealedItems, setRevealedItems] = useState(new Set()); // reset chaque session
  const [hasPowder, setHasPowder]         = useState(false);    // reset chaque session
  const [eggPhase, setEggPhase]   = useState(null);
  // null | 'blackout' | 'cave' | 'dialog' | 'fadeout'
  const [coinCount, setCoinCount] = useState(0); // reset chaque session
  const [showHelp, setShowHelp] = useState(false);
  const [showQuest, setShowQuest] = useState(false);
  const [nightGift, setNightGift] = useState(false);
  const torchFlamesRef = useRef([]);
  const birdsRef = useRef([]);
  const audioRef = useRef(null);
  const mountRef         = useRef(null);
  const eggStonesRef     = useRef([]);
  const caveRef          = useRef(null);
  const eggDiveOverlayRef = useRef(null);
  const stateRef  = useRef({ rotY: 0, dragX: null, dragX0: null, dragY0: null, camera: null });
  // Setters accessibles depuis l'animate loop (useEffect)
  stateRef.current._setAtStand    = setAtStand;
  stateRef.current._setHoldState  = setHoldState;
  stateRef.current._setEggPhase   = setEggPhase;
  stateRef.current._revealedItems = revealedItems;
  const standsRef = useRef([]);
  const sceneRef  = useRef(null);
  const sunRef    = useRef(null);
  const moonRef   = useRef(null);
  const rainRef   = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setFlashIn(false), 900);
    return () => clearTimeout(t);
  }, []);

  // Initialise l'overlay à opacity=0 (sans que React ne le réécrase ensuite)
  useEffect(() => {
    if (eggDiveOverlayRef.current) eggDiveOverlayRef.current.style.opacity = '0';
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowKing(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const s = stateRef.current;
        const hi = s.heldItem;
        const activeS = ['held_center','held_revealed','flying_in'];
        if (hi && activeS.includes(hi.state)) {
          if (s.parchmentObj && !s.parchmentObj.returning) {
            s.parchmentObj.returning = true;
            hi.state = 'parchment_returning';
            s._setHoldState?.(null);
          } else if (!s.parchmentObj) {
            hi.state = 'flying_out';
            s._setHoldState?.(null);
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // ── DEV : remplace null par un objet pour tester sans l'API ──────────────
    // Ciel dégagé jour  : { code:0,  cloudCover:5,  isDay:true,  precipitation:0 }
    // Ciel couvert jour : { code:3,  cloudCover:85, isDay:true,  precipitation:0 }
    // Nuit claire       : { code:0,  cloudCover:5,  isDay:false, precipitation:0 }
    // Pluie légère      : { code:61, cloudCover:70, isDay:true,  precipitation:2  }
    // Pluie forte       : { code:65, cloudCover:95, isDay:true,  precipitation:12 }
    // Neige             : { code:73, cloudCover:80, isDay:true,  precipitation:3  }
    const DEV_WX = null;
    if (DEV_WX) { setWx({ windSpeed:10, windDir:270, precipitation:0, ...DEV_WX }); return; }
    const doFetch = async (lat, lon, attempt = 0) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation,is_day&timezone=auto`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        const c = d.current;
        setWx({
          code: c.weather_code ?? c.weathercode,
          cloudCover: c.cloud_cover,
          windSpeed: Math.round(c.wind_speed_10m),
          windDir: c.wind_direction_10m,
          precipitation: c.precipitation,
          isDay: !!c.is_day,
        });
      } catch {
        if (attempt < 2) {
          setTimeout(() => doFetch(lat, lon, attempt + 1), 1500 * (attempt + 1));
        } else {
          setWx({ code: -1, cloudCover: 40, windSpeed: 15, windDir: 270, precipitation: 0, isDay: true });
        }
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => doFetch(p.coords.latitude, p.coords.longitude),
        () => doFetch(48.85, 2.35)
      );
    } else {
      doFetch(48.85, 2.35);
    }
  }, []);

  useEffect(() => {
    if (wx && sceneRef.current) {
      sceneRef.current.background = makeSkyTexture(wx.isDay, wx.cloudCover);
    }
    if (sunRef.current) {
      const isDay = wx ? wx.isDay : true;
      const cc    = wx?.cloudCover ?? 40;
      const alpha = isDay && cc < 85 ? Math.max(0, 1 - Math.max(0, cc - 30) / 55) : 0;
      sunRef.current.material.opacity = alpha;
      sunRef.current.visible = alpha > 0;
    }
    if (moonRef.current) {
      const isDay = wx ? wx.isDay : true;
      moonRef.current.visible = !isDay;
      moonRef.current.material.opacity = isDay ? 0 : 0.9;
    }
    if (rainRef.current) {
      const snowCode = wx && ((wx.code >= 70 && wx.code <= 77) || (wx.code >= 85 && wx.code <= 86));
      const rainCode = wx && ((wx.code >= 51 && wx.code <= 67) || (wx.code >= 80 && wx.code <= 84));
      const active   = (wx?.precipitation ?? 0) > 0 || snowCode || rainCode;
      rainRef.current.mesh.visible = !!active;
      if (active) {
        const mat = rainRef.current.mesh.material;
        mat.color.setHex(snowCode ? 0xffffff : 0x88aacc);
        mat.opacity = snowCode ? 0.8 : 0.55;
        stateRef.current.rainFall  = snowCode ? 5 : 18 + (wx?.precipitation ?? 0) * 1.5;
        stateRef.current.rainDrift = -Math.sin((wx?.windDir ?? 270) * Math.PI / 180) * (wx?.windSpeed ?? 0) * (snowCode ? 0.1 : 0.04);
      }
    }
  }, [wx]);

  useEffect(() => {
    if (!wx || wx.isDay) return;
    const h = new Date().getHours();
    if (h >= 0 && h < 5) {
      setTimeout(() => {
        setNightGift(true);
        setCoinCount(c => c + 3);
      }, 3500);
    }
  }, [wx]);

  useEffect(() => {
    const startAudio = () => {
      if (audioRef.current) return;
      const audio = new Audio('/melodigne-castle-152858.mp3');
      audio.loop = true;
      audio.volume = 0.15;
      audio.play().catch(() => {});
      audioRef.current = audio;
    };
    window.addEventListener('pointerdown', startAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', startAudio);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth  || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;

    // Scène
    const scene = new THREE.Scene();
    scene.background = makeSkyTexture(true, 40);
    sceneRef.current = scene;

    // ── Soleil LEGO dans le ciel ──
    const sunTex = new THREE.CanvasTexture(drawLegoSunCanvas());
    sunTex.colorSpace = THREE.SRGBColorSpace;
    sunTex.magFilter = THREE.NearestFilter;
    sunTex.minFilter = THREE.NearestFilter;
    const sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    sunSprite.position.set(6000, 6500, -10000);
    sunSprite.scale.set(3800, 3800, 1);
    scene.add(sunSprite);
    sunRef.current = sunSprite;

    // ── Lune LEGO dans le ciel ──
    const moonTex = new THREE.CanvasTexture(drawLegoMoonCanvas());
    moonTex.colorSpace = THREE.SRGBColorSpace;
    moonTex.magFilter = THREE.NearestFilter;
    moonTex.minFilter = THREE.NearestFilter;
    const moonSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, opacity: 0 })
    );
    moonSprite.position.set(-4000, 6500, -10000);
    moonSprite.scale.set(2800, 2800, 1);
    moonSprite.visible = false;
    scene.add(moonSprite);
    moonRef.current = moonSprite;

    // Éclairage — donne la profondeur 3D par différence de luminosité entre faces
    scene.add(new THREE.AmbientLight(0xb8c4cc, 2.0));
    const sun = new THREE.DirectionalLight(0xffd8b0, 1.6);
    sun.position.set(200, 800, 600);  // au-dessus et légèrement devant
    scene.add(sun);

    // Caméra — positionnée près du mur Sud, regardant vers le Nord
    const camera = new THREE.PerspectiveCamera(60, W / H, 10, 200000);
    camera.position.set(0, 0, WALL_DIST * 0.85);
    camera.rotation.order = 'YXZ';
    camera.rotation.x = THREE.MathUtils.degToRad(-3);
    stateRef.current.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Crée une texture canvas redimensionnée pour économiser la mémoire GPU
    function makeTex(fullW, fullH, drawFn, maxPx = 1024) {
      const scale = Math.min(1, maxPx / Math.max(fullW, fullH));
      const w = Math.ceil(fullW * scale), h = Math.ceil(fullH * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // Proxy qui rapporte les dimensions originales aux fonctions de dessin
      const proxy = Object.create(c);
      Object.defineProperty(proxy, 'width',  { get: () => fullW });
      Object.defineProperty(proxy, 'height', { get: () => fullH });
      proxy.getContext = () => ctx;
      drawFn(proxy);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    }


    // Épaisseur des murs (depth) — donne le look 3D
    const WT   = 350;  // wall thickness
    const SUB  = 200;  // extension sous le sol pour supprimer la ligne noire

    const wH   = WALL_H    + SUB;
    const wCY  = -EYE_Y + WALL_H    / 2 - SUB / 2;
    const tH   = TOWER_H_PX + SUB;
    const tCY  = -EYE_Y + TOWER_H_PX / 2 - SUB / 2;

    // Couleurs des faces non-texturées
    const C_TOP  = 0x5a6e7e;  // dessus (plus clair → simuler lumière zénithale)
    const C_SIDE = 0x38464f;  // flancs et face extérieure

    // Crée un BoxGeometry avec briques sur les faces spécifiées, côtés optionnels
    // sideTex : texture pour les faces latérales (non-inner, non-top, non-bottom)
    function addBox(gW, gH, gD, brickTex, innerIdx, cx, cy, cz, ry = 0, extraIdx = -1, sideTex = null) {
      const mats = [0,1,2,3,4,5].map(i => {
        if (i === 2) return new THREE.MeshLambertMaterial({ color: C_TOP, side: THREE.DoubleSide });
        if (i === 3) return new THREE.MeshLambertMaterial({ color: 0x141c24 });
        if (i === innerIdx || i === extraIdx)
          return new THREE.MeshLambertMaterial({ map: brickTex });
        if (sideTex) return new THREE.MeshLambertMaterial({ map: sideTex });
        return new THREE.MeshLambertMaterial({ color: C_SIDE });
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(gW, gH, gD), mats);
      mesh.position.set(cx, cy, cz);
      if (ry) mesh.rotation.y = ry;
      scene.add(mesh);
    }

    // Texture pour les faces latérales des murs (WT × WALL_H proportions)
    const wSideStuds  = Math.max(1, Math.round(WT / U_WALL.stud));
    const wSideBricks = packBricks(wSideStuds, WALL_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 66, U_WALL);
    const wSideTex    = makeTex(WT, WALL_H, c => drawBricksOnCanvas(c, wSideBricks, '#28323d', U_WALL), 256);

    // ── Murs (BoxGeometry) — toutes faces avec briques ──
    addBox(WALL_W, wH, WT, makeTex(WALL_W, WALL_H, c => drawBricksOnCanvas(c, WALL_DATA_N, '#28323d', U_WALL)),
      4,  0,          wCY, -WALL_DIST - WT/2, 0,  -1, wSideTex);
    addBox(WALL_W, wH, WT, makeTex(WALL_W, WALL_H, c => drawBricksOnCanvas(c, WALL_DATA_S, '#28323d', U_WALL)),
      4,  0,          wCY,  WALL_DIST + WT/2, Math.PI, -1, wSideTex);
    addBox(WALL_W, wH, WT, makeTex(WALL_W, WALL_H, c => drawBricksOnCanvas(c, WALL_DATA_E, '#28323d', U_WALL)),
      4,  WALL_DIST + WT/2, wCY, 0, -Math.PI/2, -1, wSideTex);
    addBox(WALL_W, wH, WT, makeTex(WALL_W, WALL_H, c => drawBricksOnCanvas(c, WALL_DATA_W, '#28323d', U_WALL)),
      4, -WALL_DIST - WT/2, wCY, 0,  Math.PI/2, -1, wSideTex);

    // ── Merlons 3D (boîtes individuelles par créneau) ──
    // Profondeur plus grande que WT pour que le dessus soit bien visible depuis le bas
    const MD  = 700;  // merlon depth
    const mTopY = -EYE_Y + WALL_H + MERLON_H_PX / 2;  // centre Y des merlons

    // Textures de briques pour les merlons
    const merlonBricks    = packBricks(MERLON_STUDS, MERLON_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 77, U_WALL);
    const mmBrickTex      = makeTex(MERLON_W_PX, MERLON_H_PX, c => drawBricksOnCanvas(c, merlonBricks, '#28323d', U_WALL), 256);
    const mSideStuds      = Math.max(1, Math.round(MD / U_WALL.stud));
    const mSideBricks     = packBricks(mSideStuds, MERLON_ROWS, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, 55, U_WALL);
    const mmSideTex       = makeTex(MD, MERLON_H_PX, c => drawBricksOnCanvas(c, mSideBricks, '#28323d', U_WALL), 256);

    // Matériaux partagés — toutes les faces visibles ont de la brique
    const mmFront = new THREE.MeshLambertMaterial({ map: mmBrickTex });
    const mmSide  = new THREE.MeshLambertMaterial({ map: mmSideTex });
    const mmTop   = new THREE.MeshLambertMaterial({ color: C_TOP, side: THREE.DoubleSide });
    const mmDark  = new THREE.MeshLambertMaterial({ color: 0x141c24 });
    // BoxGeometry faces : [+X, -X, +Y(top), -Y(bottom), +Z(front), -Z(back)]
    const mmats = [mmSide, mmSide, mmTop, mmDark, mmFront, mmSide];
    const mgeoWall  = new THREE.BoxGeometry(MERLON_W_PX, MERLON_H_PX, MD);

    function placeMerlons(n, period, gap, startX, facing) {
      for (let i = 0; i < n; i++) {
        const along = startX + MERLON_W_PX / 2 + i * (MERLON_W_PX + gap);
        const m = new THREE.Mesh(mgeoWall, mmats);
        if (facing === 'N') { m.position.set(along, mTopY, -WALL_DIST - MD/2); }
        if (facing === 'S') { m.position.set(along, mTopY,  WALL_DIST + MD/2); m.rotation.y = Math.PI; }
        if (facing === 'E') { m.position.set( WALL_DIST + MD/2, mTopY, along); m.rotation.y = -Math.PI/2; }
        if (facing === 'W') { m.position.set(-WALL_DIST - MD/2, mTopY, along); m.rotation.y =  Math.PI/2; }
        scene.add(m);
      }
    }

    placeMerlons(MERLON_N, MERLON_W_PX + WALL_CRENEL_W, WALL_CRENEL_W, -WALL_W/2, 'N');
    placeMerlons(MERLON_N, MERLON_W_PX + WALL_CRENEL_W, WALL_CRENEL_W, -WALL_W/2, 'S');
    placeMerlons(MERLON_N, MERLON_W_PX + WALL_CRENEL_W, WALL_CRENEL_W, -WALL_W/2, 'E');
    placeMerlons(MERLON_N, MERLON_W_PX + WALL_CRENEL_W, WALL_CRENEL_W, -WALL_W/2, 'W');

    // ── Sol ──
    {
      const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(FLOOR_SIZE + 400, FLOOR_SIZE + 400),
        new THREE.MeshLambertMaterial({ map: makeTex(FLOOR_SIZE, FLOOR_SIZE, c => drawBricksOnCanvas(c, FLOOR_DATA, '#6a5030', U_FLOOR), 2048), side: THREE.DoubleSide })
      );
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = -EYE_Y - 2;
      scene.add(floorMesh);
    }

    // ── Puit (centre du château) ──
    {
      const WO  = 680;
      const WWT = 114;                   // épaisseur ≈ 3 studs
      const WBH = 200;                   // hauteur margelle (5 rangs)
      const INN = WO - 2 * WWT;
      const PWW = 114;
      const PHH = 320;
      const BMH = 100;
      const flY = -EYE_Y;

      const bCY  = flY + WBH / 2;
      const pCY  = flY + WBH + PHH / 2;
      const bmCY = flY + WBH + PHH + BMH / 2;

      const wTex = (w, h, seed) => {
        const rows  = Math.max(1, Math.round(h / U_WALL.bh));
        const studs = Math.max(1, Math.round(w / U_WALL.stud));
        const b = packBricks(studs, rows, BRICK_TYPES_WALL, wallBrickColor, wallStudColor, seed, U_WALL);
        return makeTex(w, h, c => drawBricksOnCanvas(c, b, '#28323d', U_WALL), 256);
      };

      const tWide  = wTex(WO,  WBH, 501);
      const tInn   = wTex(INN, WBH, 502);
      const tEdge  = wTex(WWT, WBH, 503);
      const tPost  = wTex(PWW, PHH, 504);
      const tBeam  = wTex(WO,  BMH, 505);
      const tBeamE = wTex(BMH, BMH, 506);

      const mTop  = new THREE.MeshLambertMaterial({ color: C_TOP, side: THREE.DoubleSide });
      const mBot  = new THREE.MeshLambertMaterial({ color: 0x141c24 });
      const mDark = new THREE.MeshLambertMaterial({ color: 0x283440 });
      const mk    = t => new THREE.MeshLambertMaterial({ map: t });

      // BoxGeometry face order: [+X, -X, +Y(top), -Y(bot), +Z(south/vers cam), -Z(north)]
      // Caméra en z positif regardant vers -Z.
      // Face "vers caméra" = +Z = idx 4 sur TOUS les murs (nord comme sud).
      // Face "intérieure" = -Z = idx 5 pour N/S, +X/−X inner pour E/O.
      const addW = (geo, mats, x, y, z) => {
        const m = new THREE.Mesh(geo, mats); m.position.set(x, y, z); scene.add(m);
      };

      // Mur Nord (z négatif) — face extérieure = +Z (idx 4)
      addW(new THREE.BoxGeometry(WO, WBH, WWT),
        [mk(tEdge), mk(tEdge), mTop, mBot, mk(tWide), mDark],
        0, bCY, -(WO/2 - WWT/2));

      // Mur Sud (z positif) — face extérieure = +Z (idx 4) aussi (face qui regarde vers caméra)
      addW(new THREE.BoxGeometry(WO, WBH, WWT),
        [mk(tEdge), mk(tEdge), mTop, mBot, mk(tWide), mDark],
        0, bCY, +(WO/2 - WWT/2));

      // Mur Ouest (x négatif) — face extérieure = -X (idx 1), intérieure = +X (idx 0)
      addW(new THREE.BoxGeometry(WWT, WBH, INN),
        [mDark, mk(tInn), mTop, mBot, mk(tEdge), mk(tEdge)],
        -(WO/2 - WWT/2), bCY, 0);

      // Mur Est (x positif) — face extérieure = +X (idx 0), intérieure = -X (idx 1)
      addW(new THREE.BoxGeometry(WWT, WBH, INN),
        [mk(tInn), mDark, mTop, mBot, mk(tEdge), mk(tEdge)],
        +(WO/2 - WWT/2), bCY, 0);

      // Montants — toutes faces texturées comme une tour
      const pMats = [mk(tPost), mk(tPost), mTop, mBot, mk(tPost), mk(tPost)];
      [-1, 1].forEach(s => addW(new THREE.BoxGeometry(PWW, PHH, PWW), pMats,
        s * (WO/2 - PWW/2), pCY, 0));

      // Poutre
      addW(new THREE.BoxGeometry(WO, BMH, BMH),
        [mk(tBeamE), mk(tBeamE), mTop, mBot, mk(tBeam), mk(tBeam)],
        0, bmCY, 0);

      // ── Fond sombre du puits (trou noir) ──
      const wellBottom = new THREE.Mesh(
        new THREE.BoxGeometry(INN-10, 60, INN-10),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      wellBottom.position.set(0, flY - 30, 0);
      scene.add(wellBottom);
    }

    // ── Tours (BoxGeometry carré T×T) ──
    // Les deux faces intérieures de chaque tour reçoivent la texture de briques.
    // Face intérieure X : sx>0 → face -X (idx 1), sx<0 → face +X (idx 0)
    // Face intérieure Z : sz>0 → face -Z (idx 5), sz<0 → face +Z (idx 4)
    const D = WALL_DIST, T = TOWER_W_PX;
    [
      [+1, -1, TOWER_DATA_NE],
      [-1, -1, TOWER_DATA_NW],
      [+1, +1, TOWER_DATA_SE],
      [-1, +1, TOWER_DATA_SW],
    ].forEach(([sx, sz, data]) => {
      const brickTex = makeTex(T, TOWER_H_PX, c => drawBricksOnCanvas(c, data, '#28323d', U_WALL));
      const brickXIdx = sx > 0 ? 1 : 0;
      const brickZIdx = sz > 0 ? 5 : 4;
      // Toutes les faces latérales de la tour = brique (pas seulement les 2 faces intérieures)
      const cx = sx * (D - T/2);
      const cz = sz * (D - T/2);
      addBox(T, tH, T, brickTex, brickZIdx, cx, tCY, cz, 0, brickXIdx, brickTex);

      // Merlons de tour en 3D — épaisseur réduite pour éviter le chevauchement aux coins
      const tMerlonTopY = -EYE_Y + TOWER_H_PX + MERLON_H_PX / 2;
      const TMD = Math.round(T / 4);  // épaisseur tour ≈ T/3 au lieu de MD=700
      const mgeoT = new THREE.BoxGeometry(MERLON_W_PX, MERLON_H_PX, TMD);
      const nTM = Math.floor((T + CRENEL_W_PX) / (MERLON_W_PX + CRENEL_W_PX));
      const tAlong = i => -T / 2 + MERLON_W_PX / 2 + i * (MERLON_W_PX + CRENEL_W_PX);
      // Face frontale (parallèle aux murs E/O)
      const fX = sx*(D - T/2), fZ = sz*(D - T);
      const fFacing = sz < 0 ? 'N' : 'S';
      for (let i = 0; i < nTM; i++) {
        const m = new THREE.Mesh(mgeoT, mmats);
        if (fFacing === 'N') { m.position.set(fX + tAlong(i), tMerlonTopY, fZ - TMD/2); }
        else                  { m.position.set(fX + tAlong(i), tMerlonTopY, fZ + TMD/2); m.rotation.y = Math.PI; }
        scene.add(m);
      }
      // Face latérale (parallèle aux murs N/S)
      const sX = sx*(D - T), sZ = sz*(D - T/2);
      const sFacing = sx > 0 ? 'E' : 'W';
      for (let i = 0; i < nTM; i++) {
        const m = new THREE.Mesh(mgeoT, mmats);
        if (sFacing === 'E') { m.position.set(sX + TMD/2, tMerlonTopY, sZ + tAlong(i)); m.rotation.y = -Math.PI/2; }
        else                  { m.position.set(sX - TMD/2, tMerlonTopY, sZ + tAlong(i)); m.rotation.y =  Math.PI/2; }
        scene.add(m);
      }
    });

    // ── Stands de marchand médiéval (9 stands, 3 par mur N/E/O) ──
    {
      const flY = -EYE_Y;

      const dk = (hex, f) => {
        const r = Math.min(255, Math.round(((hex >> 16) & 0xFF) * f));
        const g = Math.min(255, Math.round(((hex >>  8) & 0xFF) * f));
        const b = Math.min(255, Math.round(( hex        & 0xFF) * f));
        return (r << 16) | (g << 8) | b;
      };

      const mW  = new THREE.MeshLambertMaterial({ color: 0x6b3c18 });
      const mWT = new THREE.MeshLambertMaterial({ color: 0x8a5228 });
      const mWB = new THREE.MeshLambertMaterial({ color: 0x3a1e0a });
      const WM  = [mW, mW, mWT, mWB, mW, mW];

      // role = personnage médiéval, phrases = accroches qui tournent toutes les 1-3 min
      const DEFS = [
        { color: 0x992222, subject: 'moi',              role: 'Forgeron',
          phrases: ["Le forgeron a fui... ses objets enchantés restent !", "On dit qu'il forgeait le code comme l'acier.", "Ses créations dorment sous un sortilège — révèle-les !"] },
        { color: 0x1a4499, subject: 'mes compétences',  role: 'Moine',
          phrases: ["Le moine s'est évanoui dans la brume...", "Ses parchemins de sagesse sont enchantés, inutiles sans la Poudre.", "Il murmurait : 'Le savoir résiste à toute magie.'"] },
        { color: 0x1a6622, subject: 'mes projets',      role: 'Artisan',
          phrases: ["L'artisan a disparu du jour au lendemain...", "Ses œuvres sont figées sous l'enchantement du Sorcier.", "Brise le sort pour découvrir ce qu'il a bâti !"] },
        { color: 0x886600, subject: 'ma formation',     role: 'Paysan',
          phrases: ["Le paysan a abandonné ses récoltes cette nuit-là...", "Ses diplômes et ses graines sont sous le sortilège.", "La terre se souvient de ce qu'il a semé."] },
        { color: 0x661888, subject: 'mes expériences',  role: 'Boucher',
          phrases: ["Le boucher a pris la fuite à l'aube...", "Ses années de métier sont scellées dans des parchemins enchantés.", "Découpe le sort pour révéler son vécu !"] },
        { color: 0x147788, subject: 'mes intérêts',     role: 'Poissonnier',
          phrases: ["Le poissonnier a levé les voiles au petit matin...", "Ses passions sont figées sous l'enchantement du Sorcier.", "Pêche les parchemins pour découvrir ce qui l'animait !"] },
        { color: 0x993300, subject: 'me contacter',     role: 'Boulanger',
          phrases: ["Le boulanger a éteint son four cette nuit-là...", "Son adresse est quelque part dans ces objets enchantés.", "Brise le sort — peut-être qu'il répondra encore !"] },
        { color: 0x887700, subject: 'mes réalisations', role: 'Tavernier',
          phrases: ["La taverne est vide depuis l'arrivée du Sorcier...", "Les meilleures créations du tavernier dorment ici.", "Réveille-les avec la Poudre Révélatrice !"] },
        { color: 0x445566, subject: 'ma boutique',      role: 'Sorcier',
          phrases: ["C'est moi qui ai enchanté tout ça... intéressant, non ?", "La Poudre Révélatrice ? Je l'ai. Elle a un prix.", "Les marchands ont fui. Leurs secrets m'appartiennent désormais !"] },
      ];

      // ── Fonctions couleurs briques bois (brown warm) ──
      const WOOD_L = [30, 34, 38, 36, 42, 28, 44, 32, 37];
      const woodBC = r => { const i=Math.floor(r()*WOOD_L.length); return `hsl(26,${48+(i%6)}%,${WOOD_L[i]}%)`; };
      const woodSC = r => { const i=Math.floor(r()*WOOD_L.length); return `hsl(26,${48+(i%6)}%,${Math.min(60,WOOD_L[i]+13)}%)`; };
      const wtex = (w, h, seed) => {
        const b = packBricks(Math.max(1,Math.round(w/U_WALL.stud)), Math.max(1,Math.round(h/U_WALL.bh)),
          BRICK_TYPES_WALL, woodBC, woodSC, seed, U_WALL);
        return makeTex(w, h, c => drawBricksOnCanvas(c, b, '#1e0c04', U_WALL), 256);
      };
      // Briques colorées (auvent + panneau arrière, teinte issue du cHex du stand)
      const ctex = (w, h, seed, hex) => {
        const r0=(hex>>16)&0xFF, g0=(hex>>8)&0xFF, b0=hex&0xFF;
        const V = [-14,-7,0,7,3,-10,5,-3,9];
        const cFn = rng => { const i=Math.floor(rng()*V.length);
          return `rgb(${Math.min(255,Math.max(0,r0+V[i]))},${Math.min(255,Math.max(0,g0+V[i]))},${Math.min(255,Math.max(0,b0+V[i]))})`; };
        const sFn = rng => { const i=Math.floor(rng()*V.length);
          return `rgb(${Math.min(255,r0+34+V[i])},${Math.min(255,g0+34+V[i])},${Math.min(255,b0+34+V[i])})`; };
        const bricks = packBricks(Math.max(1,Math.round(w/U_WALL.stud)), Math.max(1,Math.round(h/U_WALL.bh)),
          BRICK_TYPES_WALL, cFn, sFn, seed, U_WALL);
        return makeTex(w, h, c => drawBricksOnCanvas(c, bricks,
          `rgb(${Math.max(0,r0-60)},${Math.max(0,g0-60)},${Math.max(0,b0-60)})`, U_WALL), 256);
      };

      // ── Pancarte bois/parchemin affichée sur le stand (canvas 2× pour netteté) ──
      const makeSign = (role, subject, isWIP) => {
        const W = 1400, H = 460, SCALE = 2;
        const cv = document.createElement('canvas');
        cv.width = W * SCALE; cv.height = H * SCALE;
        const ctx = cv.getContext('2d');
        ctx.scale(SCALE, SCALE);
        ctx.fillStyle = '#7a4c18';
        ctx.beginPath(); ctx.roundRect(10, 10, W-20, H-20, 16); ctx.fill();
        ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 20;
        ctx.beginPath(); ctx.roundRect(10, 10, W-20, H-20, 16); ctx.stroke();
        ctx.fillStyle = '#f0d98a';
        ctx.beginPath(); ctx.roundRect(44, 44, W-88, H-88, 12); ctx.fill();
        ctx.strokeStyle = '#5a3810'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.roundRect(44, 44, W-88, H-88, 12); ctx.stroke();
        ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        if (!isWIP) {
          ctx.font = 'bold 148px Georgia, serif';
          ctx.strokeStyle = 'rgb(0, 0, 0, 0.85)'; ctx.lineWidth = 10;
          ctx.strokeText(role, W/2, 194);
          ctx.fillStyle = '#000000'; ctx.fillText(role, W/2, 194);
          ctx.strokeStyle = '#7a4c18'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(W*.12, 228); ctx.lineTo(W*.88, 228); ctx.stroke();
          ctx.font = 'bold 98px Georgia, serif';
          ctx.strokeStyle = 'rgb(0, 0, 0, 0.80)'; ctx.lineWidth = 7;
          ctx.strokeText(subject, W/2, 360);
          ctx.fillStyle = '#000000'; ctx.fillText(subject, W/2, 360);
        } else {
          ctx.font = 'bold 120px Georgia, serif';
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 8;
          ctx.strokeText(role, W/2, 192);
          ctx.fillStyle = '#000000'; ctx.fillText(role, W/2, 192);
          ctx.font = '80px Georgia, serif'; ctx.fillStyle = '#000000';
          ctx.fillText('Bientôt...', W/2, 340);
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return new THREE.Mesh(
          new THREE.PlaneGeometry(900, 296),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide, depthWrite: false })
        );
      };

      const makeBubbleTex = (phrase, isWIP) => {
        const W = 1600, H = 640, SCALE = 2, bubH = H - 112;
        const fnt = isWIP ? 'italic 96px Verdana, sans-serif' : 'bold 112px Verdana, sans-serif';
        const tmpCtx = document.createElement('canvas').getContext('2d');
        tmpCtx.font = fnt;
        const words = phrase.split(' ');
        const lines = []; let cur = '';
        for (const w of words) {
          const t = cur ? `${cur} ${w}` : w;
          if (tmpCtx.measureText(t).width > W - 128 && cur) { lines.push(cur); cur = w; }
          else cur = t;
        }
        if (cur) lines.push(cur);
        const cv = document.createElement('canvas');
        cv.width = W * SCALE; cv.height = H * SCALE;
        const ctx = cv.getContext('2d');
        ctx.scale(SCALE, SCALE);
        const tx = W / 2, tw = 56;
        ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.roundRect(16, 16, W-32, bubH-16, 32); ctx.fill(); ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#fff';
        ctx.fillRect(tx-tw-8, bubH-28, (tw+8)*2, 32);
        ctx.beginPath();
        ctx.moveTo(tx-tw, bubH-16); ctx.lineTo(tx, H-16); ctx.lineTo(tx+tw, bubH-16);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 14; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(tx-tw, bubH-16); ctx.lineTo(tx, H-16); ctx.lineTo(tx+tw, bubH-16);
        ctx.stroke();
        const lineH = 124;
        const totalH = lines.length * lineH;
        const startY = (bubH - 32 - totalH) / 2 + 32 + lineH * 0.82;
        ctx.textAlign = 'center'; ctx.font = fnt; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 10;
        lines.forEach((l, i) => ctx.strokeText(l, W/2, startY + i * lineH));
        ctx.fillStyle = isWIP ? '#444' : '#111';
        lines.forEach((l, i) => ctx.fillText(l, W/2, startY + i * lineH));
        const tex = new THREE.CanvasTexture(cv);
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
      };

      const makeSpeechBubble = (phrase, isWIP) => {
        const tex = makeBubbleTex(phrase, isWIP);
        return new THREE.Mesh(
          new THREE.PlaneGeometry(960, 384),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
        );
      };

// ── Dimensions (3 stands par mur) ──
      const SW  = Math.round((WALL_W - 260 - 400) / 3);  // ≈ 1788
      const SC  = WALL_DIST - TOWER_W_PX - 130 - SW/2;   // ≈ 1988
      const SD  = 640;   // profondeur avant→arrière
      const LW  = 80;    // section des poteaux
      const LH  = 1280;  // hauteur poteaux arrière
      const LHF = 1040;  // hauteur poteaux avant (toit incliné)
      const CH  = 480;   // hauteur comptoir
      const CT  = 64;    // épaisseur plateau
      const CD  = Math.round(SD * 0.55); // profondeur comptoir (ne va pas de poteau à poteau)

      // ── Textures bois partagées (calculées une fois pour tous les stands) ──
      const mWTop2 = new THREE.MeshLambertMaterial({ color: C_TOP, side: THREE.DoubleSide });
      const mWBot2 = new THREE.MeshLambertMaterial({ color: 0x141c24 });
      const mk2    = t => new THREE.MeshLambertMaterial({ map: t });

      const tPostB  = wtex(LW, LH,  601);
      const tPostF  = wtex(LW, LHF, 602);
      const tCtrTop = wtex(SW, SD,  604);
      const tCtrFrt = wtex(SW, CT,  605);
      const tCtrSd  = wtex(SD, CT,  606);
      const tBar    = wtex(SW, Math.round(LW*.6), 607);
      const tLatte  = wtex(SW, Math.round(CH-LW*.5), 608);

      // [+X, -X, +Y(top), -Y(bot), +Z(front), -Z(back)]
      const postBMats = [mk2(tPostB),mk2(tPostB), mWTop2, mWBot2, mk2(tPostB),mk2(tPostB)];
      const postFMats = [mk2(tPostF),mk2(tPostF), mWTop2, mWBot2, mk2(tPostF),mk2(tPostF)];
      const ctrMats   = [mk2(tCtrSd),mk2(tCtrSd), mk2(tCtrTop), mWBot2, mk2(tCtrFrt),mk2(tCtrFrt)];
      const barMats   = [mk2(wtex(Math.round(LW*.6),Math.round(LW*.6),609)),mk2(wtex(Math.round(LW*.6),Math.round(LW*.6),609)), mWTop2, mWBot2, mk2(tBar),mk2(tBar)];

      // ── Vrais objets 3D lisibles (bouclier, parchemin, planche, livre…) ───────
      // Crée le canvas du contenu et renvoie la texture Three.js
      const makeBoardTex = (CW, CH2, boardType, title, contentLines, sideHex) => {
        const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH2;
        const ctx = cv.getContext('2d');
        const P = Math.round(CW * 0.07);

        // Fond
        switch (boardType) {
          case 'shield': {
            const g = ctx.createLinearGradient(0,0,CW,CH2);
            g.addColorStop(0,'#8a98b0'); g.addColorStop(0.5,'#5a6878'); g.addColorStop(1,'#38485a');
            ctx.fillStyle=g; ctx.fillRect(0,0,CW,CH2);
            const r=(sideHex>>16)&0xFF, gv=(sideHex>>8)&0xFF, b=sideHex&0xFF;
            ctx.fillStyle=`rgba(${r},${gv},${b},0.28)`;
            ctx.fillRect(CW/2-45,P,90,CH2*0.68-P*2);
            ctx.fillRect(P,CH2*0.32-45,CW-P*2,90);
            ctx.strokeStyle='#d4a030'; ctx.lineWidth=28; ctx.strokeRect(16,16,CW-32,CH2*0.64-16);
            ctx.lineWidth=9; ctx.strokeRect(38,38,CW-76,CH2*0.62-38);
            break;
          }
          case 'parchment': {
            ctx.fillStyle='#f5e9c0'; ctx.fillRect(0,0,CW,CH2);
            const eg=ctx.createRadialGradient(CW/2,CH2/2,CH2*.22,CW/2,CH2/2,CH2*.72);
            eg.addColorStop(0,'rgba(0,0,0,0)'); eg.addColorStop(1,'rgba(100,60,20,0.38)');
            ctx.fillStyle=eg; ctx.fillRect(0,0,CW,CH2);
            ctx.strokeStyle='#8b5e3c'; ctx.lineWidth=16; ctx.strokeRect(22,22,CW-44,CH2-44);
            break;
          }
          case 'wood': {
            ctx.fillStyle='#9a6438'; ctx.fillRect(0,0,CW,CH2);
            ctx.strokeStyle='rgba(0,0,0,0.14)'; ctx.lineWidth=5;
            for(let y=0;y<CH2;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(CW*.3,y+9,CW*.7,y-7,CW,y+4);ctx.stroke();}
            ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=16; ctx.strokeRect(8,8,CW-16,CH2-16); break;
          }
          case 'dark_wood': {
            ctx.fillStyle='#3a1e08'; ctx.fillRect(0,0,CW,CH2);
            ctx.strokeStyle='rgba(150,80,20,0.2)'; ctx.lineWidth=5;
            for(let y=0;y<CH2;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(CW*.4,y+6,CW*.7,y-4,CW,y+3);ctx.stroke();}
            ctx.strokeStyle='rgba(200,150,80,0.5)'; ctx.lineWidth=13; ctx.strokeRect(8,8,CW-16,CH2-16); break;
          }
          case 'slate': {
            ctx.fillStyle='#222'; ctx.fillRect(0,0,CW,CH2);
            ctx.strokeStyle='rgba(230,230,210,0.6)'; ctx.lineWidth=13;
            ctx.setLineDash([24,15]); ctx.strokeRect(12,12,CW-24,CH2-24); ctx.setLineDash([]); break;
          }
          case 'warm_wood': {
            ctx.fillStyle='#c89860'; ctx.fillRect(0,0,CW,CH2);
            ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=5;
            for(let y=0;y<CH2;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(CW*.35,y+8,CW*.65,y-5,CW,y+3);ctx.stroke();}
            ctx.strokeStyle='#7a4820'; ctx.lineWidth=18; ctx.strokeRect(8,8,CW-16,CH2-16); break;
          }
          case 'tavern': {
            ctx.fillStyle='#180e04'; ctx.fillRect(0,0,CW,CH2);
            ctx.strokeStyle='rgba(120,60,10,0.25)'; ctx.lineWidth=5;
            for(let y=0;y<CH2;y+=36){ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(CW*.3,y+5,CW*.7,y-3,CW,y+2);ctx.stroke();}
            ctx.strokeStyle='#c89820'; ctx.lineWidth=20; ctx.strokeRect(10,10,CW-20,CH2-20);
            ctx.lineWidth=6; ctx.strokeRect(30,30,CW-60,CH2-60); break;
          }
          default: { // grimoire
            const gg=ctx.createRadialGradient(CW/2,0,0,CW/2,CH2/2,CH2*.8);
            gg.addColorStop(0,'#3a1060'); gg.addColorStop(0.6,'#1a0830'); gg.addColorStop(1,'#0a0418');
            ctx.fillStyle=gg; ctx.fillRect(0,0,CW,CH2);
            ctx.fillStyle='rgba(180,80,255,0.12)'; ctx.fillRect(0,0,CW*0.1,CH2);
            ctx.strokeStyle='rgba(180,80,255,0.5)'; ctx.lineWidth=11; ctx.strokeRect(12,12,CW-24,CH2-24);
          }
        }

        // Couleurs texte
        const TC={shield:'#d8e8f8',parchment:'#1e0800',wood:'#ffe8a0',dark_wood:'#f0c870',
                  slate:'#f0f0e0',warm_wood:'#1e0800',tavern:'#d4a820',grimoire:'#d870f0'};
        const BC={shield:'#b0c8dc',parchment:'#3a1c06',wood:'#ffd060',dark_wood:'#c8a040',
                  slate:'#c8c8b8',warm_wood:'#3a1c06',tavern:'#a07810',grimoire:'#a850c8'};
        const tC=TC[boardType]??'#fff', bC=BC[boardType]??'#ddd';

        // Pour le bouclier, contenu dans les 70% supérieurs du canvas
        const yTop    = boardType === 'shield' ? 0 : 0;
        const yScale  = boardType === 'shield' ? 0.68 : 1.0;
        const CH_eff  = CH2 * yScale;

        const tSz = Math.round(CW * 0.092);
        const bSz = Math.round(CW * 0.052); // plus petit pour éviter le débordement
        const lH  = Math.round(CH_eff * 0.105);
        const tY  = yTop + Math.round(CH_eff * 0.17);
        const bY0 = yTop + Math.round(CH_eff * 0.31);
        const maxW = CW - P * 2 - 20;

        // Word-wrap : coupe les lignes trop longues
        const wrapLine = (text) => {
          const words = text.split(' ');
          const lines = []; let cur = '';
          ctx.font = `${bSz}px Georgia,serif`;
          for (const w of words) {
            const t = cur ? `${cur} ${w}` : w;
            if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
            else cur = t;
          }
          if (cur) lines.push(cur);
          return lines;
        };

        ctx.textAlign='center'; ctx.lineJoin='round';
        ctx.font=`bold ${tSz}px Georgia,serif`;
        ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=Math.round(tSz*0.14);
        ctx.strokeText(title,CW/2,tY);
        ctx.fillStyle=tC; ctx.fillText(title,CW/2,tY);
        ctx.strokeStyle=bC+'88'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(P+20,tY+20); ctx.lineTo(CW-P-20,tY+20); ctx.stroke();
        ctx.font=`${bSz}px Georgia,serif`;
        let curY = bY0;
        contentLines.forEach(line => {
          wrapLine(line).forEach(wl => {
            ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=Math.round(bSz*0.1);
            ctx.strokeText(wl,CW/2,curY);
            ctx.fillStyle=bC; ctx.fillText(wl,CW/2,curY);
            curY += lH;
          });
          curY += lH * 0.25; // espacement entre items
        });

        const tex = new THREE.CanvasTexture(cv);
        tex.generateMipmaps=false; tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter;
        tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
        return tex;
      };

      const makeItemBoard = (boardType, title, contentLines, sideHex, links = []) => {
        const grp = new THREE.Group();
        const lm = c => new THREE.MeshLambertMaterial({ color: c });
        const bm = map => new THREE.MeshBasicMaterial({ map });

        switch (boardType) {

          // ── BOUCLIER ───────────────────────────────────────────────────────
          case 'shield': {
            const CW=600, CH2=860;
            const tex = makeBoardTex(CW, CH2, boardType, title, contentLines, sideHex);
            // Forme du bouclier (Y up, bounding box 120×200)
            const shieldShape = new THREE.Shape();
            shieldShape.moveTo(-60, 100); shieldShape.lineTo(60, 100);
            shieldShape.lineTo(60, -20);  shieldShape.lineTo(0, -100);
            shieldShape.lineTo(-60, -20); shieldShape.closePath();
            // Face avant avec texture
            const faceGeo = new THREE.ShapeGeometry(shieldShape);
            grp.add(new THREE.Mesh(faceGeo, bm(tex)));
            // Corps extrudé derrière (sans texture)
            const bodyGeo = new THREE.ExtrudeGeometry(shieldShape, { depth:16, bevelEnabled:false });
            const bodyMesh = new THREE.Mesh(bodyGeo, [lm(0x4a5870), lm(0x3a4560)]);
            bodyMesh.position.z = -16;
            grp.add(bodyMesh);
            // Bossette centrale dorée
            const bosseGeo = new THREE.CylinderGeometry(12, 14, 10, 8);
            const bosse = new THREE.Mesh(bosseGeo, lm(0xd4a030));
            bosse.rotation.x = Math.PI/2; bosse.position.z = 2;
            grp.add(bosse);
            break;
          }

          // ── PARCHEMIN (SCROLL) ────────────────────────────────────────────
          case 'parchment': {
            const CW = 680, DISP_H = 840;
            const P   = Math.round(CW * 0.07);
            const tSz = Math.round(CW * 0.092);
            const bSz = Math.round(CW * 0.052);
            const LINE_H = Math.round(DISP_H * 0.105);

            // Canvas virtuel : titre + contenu + espace de défilement en bas
            const titleBottom = Math.round(DISP_H * 0.17) + tSz + 30;
            let estH = titleBottom;
            contentLines.forEach(l => {
              const tmpC = document.createElement('canvas').getContext('2d');
              tmpC.font = `${bSz}px Georgia,serif`;
              const wraps = Math.ceil(tmpC.measureText(l).width / (CW - P*2 - 44));
              estH += Math.max(1, wraps) * LINE_H + Math.round(LINE_H * 0.25);
            });
            const VIRT_H   = Math.max(DISP_H + 300, estH + 300);
            const MAX_SCROLL = VIRT_H - DISP_H;

            const vCv = document.createElement('canvas');
            vCv.width = CW; vCv.height = VIRT_H;
            const vCtx = vCv.getContext('2d');

            // Fond parchemin
            vCtx.fillStyle = '#f5e9c0';
            vCtx.fillRect(0, 0, CW, VIRT_H);
            const eg2 = vCtx.createRadialGradient(CW/2, VIRT_H/2, VIRT_H*.14, CW/2, VIRT_H/2, VIRT_H*.72);
            eg2.addColorStop(0, 'rgba(0,0,0,0)');
            eg2.addColorStop(1, 'rgba(100,60,20,0.36)');
            vCtx.fillStyle = eg2; vCtx.fillRect(0, 0, CW, VIRT_H);
            vCtx.strokeStyle = '#8b5e3c'; vCtx.lineWidth = 16;
            vCtx.strokeRect(22, 22, CW-44, VIRT_H-44);

            // Titre — auto-fit pour éviter le dépassement
            const tY = Math.round(DISP_H * 0.17);
            vCtx.textAlign = 'center'; vCtx.lineJoin = 'round';
            let tSzFit = tSz;
            vCtx.font = `bold ${tSzFit}px Georgia,serif`;
            while (vCtx.measureText(title).width > CW - P*2 - 24 && tSzFit > 16) {
              tSzFit -= 2;
              vCtx.font = `bold ${tSzFit}px Georgia,serif`;
            }
            vCtx.strokeStyle = 'rgba(0,0,0,0.55)'; vCtx.lineWidth = Math.round(tSzFit*0.14);
            vCtx.strokeText(title, CW/2, tY);
            vCtx.fillStyle = '#1e0800'; vCtx.fillText(title, CW/2, tY);
            vCtx.strokeStyle = '#8b5e3c88'; vCtx.lineWidth = 3;
            vCtx.beginPath(); vCtx.moveTo(P+20, tY+20); vCtx.lineTo(CW-P-20, tY+20); vCtx.stroke();

            // Contenu — aligné à gauche pour une meilleure lisibilité du texte en prose
            vCtx.textAlign = 'left';
            vCtx.font = `${bSz}px Georgia,serif`;
            const maxW  = CW - P*2 - 44;
            const leftX = P + 22;
            let curY = Math.round(DISP_H * 0.31);
            contentLines.forEach(line => {
              const words = line.split(' ');
              const wrapped = []; let cur = '';
              for (const w of words) {
                const t = cur ? `${cur} ${w}` : w;
                if (vCtx.measureText(t).width > maxW && cur) { wrapped.push(cur); cur = w; }
                else cur = t;
              }
              if (cur) wrapped.push(cur);
              wrapped.forEach(wl => {
                vCtx.strokeStyle = 'rgba(0,0,0,0.4)'; vCtx.lineWidth = Math.round(bSz*0.1);
                vCtx.strokeText(wl, leftX, curY);
                vCtx.fillStyle = '#3a1c06'; vCtx.fillText(wl, leftX, curY);
                curY += LINE_H;
              });
              curY += Math.round(LINE_H * 0.25);
            });

            // Liens cliquables — dessinés comme de l'encre bleue soulignée
            const linkAreas = [];
            if (links.length > 0) {
              curY += Math.round(LINE_H * 0.4);
              vCtx.strokeStyle = '#5a3a1880'; vCtx.lineWidth = 1;
              vCtx.beginPath(); vCtx.moveTo(leftX, curY - LINE_H*0.15); vCtx.lineTo(CW - leftX, curY - LINE_H*0.15); vCtx.stroke();
              curY += Math.round(LINE_H * 0.3);
              vCtx.font = `${bSz}px Georgia,serif`;
              links.forEach(lk => {
                const txt = '→ ' + lk.label;
                const tw  = vCtx.measureText(txt).width;
                // Ombre légère
                vCtx.strokeStyle = 'rgba(0,0,0,0.25)'; vCtx.lineWidth = Math.round(bSz*0.08);
                vCtx.strokeText(txt, leftX, curY);
                // Texte encre bleue foncée
                vCtx.fillStyle = '#1a3860'; vCtx.fillText(txt, leftX, curY);
                // Soulignement
                vCtx.strokeStyle = '#1a3860'; vCtx.lineWidth = 1.5;
                vCtx.beginPath(); vCtx.moveTo(leftX, curY + 4); vCtx.lineTo(leftX + tw, curY + 4); vCtx.stroke();
                // Stocker la zone cliquable en coordonnées canvas virtuel
                linkAreas.push({ x1: leftX, y1: curY - bSz, x2: leftX + tw, y2: curY + 8, url: lk.url, download: lk.download ?? null });
                curY += LINE_H;
              });
              grp.userData.linkAreas = linkAreas;
            }

            // Canvas d'affichage (fenêtre visible = même taille qu'avant)
            const dCv = document.createElement('canvas');
            dCv.width = CW; dCv.height = DISP_H;
            const dCtx = dCv.getContext('2d');
            dCtx.drawImage(vCv, 0, 0, CW, DISP_H, 0, 0, CW, DISP_H);

            const tex = new THREE.CanvasTexture(dCv);
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

            const planeMesh = new THREE.Mesh(
              new THREE.PlaneGeometry(136, 168),
              new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
            );
            planeMesh.userData.isParchmentPlane = true;
            planeMesh.userData.CW = CW; planeMesh.userData.DISP_H = DISP_H;
            grp.add(planeMesh);

            // Rouleaux haut et bas
            const rollerMat = lm(0xa07040);
            const capMat    = lm(0x6b3c18);
            const rollerGeo = new THREE.CylinderGeometry(10, 10, 156, 14);
            const capGeo    = new THREE.CylinderGeometry(11, 11, 10, 14);

            const topR = new THREE.Mesh(rollerGeo, rollerMat);
            topR.rotation.z = Math.PI/2; topR.position.set(0, -84, 6);
            grp.add(topR);
            [-77, 77].forEach(x => {
              const c = new THREE.Mesh(capGeo, capMat);
              c.rotation.z = Math.PI/2; c.position.set(x, -84, 6);
              grp.add(c);
            });

            const botR = new THREE.Mesh(rollerGeo, rollerMat);
            botR.rotation.z = Math.PI/2; botR.position.set(0, 84, 6);
            grp.add(botR);
            [-77, 77].forEach(x => {
              const c = new THREE.Mesh(capGeo, capMat);
              c.rotation.z = Math.PI/2; c.position.set(x, 84, 6);
              grp.add(c);
            });

            // Données de défilement accessibles depuis le handler molette
            grp.userData.scrollData = {
              vCv, dCv, tex, CW, DISP_H,
              maxScroll: MAX_SCROLL,
              scrollOffset: 0,
              topRoller: topR,
              botRoller: botR,
            };
            break;
          }

          // ── GRIMOIRE ──────────────────────────────────────────────────────
          case 'grimoire': {
            const bW=115, bH=185, bD=28;
            const CW=575, CH2=925;
            const tex = makeBoardTex(CW, CH2, boardType, title, contentLines, sideHex);
            // Couverture
            grp.add(new THREE.Mesh(
              new THREE.BoxGeometry(bW, bH, bD),
              [lm(0x1a0830),lm(0x1a0830),lm(0x0a0418),lm(0x0a0418),bm(tex),lm(0x0a0418)]
            ));
            // Reliure (tranche)
            const spineMesh = new THREE.Mesh(
              new THREE.BoxGeometry(16, bH+4, bD+8),
              lm(0x240840)
            );
            spineMesh.position.x = -bW/2 - 5;
            grp.add(spineMesh);
            // Bossettes de fermoir
            [[-bW/2+8, 30],[-bW/2+8, -30]].forEach(([x,y]) => {
              const gem = new THREE.Mesh(new THREE.BoxGeometry(10,10,bD+10), lm(0x8020e0));
              gem.position.set(x,y,0); grp.add(gem);
            });
            break;
          }

          // ── PLANCHES, ARDOISE, ENSEIGNE (rectangulaires — c'est normal) ─
          default: {
            const SIZES = {
              wood:      [196,136,22, 0x6b3c18], dark_wood: [196,136,22, 0x2a1008],
              slate:     [165,155,24, 0x383838], warm_wood:  [190,136,20, 0x8b5e3c],
              tavern:    [200,130,26, 0x0e0804],
            };
            const [bW,bH,bD,sc] = SIZES[boardType] ?? [170,140,20,0x6b3c18];
            const CW = bW*5, CH2 = bH*5;
            const tex = makeBoardTex(CW, CH2, boardType, title, contentLines, sideHex);
            grp.add(new THREE.Mesh(
              new THREE.BoxGeometry(bW,bH,bD),
              [lm(sc),lm(sc),lm(Math.round(sc*.8)),lm(Math.round(sc*.6)),bm(tex),lm(Math.round(sc*.5))]
            ));
            // Pour la taverne : crochets de suspension simulés
            if (boardType === 'tavern') {
              const chainMat = lm(0xd4a030);
              [-70,70].forEach(x => {
                const hook = new THREE.Mesh(new THREE.BoxGeometry(6,36,6), chainMat);
                hook.position.set(x, bH/2+18, 0); grp.add(hook);
                const ring = new THREE.Mesh(new THREE.TorusGeometry(9,3,6,8), chainMat);
                ring.position.set(x, bH/2+38, 0); grp.add(ring);
              });
            }
          }
        }

        return grp;
      };
      // Accessible depuis l'animate loop pour créer le parchemin lazily
      stateRef.current._makeItemBoard = makeItemBoard;

      const makeItem3D = (shape, c1, c2) => {
        const g3 = new THREE.Group();
        const lm  = c => new THREE.MeshLambertMaterial({ color: c });
        const lme = (c, e, i) => new THREE.MeshLambertMaterial({ color: c, emissive: e, emissiveIntensity: i });
        const bx  = (w, h, d) => new THREE.BoxGeometry(w, h, d);
        const add = (w, h, d, x, y, z, col) => {
          const m = new THREE.Mesh(bx(w, h, d), lm(col));
          m.position.set(x, y, z); g3.add(m);
        };
        const addE = (w, h, d, x, y, z, col, em, ei) => {
          const m = new THREE.Mesh(bx(w, h, d), lme(col, em, ei));
          m.position.set(x, y, z); g3.add(m);
        };
        switch (shape) {
          case 'sword':
            add(14, 200, 10,   0,  90,  0, 0xd0d8e0); // lame
            add(10, 200,  6,   0,  90,  0, 0xe8ecf4); // reflet
            add(100, 16, 18,   0,  -8,  0, 0xd4a030); // garde
            add( 96,  8, 12,   0,  -4,  0, 0xffcc40);
            add( 26, 85, 26,   0, -58,  0, 0x6b3c18); // manche
            add( 20,  8, 20,   0, -25,  0, 0xd4a030); // bague
            add( 20,  8, 20,   0, -80,  0, 0xd4a030);
            add( 34, 22, 34,   0,-105,  0, 0xd4a030); // pommeau
            break;
          case 'shield':
            add(148, 168, 28,  0,   0,  0, c1);
            add( 28, 168, 32,  0,   0,  0, c2);
            add(148,  26, 32,  0,   0,  0, c2);
            add( 42,  42, 40,  0,   0,  0, 0xd4a030); // bossette
            add( 26,  10, 40,  0,  82,  0, 0xd4a030); // bord top
            add( 26,  10, 40,  0, -82,  0, 0xd4a030); // bord bot
            break;
          case 'helm':
            add( 94,  72, 86,  0,  26,  0, 0x8a8a9a); // calotte
            add(104,  20, 96,  0,  -8,  0, 0x787888); // bande front
            add( 18,  58, 18,  0, -30,  0, 0x787888); // nasale
            add( 24,  10, 18,-28, -16,-42, 0x222230); // fente visière G
            add( 24,  10, 18, 28, -16,-42, 0x222230); // fente visière D
            add( 14,  48, 14,  0,  64,  0, c1);       // plumet
            add( 10,  30, 10,  0,  90,  0, 0xf0f0f0);
            break;
          case 'book':
            add( 80, 128, 42,  0,   0,  0, 0xf0e8d0); // pages
            add( 86, 134, 10,  0,   0,-22, c1);        // couverture avant
            add( 14, 134, 46,-48,   0,  0, c2);        // dos
            add( 20,  10, 50, 46,   0,  0, 0xd4a030);  // fermoir
            break;
          case 'scroll':
            add(120,  26, 26,  0,   0,  0, 0xf0d98a); // rouleau
            add(120,  52, 18,  0,   0,  0, 0xf0e8c0); // parchemin
            add(128,  20, 20,  0,  30,  0, 0x8b5e3c); // bouchon H
            add(128,  20, 20,  0, -30,  0, 0x8b5e3c); // bouchon B
            break;
          case 'candle':
            add( 58,  12, 58,  0, -50,  0, 0xd4a030); // bougeoir
            add( 28,  92, 28,  0,   0,  0, 0xf2f0e8); // cire
            add( 16,  18, 16, -7,  38,  0, 0xf2f0e8); // coulure
            addE(16,  30, 16,  0,  52,  0, 0xff8800, 0xff4400, 1.0); // flamme
            addE( 8,  20,  8,  0,  68,  0, 0xffdd00, 0xff8800, 1.0); // pointe
            break;
          case 'fish':
            add(152,  72, 58,  0,   0,  0, c1);        // corps
            add( 16,  16, 16, 56,  12,-28, 0xffffff);  // oeil blanc
            add(  8,   8,  8, 56,  12,-34, 0x111111);  // pupille
            add( 30,  64, 16,-88,  -8,  0, c2);        // queue H
            add( 30,  44, 16,-70,  10,  0, c2);        // queue B
            add( 50,  26, 12,  0,  44,  0, c2);        // nageoire
            break;
          case 'loaf':
            add(138,  56, 78,  0, -20,  0, 0x8b5e3c); // base
            add(126,  38, 68,  0,  16,  0, 0xa07040); // dessus
            add(108,  20, 58,  0,  34,  0, 0xb8884c); // croûte
            add(  6,  56, 82,-30,  -8,  0, 0x7a4c18); // incision G
            add(  6,  56, 82, 30,  -8,  0, 0x7a4c18); // incision D
            break;
          case 'baguette':
            add(210,  36, 36,  0,   0,  0, 0xa07040); // corps
            add(190,  26, 26,  0,   4,  0, 0xb8884c); // dessus
            [-70,-30,10,50,90].forEach(x => add(8, 40, 40, x, 0, 0, 0x8b5e3c)); // incisions
            add( 28,  30, 30,-96,  -2,  0, 0x8b5e3c); // bout G
            add( 28,  30, 30, 96,  -2,  0, 0x8b5e3c); // bout D
            break;
          case 'barrel':
            add( 84, 106, 84,  0,   0,  0, 0x6b3c18);
            add( 78, 108, 78,  0,   0,  0, 0x7a4c22); // bois clair
            add( 90,  14, 90,  0,  40,  0, 0x888888); // cercle H
            add( 90,  14, 90,  0, -40,  0, 0x888888); // cercle B
            add( 90,  14, 90,  0,   0,  0, 0x888888); // cercle M
            add( 80,  14, 80,  0,  56,  0, 0x7a4c22); // fond H
            add( 80,  14, 80,  0, -56,  0, 0x7a4c22); // fond B
            break;
          case 'mug':
            add( 64,  88, 64,  0,   0,  0, c1);
            add( 22,  50, 18, 46,   0,  0, c2); // anse milieu
            add( 22,  18, 18, 56,  22,  0, c2); // anse H
            add( 22,  18, 18, 56, -22,  0, c2); // anse B
            add( 68,  16, 68,  0,  50,  0, 0xf0f0f0); // mousse
            add( 54,  20, 54,  0,  60,  0, 0xffffff);
            break;
          case 'potion':
            addE(48,  68, 48,  0, -20,  0, c1, c1, 0.5); // fiole
            add( 22,  34, 22,  0,  28,  0, c2);           // col
            add( 28,  16, 28,  0,  48,  0, 0x8b5e3c);     // bouchon
            addE(52,  70, 52,  0, -20,  0, c1, c1, 0.3);  // lueur
            break;
          case 'star':
            add( 58,  58, 28,  0,   0,  0, 0xffdd00);
            add( 24,  96, 20,  0,   0,  0, 0xffdd00); // branche V
            add( 96,  24, 20,  0,   0,  0, 0xffdd00); // branche H
            add( 22,  22, 22,  48,  48,  0, 0xffaa00); // coins
            add( 22,  22, 22, -48,  48,  0, 0xffaa00);
            add( 22,  22, 22,  48, -48,  0, 0xffaa00);
            add( 22,  22, 22, -48, -48,  0, 0xffaa00);
            break;
          case 'joint':
            add( 92, 112, 68,  0,   0,  0, 0xcc4422); // viande
            add( 78,  98, 56,  0,   0,  0, 0xdd5533);
            add( 18, 158, 18,  0,   0,  0, 0xeeeecc); // os
            add( 40,  18, 40,  0,  80,  0, 0xeeeecc); // bout os H
            add( 40,  18, 40,  0, -80,  0, 0xeeeecc); // bout os B
            break;
          case 'cleaver':
            add(112, 128, 14,  0,  10,  0, 0xc0c8d0); // lame
            add(112,   4, 14,  0, -56,  0, 0xe0e8f0); // tranchant
            add( 28,  88, 28, 54, -80,  0, 0x5a3010); // manche
            add( 24,   6, 24, 54, -36,  0, 0x8b6010); // rivets
            add( 24,   6, 24, 54, -56,  0, 0x8b6010);
            add( 24,   6, 24, 54, -76,  0, 0x8b6010);
            break;
          case 'hammer':
            add( 22, 180, 22,  0, -40,  0, 0x6b3c18); // manche
            add( 78,  48, 48,  0,  60,  0, 0x888888); // tête
            add( 74,  44, 44,  0,  60,  0, 0x9a9a9a);
            add( 28,  44, 50,-36,  60,  0, 0x777777); // panne
            break;
          case 'wheat':
            add( 14, 156, 14,  0,   0,  0, 0xd4a030); // tige
            [-22, 0, 22].forEach((x, i) =>
              add(18, 42, 14, x*1.2, 94, x*0.3, 0xd4a030)); // épillets
            add( 48,  14, 12,-22,  22,  0, 0x4a7030); // feuille G
            add( 48,  14, 12, 22,  52,  0, 0x4a7030); // feuille D
            break;
          case 'jar':
            add( 78,  58, 78,  0, -30,  0, c1); // base
            add( 88,  48, 88,  0,   4,  0, c1); // panse
            add( 58,  28, 58,  0,  40,  0, c2); // col
            add( 66,  12, 66,  0,  58,  0, c1); // lèvre
            add( 22,  14, 22,  0,  68,  0, 0x8b5e3c); // bouchon
            break;
          case 'rod':
            add( 26, 150, 26,   0, -10, 0, 0x6b3c18); // manche (épais)
            add( 16,  70, 16,   3,  72, 0, 0x8b5e3c); // canne milieu
            add(  8,  40,  8,   5, 112, 0, 0xc0a050); // pointe bambou
            add( 32,  20, 28, -24, -78, 0, 0x909090); // moulinet corps
            add( 10,  26,  8, -36, -66, 0, 0xb0b0b0); // manivelle
            add(  6,  96,  6,   7,  40, 0, 0x222222); // fil
            addE(16,  22, 16,   9,  -8, 0, 0xee2200, 0xcc0000, 0.3); // flotteur
            break;
          case 'net':
            add( 18,  90, 18,   0,  72, 0, 0x8b5e3c); // manche bois
            add( 22,  14, 22,   0,  20, 0, 0xd4a030); // bague métal
            add(100,  14, 12,   0,   6, 0, 0xd4a030); // cadre barre H
            add( 14,  64, 12, -48, -28, 0, 0xd4a030); // cadre montant G
            add( 14,  64, 12,  48, -28, 0, 0xd4a030); // cadre montant D
            add(100,  14, 12,   0, -62, 0, 0xd4a030); // cadre barre B
            [-26, 16, 48].forEach(x  => add(6, 58, 6, x, -28, -7, 0xc8a020)); // fils verticaux
            [-6, -32, -56].forEach(y => add(90, 6, 6, 0,   y, -7, 0xc8a020)); // fils horizontaux
            break;
          default:
            add(100, 134, 58,  0,   0,  0, c1);
            add( 96,  10, 62,  0,  70,  0, c2);
        }
        return g3;
      };


      // ── Petite plaque métallique sous chaque objet ──
      const makePlaqueTex = (label, cHex) => {
        const W = 800, H = 216;
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        // Fond métal brossé
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#d2d2cc'); grad.addColorStop(0.35, '#eeeeea');
        grad.addColorStop(0.75, '#ccccC8'); grad.addColorStop(1, '#a8a8a2');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // Bandeau couleur du stand en bas
        const r = (cHex >> 16) & 0xFF, gv = (cHex >> 8) & 0xFF, b = cHex & 0xFF;
        ctx.fillStyle = `rgb(${r},${gv},${b})`; ctx.fillRect(0, H - 40, W, 40);
        // Contour métal
        ctx.strokeStyle = '#80807a'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, W - 16, H - 16);
        // Rivets aux coins
        [[28,28],[W-28,28],[28,H-28],[W-28,H-28]].forEach(([x,y]) => {
          ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2);
          ctx.fillStyle = '#909088'; ctx.fill();
          ctx.strokeStyle = '#b0b0a8'; ctx.lineWidth = 4; ctx.stroke();
        });
        // Texte
        ctx.fillStyle = '#181810';
        ctx.font = 'bold 104px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, W / 2, (H - 40) / 2 + 4);
        const tex = new THREE.CanvasTexture(cv);
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
      };

      const jayData   = [];
      const standsData = standsRef.current;
      standsData.length = 0;
      // Réinitialiser itemRefs pour éviter les doublons (React StrictMode lance l'effect 2×)
      stateRef.current.itemRefs    = [];
      stateRef.current.heldItem    = null;
      stateRef.current.pendingBoard = null;
      stateRef.current.camTarget   = null;
      stateRef.current.atStand     = false;
      let si = 0;

      const addStand = (cx, cz, ry) => {
        const def   = DEFS[si++];
        const isWIP = def.subject === null;
        const cHex  = def.color;
        const mCS   = new THREE.MeshLambertMaterial({ color: dk(cHex, 0.55) });
        const mCD   = new THREE.MeshLambertMaterial({ color: dk(cHex, 0.30) });

        // Textures colorées propres à ce stand
        const tCanopy = ctex(SW+120, Math.round(Math.hypot(LH-LHF, SD+160)), 620+si*7, cHex);
        const tPanel  = ctex(SW-LW*2, LH-CH-CT-50, 630+si*7, cHex);

        const g = new THREE.Group();
        g.position.set(cx, flY, cz);
        g.rotation.y = ry;
        scene.add(g);

        const add = (gW, gH, gD, mats, lx, ly, lz) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(gW, gH, gD), mats);
          m.position.set(lx, ly, lz); g.add(m);
        };

        const px  = SW/2 - LW/2;
        const pzB = -(SD/2 - LW/2);
        const pzF =  (SD/2 - LW/2);

        // ── 4 poteaux avec briques bois ──
        [[-px,pzB,LH,postBMats],[px,pzB,LH,postBMats],[-px,pzF,LHF,postFMats],[px,pzF,LHF,postFMats]]
          .forEach(([x,z,h,pm]) => add(LW, h, LW, pm, x, h/2, z));

        // ── Traverse sous-comptoir ──
        add(SW-LW*2, LW*.55, LW*.55, WM, 0, CH*.42, pzB);

        // ── Comptoir avec briques bois ──
        add(SW, CT, CD, ctrMats, 0, CH, pzF - CD/2);
        // Bord avant (latte verticale) — face +Z texturée
        add(SW, CH-LW*.5, LW*.45,
          [mk2(tLatte),mk2(tLatte), mWTop2, mWBot2, mk2(tLatte),mk2(tLatte)],
          0, (CH-LW*.5)/2, pzF+LW*.22);

        // ── Barres hautes avec briques bois ──
        add(SW, LW*.6, LW*.6, barMats, 0, LH,  pzB);
        add(SW, LW*.6, LW*.6, barMats, 0, LHF, pzF);

        // ── Toile inclinée — briques colorées sur le dessus ──
        const drop   = LH - LHF;
        const tLen   = Math.hypot(drop, SD + 160);
        const tAngle = Math.atan2(drop, SD + 160);
        const midY   = (LH + LHF) / 2;
        const tMesh  = new THREE.Mesh(
          new THREE.BoxGeometry(SW + 120, 52, tLen),
          [mCS, mCS, mk2(tCanopy), mCD, mCS, mCS]);
        tMesh.position.set(0, midY, -30);
        tMesh.rotation.x = tAngle;
        g.add(tMesh);

        // ── Frange ──
        const VW = 80, VH = 96, cW2 = SW + 120;
        const nV = Math.round(cW2 / (VW + 8));
        const vS = cW2 / nV;
        for (let i = 0; i < nV; i++) {
          const vh = i%2===0 ? cHex : 0xECE8D0;
          const mV = new THREE.MeshLambertMaterial({ color: vh });
          const mVD= new THREE.MeshLambertMaterial({ color: dk(vh, .55) });
          add(VW, VH, LW*.28, [mV,mV,mV,mVD,mV,mV],
            -cW2/2+vS/2+i*vS, LHF-VH/2+10, pzF+90);
        }

        // ── Panneau arrière — briques colorées face +Z visible ──
        const panH = LH - CH - CT - 50;
        if (!isWIP) {
          add(SW-LW*2, panH, LW*.45,
            [mCS, mCS, mCS, mCD, mk2(tPanel), mCS],
            0, CH+CT+panH/2+25, pzB+LW*.25);
        } else {
          const mGr = new THREE.MeshLambertMaterial({ color: 0x686868 });
          const mGrD= new THREE.MeshLambertMaterial({ color: 0x383838 });
          add(SW-LW*2, panH, LW*.45, [mGr,mGr,mGr,mGrD,mGr,mGr], 0, CH+CT+panH/2+25, pzB+LW*.25);
          const dL = Math.hypot(SW-LW*2, panH), ang = Math.atan2(panH, SW-LW*2);
          [ang,-ang].forEach(a => {
            const pl = new THREE.Mesh(new THREE.BoxGeometry(dL, LW*.33, LW*.46), WM);
            pl.position.set(0, CH+CT+panH/2+25, pzB+LW*.5); pl.rotation.z=a; g.add(pl);
          });
        }


        // ── Jay derrière le comptoir ──
        const jOff = -SD*.18;
        jayData.push({
          x: cx + jOff * Math.sin(ry),  y: flY,  z: cz + jOff * Math.cos(ry),
          bx: cx,  bz: cz,
          ry, subject: def.subject, role: def.role, phrases: def.phrases,
          isSorcier: def.role === 'Sorcier',
        });

        // Hitbox pour navigation (visible=false → raycaster la saute, Mesh.raycast vérifie this.visible)
        const hitbox = new THREE.Mesh(
          new THREE.BoxGeometry(SW + 400, LH + 300, SD + 600),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitbox.visible = false;
        hitbox.position.set(0, LH / 2, 100);
        g.add(hitbox);

        standsData.push({ group: g, cx, cz, ry });

        // ── Items sur le mur de fond ──
        const standContent = STANDS_CONTENT[si - 1];
        const boardType    = BOARD_TYPES[si - 1]; // null = utiliser makeItem3D
        const shapes       = ITEM_SHAPES[si - 1] ?? [];
        if (standContent) {
          const itemY = CH + CT + panH * 0.48 + 25;
          const itemZ = pzB + LW * 0.52;
          const col1  = dk(cHex, 0.70);
          const col2  = dk(cHex, 0.42);
          standContent.items.forEach((item, iIdx) => {
            const xPos = (iIdx - 1) * 490;
            let itemGrp;
            if (boardType) {
              // Bouclier ou parchemin avec texte
              itemGrp = makeItemBoard(boardType, item.title, item.content, dk(cHex, 0.55));
              itemGrp.scale.setScalar(2.0);
            } else {
              // Vrai objet 3D, sans texte
              itemGrp = makeItem3D(shapes[iIdx] ?? 'default', col1, col2);
              itemGrp.scale.setScalar(2.1);
            }
            // ── Plaque sous l'objet (dans le même groupe → vole avec lui) ──
            const plaqueTex = makePlaqueTex(item.label, cHex);
            const plaque = new THREE.Mesh(
              new THREE.BoxGeometry(210, 55, 14),
              [new THREE.MeshLambertMaterial({color:0xb0b0a8}),new THREE.MeshLambertMaterial({color:0xb0b0a8}),
               new THREE.MeshLambertMaterial({color:0xe0e0d8}),new THREE.MeshLambertMaterial({color:0x808078}),
               new THREE.MeshBasicMaterial({map:plaqueTex}),   new THREE.MeshLambertMaterial({color:0x909088})]
            );
            plaque.position.set(0, -160, 110); // sous ET devant l'objet (toujours visible)

            // ── Groupe combiné (objet + plaque, scale=1) ──
            const combinedGrp = new THREE.Group();
            combinedGrp.add(itemGrp);
            combinedGrp.add(plaque);
            combinedGrp.position.set(xPos, itemY, itemZ);
            combinedGrp.userData.origLocalPos  = combinedGrp.position.clone();
            combinedGrp.userData.origLocalQuat = combinedGrp.quaternion.clone();
            combinedGrp.userData.itemIdx = iIdx;
            combinedGrp.traverse(child => { if (child.isMesh) child.userData.itemIdx = iIdx; });
            g.add(combinedGrp);
            stateRef.current.itemRefs.push({ board: combinedGrp, group: g, standIdx: si - 1, itemIdx: iIdx });
          });
        }
      };

      // ── Placement ──
      const D = WALL_DIST - 440;
      addStand(-SC,-D, 0);          addStand(0,-D, 0);          addStand(SC,-D, 0);
      addStand(D,-SC,-Math.PI/2);   addStand(D, 0,-Math.PI/2);  addStand(D, SC,-Math.PI/2);
      addStand(-D,-SC,Math.PI/2);   addStand(-D,0,Math.PI/2);   addStand(-D,SC,Math.PI/2);

      // Tagger chaque mesh avec l'index du stand pour le raycasting
      standsData.forEach((sd, idx) => {
        sd.group.traverse(child => { child.userData.standIdx = idx; });
      });

      // ── Pancarte sur le comptoir avant + bulle de dialogue au-dessus du personnage ──
      const bubbleRefs = [];
      jayData.forEach(({ x: jx, z: jz, bx, bz, ry: sRy, subject, role, phrases }) => {
        const isWIP = subject === null;

        // Pancarte fixe sur la partie en bois avant du comptoir
        const sign = makeSign(role, subject, isWIP);
        sign.rotation.y = sRy;  // orientée dans la direction du stand (face au joueur)
        sign.position.set(
          bx + Math.sin(sRy) * 320,  // légèrement en avant de la latte (évite le z-fight)
          flY + 260,
          bz + Math.cos(sRy) * 320
        );
        scene.add(sign);

        // Bulle de dialogue fixe au-dessus de la tête de Jay
        const bubble = makeSpeechBubble(phrases[0], isWIP);
        bubble.rotation.y = sRy;
        bubble.position.set(bx, flY + LH + 500, bz);
        scene.add(bubble);

        bubbleRefs.push({
          mesh: bubble,
          phrases,
          isWIP,
          currentIdx: 0,
          nextSwitch: Date.now() + 30000 + Math.random() * 150000,
        });
      });

      // Cycling des phrases toutes les 1-3 min (vérification toutes les 5s)
      stateRef.current._bubbleInterval = setInterval(() => {
        const now = Date.now();
        for (const ref of bubbleRefs) {
          if (now >= ref.nextSwitch) {
            ref.currentIdx = (ref.currentIdx + 1) % ref.phrases.length;
            const oldTex = ref.mesh.material.map;
            ref.mesh.material.map = makeBubbleTex(ref.phrases[ref.currentIdx], ref.isWIP);
            ref.mesh.material.needsUpdate = true;
            if (oldTex) oldTex.dispose();
            ref.nextSwitch = Date.now() + 60000 + Math.random() * 120000;
          }
        }
      }, 5000);

      // ── Modèle Sorcier (Gandalf) — seul personnage restant sur la place ──
      let jaysCancelled = false;
      stateRef.current._cancelJays = () => { jaysCancelled = true; };
      const sorcierEntry = jayData.find(d => d.isSorcier);
      if (sorcierEntry) {
        const loader = new GLTFLoader();
        loader.load('/models/lego_gandalf/scene.gltf', gltf => {
          if (jaysCancelled) return;
          const base = gltf.scene;
          const bbox = new THREE.Box3().setFromObject(base);
          const size = bbox.getSize(new THREE.Vector3());
          const scale = 800 / (size.y || 1);
          const clone = base.clone(true);
          clone.scale.setScalar(scale);
          const cb = new THREE.Box3().setFromObject(clone);
          clone.position.set(
            sorcierEntry.x,
            sorcierEntry.y - cb.min.y + 120,
            sorcierEntry.z - 350           // décalé vers l'objet mystère
          );
          scene.add(clone);
          stateRef.current._sorcierModel = clone;
        });
      }
    }

    // ── Détails décoratifs ──
    {
      const flY = -EYE_Y;

      const place = (geo, mats, x, y, z, ry = 0) => {
        const m = new THREE.Mesh(geo, mats);
        m.position.set(x, y, z);
        if (ry) m.rotation.y = ry;
        scene.add(m);
        return m;
      };
      const mat  = c  => new THREE.MeshLambertMaterial({ color: c });
      const eMat = (c, e, ei) => new THREE.MeshLambertMaterial({ color: c, emissive: e, emissiveIntensity: ei });
      const box  = (w, h, d) => new THREE.BoxGeometry(w, h, d);

      // ── Torches murales ───────────────────────────────────────────────────
      stateRef.current._torchObjects = [];
      const addTorch = (x, y, z) => {
        place(box(56,26,56), [mat(0x555555),mat(0x555555),mat(0x888888),mat(0x333333),mat(0x555555),mat(0x555555)], x, y, z);
        place(box(18,120,18), [mat(0x3c1e08),mat(0x3c1e08),mat(0x3c1e08),mat(0x3c1e08),mat(0x3c1e08),mat(0x3c1e08)], x, y+87, z);
        const mF1 = eMat(0xCC4400, 0x992200, 0.6);
        const mF2 = eMat(0xFF8000, 0xCC5500, 0.85);
        const mF3 = eMat(0xFFDD00, 0xFF9900, 1.0);
        place(box(38,34,38), [mF1,mF1,mF2,mF1,mF1,mF1], x, y+173, z);
        place(box(26,28,26), [mF2,mF2,mF3,mF2,mF2,mF2], x, y+204, z);
        place(box(14,20,14), [mF3,mF3,mF3,mF3,mF3,mF3], x, y+228, z);

        const torchIdx = stateRef.current._torchObjects.length;
        const isEgg = true; // toutes les 8 torches participent à l'easter egg
        const torchObj = {
          idx: torchIdx, lit: true, isEgg,
          flames: [
            { mat: mF1, origColor: 0xCC4400, origEmissive: 0x992200, base: 0.6  },
            { mat: mF2, origColor: 0xFF8000, origEmissive: 0xCC5500, base: 0.85 },
            { mat: mF3, origColor: 0xFFDD00, origEmissive: 0xFF9900, base: 1.0  },
          ],
          hitbox: null,
        };
        if (isEgg) {
          const hb = new THREE.Mesh(
            new THREE.BoxGeometry(160, 320, 160),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hb.position.set(x, y + 140, z);
          hb.userData.torchIdx = torchIdx;
          scene.add(hb);
          torchObj.hitbox = hb;
        }
        stateRef.current._torchObjects.push(torchObj);
        torchFlamesRef.current.push(
          { mat: mF1, base: 0.6,  torchObj },
          { mat: mF2, base: 0.85, torchObj },
          { mat: mF3, base: 1.0,  torchObj },
        );
      };

      const torchY = flY + 840;
      [-994,994].forEach(x => addTorch(x, torchY, WALL_DIST-128));
      [-994,994].forEach(x  => addTorch(x, flY+1520, -WALL_DIST+128));
      [-994,994].forEach(z  => { addTorch(WALL_DIST-128, flY+1520, z); addTorch(-WALL_DIST+128, flY+1520, z); });

      // ── Bannières sur les tours (corrigées : poteau au-dessus de la tour) ─
      const BANNER_COLORS = [0xCC2222, 0x2244BB, 0x228833, 0xBB7700];
      const D2 = WALL_DIST, T2 = TOWER_W_PX;
      const towerTop = flY + TOWER_H_PX;  // sommet des tours en world Y
      [
        [ D2-T2/2, -(D2-T2/2), 0       ],   // NE → bannière face +Z (sud, vers caméra)
        [-(D2-T2/2), -(D2-T2/2), 0     ],   // NW → idem
        [ D2-T2/2,  (D2-T2/2), Math.PI ],   // SE → face -Z (nord, vers intérieur)
        [-(D2-T2/2),  (D2-T2/2), Math.PI],  // SW → idem
      ].forEach(([tx, tz, ry], ci) => {
        const col  = BANNER_COLORS[ci];
        const mPl  = mat(0x9a7040);
        const mPlT = mat(0xc09858);
        // Poteau — ancré dans la tour, sommet à towerTop+468 (sous le fanion)
        place(box(24, 468 + MERLON_H_PX, 24), [mPl,mPl,mPlT,mat(0x5a3810),mPl,mPl],
          tx, towerTop + 234 - MERLON_H_PX / 2, tz);
        // Pennant — top à towerTop+492 couvre le sommet du poteau
        {
          const penW = 200, penH = 400, vNotch = 100;
          const penShape = new THREE.Shape();
          penShape.moveTo(-penW/2,  penH/2);
          penShape.lineTo( penW/2,  penH/2);
          penShape.lineTo( penW/2, -penH/2);
          penShape.lineTo( 0,      -penH/2 + vNotch);
          penShape.lineTo(-penW/2, -penH/2);
          penShape.closePath();
          const penMesh = new THREE.Mesh(
            new THREE.ShapeGeometry(penShape),
            new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })
          );
          penMesh.position.set(tx, towerTop + 292, tz);
          penMesh.rotation.y = ry;
          scene.add(penMesh);
        }
      });

      // ── Lampadaires dans la cour ──────────────────────────────────────────
      const addLamp = (x, z) => {
        const mIr = mat(0x2a2a2a);
        const mIrT= mat(0x444444);
        const mGl = new THREE.MeshLambertMaterial({ color:0xFFFF99, emissive:0xFFCC00, emissiveIntensity:1.0, transparent:true, opacity:0.88 });
        // Direction du bras : de (x,z) vers le centre (0,0)
        const r  = Math.hypot(x, z);
        const dx = -x / r;   // composante X vers le centre
        const dz = -z / r;   // composante Z vers le centre
        const armLen = 130;
        // rotation.y = atan2(z,-x) oriente le bras local +X vers le centre
        const ry = Math.atan2(z, -x);
        // Fût
        place(box(26,860,26), [mIr,mIr,mIrT,mat(0x181818),mIr,mIr], x, flY+430, z);
        // Bras (rotation pour pointer vers le centre)
        place(box(armLen,18,18), [mIr,mIr,mIrT,mIr,mIr,mIr],
          x + dx*armLen/2, flY+860, z + dz*armLen/2, ry);
        // Lanterne au bout du bras
        const lx = x + dx*armLen, lz = z + dz*armLen;
        place(box(58,78,58), [mGl,mGl,mGl,mGl,mGl,mGl], lx, flY+834, lz);
        place(box(68,14,68), [mIr,mIr,mIrT,mIr,mIr,mIr], lx, flY+795, lz);
        place(box(68,14,68), [mIr,mIr,mIrT,mIr,mIr,mIr], lx, flY+912, lz);
      };
      // Corridors entre stands : x=±994 (N), z=±994 (E/O), à mi-chemin vers le puits
      [
        [ 994, -1800], [-994, -1800],   // couloirs N gauche/droite
        [1800,  994],  [1800, -994],    // couloirs E haut/bas
        [-1800,  994], [-1800, -994],   // couloirs O haut/bas
      ].forEach(([x, z]) => addLamp(x, z));

      // ── Oiseaux (animés dans la boucle) ──────────────────────────────────────
      {
        const bMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const wingMeshGeo = new THREE.BoxGeometry(58, 8, 16);
        [0, 3200, 6800].forEach((xOff, bi) => {
          const g = new THREE.Group();
          // Corps
          g.add(new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), bMat));
          // Aile gauche — pivot attaché au corps côté gauche, mesh décalé vers la gauche
          const lGrp = new THREE.Group(); lGrp.position.set(-10, 0, 0);
          const lMesh = new THREE.Mesh(wingMeshGeo, bMat); lMesh.position.set(-29, 0, 0);
          lGrp.add(lMesh); g.add(lGrp);
          // Aile droite — pivot attaché au corps côté droit, mesh décalé vers la droite
          const rGrp = new THREE.Group(); rGrp.position.set(10, 0, 0);
          const rMesh = new THREE.Mesh(wingMeshGeo, bMat); rMesh.position.set(29, 0, 0);
          rGrp.add(rMesh); g.add(rGrp);
          g.userData = { x: -12000 + xOff, y: 1600 + bi*450, z: -1200 - bi*900, speed: 130 + bi*25, flapT: bi*1.8 };
          scene.add(g);
          birdsRef.current.push(g);
        });
      }

      // ── Bannières sur les murs Nord, Est et Ouest ────────────────────────────
      {
        const bannerColors = [0xCC2222,0x1a4499,0x228833,0x886600,0x661888,0x147788,0x993300,0x887700,0x445566];
        const bMeshes = [];
        const byWall = -EYE_Y + WALL_H - 120;
        const mkBanner = (col, x, y, z, ry, offset) => {
          const geo = new THREE.PlaneGeometry(120, 240, 3, 1);
          const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }));
          mesh.position.set(x, y, z);
          mesh.rotation.y = ry;
          mesh.userData.flapOffset = offset;
          scene.add(mesh); bMeshes.push(mesh);
        };
        // Mur Nord (3 stands : Forgeron, Moine, Artisan)
        bannerColors.slice(0,3).forEach((col, bi) => {
          const bx = -WALL_W/2 + (bi + 0.5) * (WALL_W / 3);
          mkBanner(col, bx, byWall, -WALL_DIST + 20, 0, bi * 0.9);
        });
        // Mur Est (3 stands : Paysan, Boucher, Poissonnier)
        bannerColors.slice(3,6).forEach((col, bi) => {
          const bz = -WALL_W/2 + (bi + 0.5) * (WALL_W / 3);
          mkBanner(col, WALL_DIST - 20, byWall, bz, -Math.PI/2, bi * 0.9 + 1.2);
        });
        // Mur Ouest (3 stands : Boulanger, Tavernier, Sorcier)
        bannerColors.slice(6,9).forEach((col, bi) => {
          const bz = -WALL_W/2 + (bi + 0.5) * (WALL_W / 3);
          mkBanner(col, -WALL_DIST + 20, byWall, bz, Math.PI/2, bi * 0.9 + 2.4);
        });
        stateRef.current._bannerMeshes = bMeshes;
      }

      // ── Anneau de pavés autour du puits ──────────────────────────────────
      // i=4 → gauche (eggStone=0), i=3 → milieu (eggStone=1), i=2 → droite (eggStone=2)
      // Ordre secret : gauche(0) → droite(2) → milieu(1)
      const EGG_IDX_MAP = {4:0, 3:1, 2:2};
      eggStonesRef.current = new Array(3).fill(null);
      stateRef.current._stoneOrigY  = [flY+20, flY+20, flY+20];
      stateRef.current._stoneTargetY = [flY+20, flY+20, flY+20];
      for (let i = 0; i < 12; i++) {
        const a = (i/12)*Math.PI*2;
        const r = 680;
        const px3 = Math.cos(a)*r, pz3 = Math.sin(a)*r;
        const eidx = EGG_IDX_MAP[i];
        const stoneMesh = new THREE.Mesh(
          box(86,40,86),
          [mat(0x767676),mat(0x767676),mat(0xa8a8a8),mat(0x404040),mat(0x767676),mat(0x767676)]
        );
        stoneMesh.position.set(px3, flY+20, pz3);
        scene.add(stoneMesh);
        if (eidx !== undefined) {
          stoneMesh.userData.eggStone = eidx;
          eggStonesRef.current[eidx] = stoneMesh;
        }
      }

      // ── Boucliers sur le mur sud ──────────────────────────────────────────
      const SHIELD_C = [0xCC2222, 0x2244BB, 0x228833, 0xBB7700, 0x882288];
      [-1600,-800,0,800,1600].forEach((x, i) => {
        const c = SHIELD_C[i];
        place(box(154,192,20), [mat(c),mat(c),mat(c),mat(Math.max(0,c-0x404040)),mat(c),mat(c)],
          x, flY+1200, WALL_DIST-144);
        place(box(154,26,24), [mat(0xeec030),mat(0xeec030),mat(0xffe050),mat(0xa08010),mat(0xeec030),mat(0xeec030)],
          x, flY+1200, WALL_DIST-147);
        place(box(26,192,24), [mat(0xeec030),mat(0xeec030),mat(0xffe050),mat(0xa08010),mat(0xeec030),mat(0xeec030)],
          x, flY+1200, WALL_DIST-147);
      });

      // ── Cailloux LEGO sur tout le sol du château ──────────────────────────
      const rng = makePRNG(9999);
      // Nuances de gris uniquement
      const GRAYS = [0x6a6a6a, 0x757575, 0x808080, 0x8c8c8c, 0x686868, 0x717171, 0x7e7e7e];
      for (let i = 0; i < 75; i++) {
        const angle  = rng() * Math.PI * 2;
        // Couvre tout le château (r=250 à r=3100) sauf zone puits proche
        const radius = 250 + rng() * 2850;
        const px2    = Math.cos(angle) * radius;
        const pz2    = Math.sin(angle) * radius;
        const w  = 38 + Math.floor(rng() * 3) * 19;  // 38, 57 ou 76
        const d  = 38 + Math.floor(rng() * 2) * 19;
        const h  = 8  + Math.floor(rng() * 2) * 8;   // 8 ou 16
        const col2 = GRAYS[Math.floor(rng() * GRAYS.length)];
        const mP   = mat(col2);
        const mPT  = mat(Math.min(0xffffff, col2 + 0x1a1a1a));
        place(box(w, h, d), [mP,mP,mPT,mat(0x2a2a2a),mP,mP],
          px2, flY+h/2, pz2, rng() * Math.PI * 2);
        // Stud(s) LEGO sur le dessus
        const nSt = w >= 57 ? 2 : 1;
        for (let s = 0; s < nSt; s++) {
          place(box(10,6,10), [mPT,mPT,mPT,mPT,mPT,mPT],
            px2 + (nSt===2 ? (s===0?-9:9) : 0), flY+h+3, pz2);
        }
      }
    }

    // ── Grotte secrète (Easter egg) — construite à la demande ────────────────
    const CAVE_Y = -12000;
    const buildCave = () => {
      if (caveRef.current) return;
      const cave  = new THREE.Group();
      const rngC  = makePRNG(9191);
      const lm    = c  => new THREE.MeshLambertMaterial({ color: c });
      const emm   = (c,i=1) => new THREE.MeshLambertMaterial({ color:c, emissive:c, emissiveIntensity:i });
      const bx2   = (w,h,d) => new THREE.BoxGeometry(w,h,d);
      const add2  = (geo,mat,x,y,z,rx=0,ry=0,rz=0,p=cave) => {
        const m = new THREE.Mesh(geo,mat); m.position.set(x,y,z);
        if(rx||ry||rz) m.rotation.set(rx,ry,rz); p.add(m); return m;
      };
      const box   = (w,h,d,mat,x,y,z,rx=0,ry=0,rz=0,p=cave) => add2(bx2(w,h,d),mat,x,y,z,rx,ry,rz,p);

      // ── ÉCLAIRAGE (lumineux mais atmosphérique) ────────────────────────────
      // Ambiance dorée principale — forte pour bien tout voir
      cave.add(new THREE.AmbientLight(0xffcc88, 2.2));
      // Lumière directionnelle principale (haut-avant, chaude)
      const dirL  = new THREE.DirectionalLight(0xffe8cc, 5.0);
      dirL.position.set(0.8, 2, 1.5); cave.add(dirL);
      // Directionnelle fill (douce, de dessous-gauche)
      const dirL2 = new THREE.DirectionalLight(0xddaa66, 1.5);
      dirL2.position.set(-1, 0.2, 0.5); cave.add(dirL2);
      // Feu du dragon (point light intense)
      const fireL  = new THREE.PointLight(0xff5500, 12, 3500); fireL.position.set(0, 750, -700); cave.add(fireL);
      const fireL2 = new THREE.PointLight(0xff9900, 6,  2000); fireL2.position.set(0, 720,-1100); cave.add(fireL2);
      // Or (rayonnement doré depuis le trésor)
      const goldL  = new THREE.PointLight(0xffcc00, 8,  2200); goldL.position.set(0, 300, -150); cave.add(goldL);
      const goldL2 = new THREE.PointLight(0xffaa00, 5,  1600); goldL2.position.set(-400,200, 100); cave.add(goldL2);
      const goldL3 = new THREE.PointLight(0xffaa00, 5,  1600); goldL3.position.set( 400,200, 100); cave.add(goldL3);
      // Torches (point lights supplémentaires)
      const tL1 = new THREE.PointLight(0xff8800, 4, 1800); tL1.position.set(-1700,850,-200); cave.add(tL1);
      const tL2 = new THREE.PointLight(0xff8800, 4, 1800); tL2.position.set( 1700,850,-200); cave.add(tL2);

      // ── CAVE STRUCTURE ─────────────────────────────────────────────────────
      // Couleurs rocheuses brunes — assez claires pour être visibles
      const RC  = [0x6a5444, 0x5a4838, 0x7a6454, 0x4e3e2e, 0x8a7060];
      const rlm = () => lm(RC[Math.floor(rngC()*RC.length)]);
      // Zone libre partagée (définie ici pour usage dans sol + stalactites)
      const isClear = (x,z) =>
        (Math.abs(x)<1100 && Math.abs(z+200)<1000) ||
        (Math.abs(x)<600  && z > 500);

      // Sol (pierre sombre mais visible)
      box(7000,80,7000, lm(0x3e3028), 0,-40,0);
      // Relief sol rocheux (évite le couloir caméra et zone dragon)
      for(let i=0;i<60;i++){
        const x=(rngC()-0.5)*4500, z=(rngC()-0.5)*4500, s=60+rngC()*280, h=15+rngC()*80;
        if(isClear(x,z)) continue;
        box(s,h,s*.8, rlm(), x,h/2,z, 0,rngC()*Math.PI,0);
      }
      // Plafond (légèrement plus foncé)
      box(7000,100,7000, lm(0x2e2418), 0,2600,0);
      // Murs (blocs rocheux multicouches brun-gris)
      const wallPlank = (x,y,z,w,h,d,ry2=0) => {
        box(w,h,d, rlm(), x,y,z, 0,ry2,0);
      };
      [-1,1].forEach(sx => {
        for(let yi=0;yi<5;yi++) for(let zi=-3;zi<=3;zi++){
          wallPlank(sx*(2000+rngC()*200), 300+yi*500+rngC()*80, zi*650+rngC()*100,
            300+rngC()*150, 550+rngC()*150, 650+rngC()*150, 0);
          wallPlank(sx*(2400+rngC()*150), 300+yi*500+rngC()*80, zi*650+rngC()*100,
            250+rngC()*100, 500+rngC()*120, 600+rngC()*120, 0);
        }
      });
      // Mur nord (fond)
      for(let xi=-3;xi<=3;xi++) for(let yi=0;yi<5;yi++){
        wallPlank(xi*650+rngC()*100, 300+yi*500+rngC()*80, -2100+rngC()*200,
          650+rngC()*150, 550+rngC()*150, 300+rngC()*100);
      }
      // Stalactites (restent sur les côtés/fond, jamais dans le couloir)
      for(let i=0;i<40;i++){
        const x=(rngC()-0.5)*3800, z=(rngC()-0.5)*3800;
        if(isClear(x,z)) continue;
        const h=200+rngC()*600, w=40+rngC()*80;
        box(w,h,w, lm(0x181412), x,2600-h/2,z);
        box(w*.5,h*.5,w*.5, lm(0x141008), x+w*.3,2600-h*.25,z+w*.3);
        if(rngC()>0.6) box(8,12,8, emm(0x6688aa,.5), x,2600-h+4,z);
      }
      // Stalagmites
      for(let i=0;i<25;i++){
        const x=(rngC()-0.5)*3500, z=(rngC()-0.5)*3500;
        if(isClear(x,z)) continue;
        const h=100+rngC()*350, w=30+rngC()*70;
        box(w,h,w, lm(0x1a1612), x,h/2,z);
        box(w*.5,h*.4,w*.5, lm(0x141008), x+w*.4,h*.2,z+w*.4);
      }
      // Cristaux (colonnes lumineuses)
      [[0x00aaff,0x0066cc],[ 0xaa00ff,0x6600cc],[0x00ffaa,0x008866],[0xff4488,0xcc0044]].forEach(([c1,c2],ci) => {
        const cx=[-1200,-900,1100,1000][ci], cz=[-800,-1400,-700,-1300][ci];
        box(50,260,50, emm(c1,.8), cx,130,cz, 0,0,.2);
        box(36,180,36, emm(c1,1.1), cx+40,90,cz+30, 0,0,.15);
        box(24,120,24, emm(c2,1.4), cx-28,60,cz-20, 0,0,.3);
        const cl=new THREE.PointLight(c1,1.2,700); cl.position.set(cx,160,cz); cave.add(cl);
      });
      // Torches murales
      [[-1700,700,-400],[-1700,700,400],[1700,700,-400],[1700,700,400]].forEach(([tx,ty,tz]) => {
        box(55,30,55, lm(0x555555), tx,ty-15,tz);
        box(18,110,18, lm(0x3c1e08), tx,ty+40,tz);
        box(34,32,34, emm(0xff8800,1.2), tx,ty+112,tz);
        box(22,24,22, emm(0xffcc00,1.6), tx,ty+136,tz);
        box(12,18,12, emm(0xffffff,2.0), tx,ty+154,tz);
        const tl=new THREE.PointLight(0xff7700,1.6,1200); tl.position.set(tx,ty+150,tz); cave.add(tl);
      });

      // ── OR ET TRÉSOR ──────────────────────────────────────────────────────
      const rngG = makePRNG(4242);
      // Tas d'or de base (couches)
      for(let ri=0;ri<6;ri++){
        const s=900-ri*120, yy=ri*40;
        box(s,50,s*.8, lm(0xd4a830+ri*0x050500), 0,yy,-200);
      }
      // Pièces/lingots
      for(let i=0;i<140;i++){
        const a=rngG()*Math.PI*2, r=40+rngG()*660;
        const x=Math.cos(a)*r, z=-200+Math.sin(a)*r*.65;
        const gm = rngG()>.3 ? emm(0xffd700,.2) : lm(0xe8c000);
        box(25+rngG()*30, 12+rngG()*16, 20+rngG()*24, gm, x,20+rngG()*160,z, 0,rngG()*Math.PI,0);
      }
      // Coffres
      [[280,35,-80],[-310,35,-100],[50,35,-650]].forEach(([cx,cy,cz]) => {
        box(210,130,155, lm(0x5a3010), cx,cy+65,cz);
        box(214,50,160, lm(0x7a4820), cx,cy+156,cz, -0.3,0,0);
        box(50,14,14, lm(0xd4a030), cx,cy+100,cz+77);
        for(let ji=0;ji<12;ji++) box(18,12,18, lm(0xffd700), cx+(rngG()-.5)*80,cy+10+rngG()*50,cz+(rngG()-.5)*70);
      });
      // Gemmes
      [[0xff0066,-400,80,-100],[0x00aaff,400,60,-150],[0xaa00ff,-100,70,-500],[0xffaa00,350,90,-450]].forEach(([c,gx,gy,gz]) => {
        box(40,40,40, emm(c,.9), gx,gy,gz, rngG()*.5,rngG()*.5,rngG()*.5);
        box(28,28,28, emm(c,1.4), gx,gy+38,gz, rngG()*.3,rngG()*.3,.785);
      });
      // Ossements
      [[500,8,-100],[550,8,-650],[-480,6,-150]].forEach(([bx3,by,bz]) => {
        box(110,12,22, lm(0xd0ccb0), bx3,by+6,bz, 0,rngG()*Math.PI,0);
        box(45,45,45, lm(0xccc8a8), bx3+35,by+22,bz+30);
      });

      // ── DRAGON (conçu pour être vu de face : tête en +z = vers caméra) ──────
      const D    = new THREE.Group();
      const DB   = lm(0x1a8070); // teal corps
      const DW   = lm(0x0e5a4a); // teal foncé ailes
      const DU   = lm(0x2ab898); // teal clair ventre
      const DS   = lm(0x0a3a2a); // teal très foncé
      const DC   = lm(0xe8e0c0); // crème griffes/dents

      // ── 1. CORPS ─
      box(680,440,550, DB, 0,225,0);
      box(540,340,520, DU, 0,182,30);       // ventre clair

      // ── 2. COU ─
      box(220,380,220, DB, 0,568,80, -.35,0,0);

      // ── 3. TÊTE ─
      // Crâne centré à z=162, profondeur=290 → face avant à z=307
      box(330,250,290, DB, 0,800,162);
      box(200,110,155, DB, 0,772,275); // museau (face avant ~353)

      // Mâchoire ouverte (en dessous)
      box(270,65,220, lm(0x0e6050), 0,698,185, .22,0,0);
      box(250,55,200, DU,           0,693,186, .22,0,0);

      // ── YEUX sur la face avant du crâne (z≈298, juste devant z=307) ──
      [[-116],[116]].forEach(([ex]) => {
        box(90,90,28, emm(0xffee00,5.0), ex,852,298); // iris jaune vif
        box(44,62,33, lm(0x050505),      ex,852,300); // pupille noire
        box(98,98,22, DS,                ex,852,293); // orbite
        box(102,24,26,DS,                ex,880,295, -.32,0,0); // sourcil
      });

      // Bouche — une seule rangée de dents bien visibles
      box(260,16,12, DS, 0,718,308);  // fente de bouche
      [-72,-30,12,54].forEach(tx =>
        box(24,54,20, DC, tx,686,310)); // dents (1 rangée uniquement)

      // Narines (face avant museau z≈353)
      [[-52],[52]].forEach(([nx]) => box(20,14,12, emm(0x440000,.5), nx,746,352));

      // Cornes
      [[-104,.17],[104,-.17]].forEach(([hx,hz]) => {
        box(24,158,24, DS, hx,944,162, -.22,0,hz);
        box(16,80,16,  DW, hx+7,1100,157, -.1,0,hz*.5);
      });
      [-62,0,62].forEach(cx => box(18,40,20, DS, cx,870,128));

      // ── 4. AILES — membrane seule (pas d'os) ────────────────────────────
      [-1,1].forEach(side => {
        box(1000,55,500, DW, side*680,580,-60, .06,0,side*.28);
      });

      // ── 5. 4 PATTES ─
      [[-240,-240],[240,-240],[-225,215],[225,215]].forEach(([lx,lz]) => {
        box(170,290,170, DB, lx,145,lz);
        box(135,225,135, DB, lx,2,lz+55, -.2,0,0);
        [-52,0,52].forEach(gx => box(28,72,23, DC, lx+gx,2,lz+135, -.3,0,0));
      });

      // ── 6. QUEUE ─
      [[0,95,-370],[65,70,-510],[120,50,-630]].forEach(([tx,ts,tz]) =>
        box(ts,ts*.65,ts, DB, tx,ts*.3,tz, 0,.2,0));

      D.scale.setScalar(0.62);
      D.rotation.y = 0.45;  // vue 3/4 : silhouette lisible
      D.position.set(0, 20, -380);
      cave.add(D);

      // ── FERMETURE ──────────────────────────────────────────────────────────
      cave.position.set(0, CAVE_Y, 0);
      scene.add(cave);
      caveRef.current = cave;
      stateRef.current._savedBg = scene.background;
      scene.background = new THREE.Color(0x050302);
      scene.fog = new THREE.FogExp2(0x080604, 0.0003);
      // Désactiver les lumières globales du château (elles teindraient la grotte en bleu)
      stateRef.current._hiddenLights = scene.children.filter(c => c.isLight && c.visible);
      stateRef.current._hiddenLights.forEach(l => { l.visible = false; });
    };

    const destroyCave = () => {
      if (caveRef.current) { scene.remove(caveRef.current); caveRef.current = null; }
      if (stateRef.current._savedBg) scene.background = stateRef.current._savedBg;
      scene.fog = null;
      // Réactiver les lumières du château
      stateRef.current._hiddenLights?.forEach(l => { l.visible = true; });
      stateRef.current._hiddenLights = null;
    };

    stateRef.current._buildCave    = buildCave;
    stateRef.current._destroyCave  = destroyCave;
    stateRef.current._moveCamToCave = () => {
      camera.position.set(0, CAVE_Y+250, 2000);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(THREE.MathUtils.degToRad(-5), 0, 0);
    };
    stateRef.current._restoreCam = () => {
      camera.position.set(0, 0, WALL_DIST * 0.85);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(THREE.MathUtils.degToRad(-3), 0, 0);
    };
    stateRef.current._eggSequence = [];

    // ── Particules pluie/neige ──
    const RAIN_N = 4000, RRANGE = WALL_DIST * 2.4, RAIN_H = 5000;
    const rPos = new Float32Array(RAIN_N * 6); // 2 vertices par goutte (tête + queue)
    for (let i = 0; i < RAIN_N; i++) {
      const x = (Math.random() - 0.5) * RRANGE;
      const y = Math.random() * RAIN_H - EYE_Y;
      const z = (Math.random() - 0.5) * RRANGE;
      rPos[i*6]   = x;  rPos[i*6+1] = y;      rPos[i*6+2] = z; // tête
      rPos[i*6+3] = x;  rPos[i*6+4] = y + 60; rPos[i*6+5] = z; // queue
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    const rMat = new THREE.LineBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.55, depthWrite: false });
    const rMesh = new THREE.LineSegments(rGeo, rMat);
    rMesh.visible = false;
    scene.add(rMesh);
    rainRef.current = { mesh: rMesh, geo: rGeo };

    // ── Boucle de rendu ──
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (rainRef.current?.mesh.visible) {
        const pos = rainRef.current.geo.attributes.position.array;
        const fall  = stateRef.current.rainFall  ?? 25;
        const drift = stateRef.current.rainDrift ?? 0;
        const sLen  = fall * 4; // longueur de la traînée en unités monde
        for (let i = 0; i < RAIN_N; i++) {
          pos[i*6]   += drift;
          pos[i*6+1] -= fall;
          pos[i*6+3]  = pos[i*6]   - (sLen / fall) * drift;
          pos[i*6+4]  = pos[i*6+1] + sLen;
          pos[i*6+5]  = pos[i*6+2];
          if (pos[i*6+1] < -EYE_Y - 200) {
            const nx = (Math.random() - 0.5) * RRANGE;
            const nz = (Math.random() - 0.5) * RRANGE;
            pos[i*6]   = nx;              pos[i*6+1] = RAIN_H - EYE_Y; pos[i*6+2] = nz;
            pos[i*6+3] = nx - (sLen / fall) * drift; pos[i*6+4] = RAIN_H - EYE_Y + sLen; pos[i*6+5] = nz;
          }
        }
        rainRef.current.geo.attributes.position.needsUpdate = true;
      }

      // ── Animation pierres Easter egg (press/release) ──────────────────────
      const stY = stateRef.current._stoneTargetY;
      if (stY) {
        eggStonesRef.current.forEach((s3, i3) => {
          if (s3 && stY[i3] !== undefined)
            s3.position.y += (stY[i3] - s3.position.y) * 0.22;
        });
      }

      // ── Plongée dans le puits (Easter egg) ────────────────────────────────
      const dive = stateRef.current.eggDive;
      if (dive && !dive.done) {         // STOP dès que done=true
        dive.t += 0.016;
        if (dive.t < 1.4) {
          // Phase 1 : approche du puits
          camera.position.x += (0  - camera.position.x) * 0.04;
          camera.position.z += (120 - camera.position.z) * 0.04;
          camera.rotation.y += (0  - camera.rotation.y) * 0.05;
          camera.rotation.x += (-0.6 - camera.rotation.x) * 0.04;
          stateRef.current.rotY = 0;
        } else {
          // Phase 2 : chute dans le puits
          const ft = dive.t - 1.4;
          camera.position.y -= 30 + ft * 400;
          camera.rotation.x += 0.015;
          const opa = Math.min(1, ft / 0.7);
          if (eggDiveOverlayRef.current) eggDiveOverlayRef.current.style.opacity = String(opa);
        }
        if (dive.t > 2.8) {
          dive.done = true;             // stoppe immédiatement les mises à jour caméra
          stateRef.current._buildCave?.();
          stateRef.current._moveCamToCave?.();
          setTimeout(() => {
            stateRef.current.eggDive = null;
            // Fondu depuis le noir vers la grotte
            if (eggDiveOverlayRef.current) {
              eggDiveOverlayRef.current.style.transition = 'opacity 1.2s ease';
              eggDiveOverlayRef.current.style.opacity = '0';
            }
            stateRef.current._setEggPhase?.('cave');
            setTimeout(() => stateRef.current._setEggPhase?.('dialog'), 1800);
          }, 300);
        }
      }

      // ── Navigation vers un stand ──
      const ct = stateRef.current.camTarget;
      if (ct) {
        const spd = 0.055;
        camera.position.x += (ct.x - camera.position.x) * spd;
        camera.position.z += (ct.z - camera.position.z) * spd;
        let dRY = ct.ry - camera.rotation.y;
        while (dRY >  Math.PI) dRY -= Math.PI * 2;
        while (dRY < -Math.PI) dRY += Math.PI * 2;
        camera.rotation.y += dRY * spd;
        stateRef.current.rotY = -THREE.MathUtils.radToDeg(camera.rotation.y);
        if (Math.abs(ct.x - camera.position.x) < 4 && Math.abs(ct.z - camera.position.z) < 4 && Math.abs(dRY) < 0.002) {
          camera.position.x = ct.x;
          camera.position.z = ct.z;
          camera.rotation.y = ct.ry;
          stateRef.current.rotY = -THREE.MathUtils.radToDeg(ct.ry);
          stateRef.current.camTarget = null;
          // Marquer qu'on est face à un stand (si ry ≠ initial)
          if (!stateRef.current.atStand && ct.ry !== undefined) {
            const isInitial = Math.abs(ct.x) < 5 && Math.abs(ct.z - WALL_DIST * 0.85) < 5;
            if (!isInitial) {
              stateRef.current.atStand = true;
              stateRef.current._setAtStand?.(true);
            }
          }
          // Déclencher le vol de surface en attente
          const pb = stateRef.current.pendingBoard;
          if (pb) {
            stateRef.current.pendingBoard = null;
            if (stateRef.current.heldItem) stateRef.current.heldItem.state = 'flying_out';
            const rev = stateRef.current._revealedItems?.has?.(`${pb.standIdx}_${pb.itemIdx}`) ?? false;
            stateRef.current.heldItem = {
              board: pb.board, group: pb.group,
              origLocalPos:  pb.board.userData.origLocalPos.clone(),
              origLocalQuat: pb.board.userData.origLocalQuat.clone(),
              state: 'flying_in',
              standIdx: pb.standIdx, itemIdx: pb.itemIdx,
              revealedOnStart: rev,
            };
          }
        }
      }

      // ── Tilt caméra vers le ciel (feux d'artifice) ──
      if (!stateRef.current._diveCam) {
        const txRot = stateRef.current._camTargetX ?? THREE.MathUtils.degToRad(-3);
        camera.rotation.x += (txRot - camera.rotation.x) * 0.035;
      }

      // ── Création du parchemin ──
      if (stateRef.current.requestParchment && stateRef.current._makeItemBoard) {
        const { standIdx: rpSi, itemIdx: rpIi } = stateRef.current.requestParchment;
        stateRef.current.requestParchment = null;
        const rpItem = STANDS_CONTENT[rpSi]?.items[rpIi];
        if (rpItem) {
          const pGrp = stateRef.current._makeItemBoard('parchment', rpItem.title, rpItem.content, 0x8b5e3c, rpItem.links ?? []);
          pGrp.scale.setScalar(1.7);
          // Départ depuis la position actuelle de l'objet
          const hi0 = stateRef.current.heldItem;
          if (hi0?.board) {
            const objWp = new THREE.Vector3();
            hi0.board.getWorldPosition(objWp);
            pGrp.position.copy(objWp);
          }
          pGrp.rotation.set(0, camera.rotation.y, 0, 'YXZ');
          scene.add(pGrp);
          stateRef.current.parchmentObj = { grp: pGrp, returning: false };
        }
      }

      // ── Parchemin ──
      const sp = stateRef.current.parchmentObj;
      const hi = stateRef.current.heldItem;
      if (sp) {
        // Rotation de face fixe (texte toujours lisible, pas de tilt)
        sp.grp.rotation.set(0, camera.rotation.y, 0, 'YXZ');

        if (sp.returning) {
          // Retour dans l'objet
          if (hi?.board) {
            const objWp = new THREE.Vector3();
            hi.board.getWorldPosition(objWp);
            sp.grp.position.lerp(objWp, 0.11);
            sp.grp.scale.lerp(new THREE.Vector3(0.2,0.2,0.2), 0.08);
            if (sp.grp.position.distanceTo(objWp) < 18) {
              scene.remove(sp.grp);
              stateRef.current.parchmentObj = null;
              hi.state = 'flying_out';
              stateRef.current._setHoldState?.(null);
            }
          } else {
            scene.remove(sp.grp); stateRef.current.parchmentObj = null;
          }
        } else {
          // Slide vers la droite de la caméra
          const pFwd = new THREE.Vector3(); camera.getWorldDirection(pFwd);
          const pRight = new THREE.Vector3().crossVectors(pFwd, new THREE.Vector3(0,1,0)).normalize();
          const pTarget = camera.position.clone()
            .addScaledVector(pFwd, 400)
            .addScaledVector(pRight, 240)
            .setY(camera.position.y - 5);
          sp.grp.position.lerp(pTarget, 0.07);
          // Rétablir la scale si elle avait été réduite
          sp.grp.scale.lerp(new THREE.Vector3(1.7,1.7,1.7), 0.1);
        }
      }

      // ── Objet en vol vers la caméra ──
      if (hi) {
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();

        const isLeft = hi.state === 'held_revealed' || hi.state === 'parchment_returning';

        if (hi.state === 'flying_in' || hi.state === 'held_center' || hi.state === 'held_revealed' || hi.state === 'parchment_returning') {
          const worldTarget = camera.position.clone()
            .addScaledVector(fwd, 420)
            .addScaledVector(right, isLeft ? -220 : 0);
          worldTarget.y = camera.position.y - 10;
          hi.group.updateWorldMatrix(true, false);
          const localTarget = hi.group.worldToLocal(worldTarget.clone());
          // En mode parchment_returning, l'objet reste sur place (pas de lerp)
          if (hi.state !== 'parchment_returning') {
            hi.board.position.lerp(localTarget, 0.07);
          }
          // Orientation de face (quaternion identité = local +Z vers caméra)
          hi.board.quaternion.slerp(new THREE.Quaternion(), 0.08);

          // Convergence flying_in
          if (hi.state === 'flying_in' && hi.board.position.distanceTo(localTarget) < 14) {
            if (hi.revealedOnStart) {
              hi.state = 'held_revealed';
              stateRef.current.requestParchment = { standIdx: hi.standIdx, itemIdx: hi.itemIdx };
              stateRef.current._setHoldState?.({ standIdx: hi.standIdx, itemIdx: hi.itemIdx, phase: 'revealed' });
            } else {
              hi.state = 'held_center';
              stateRef.current._setHoldState?.({ standIdx: hi.standIdx, itemIdx: hi.itemIdx, phase: 'center' });
            }
          }
        }

        if (hi.state === 'flying_out') {
          hi.board.position.lerp(hi.origLocalPos, 0.09);
          hi.board.quaternion.slerp(hi.origLocalQuat, 0.09);
          if (hi.board.position.distanceTo(hi.origLocalPos) < 8) {
            hi.board.position.copy(hi.origLocalPos);
            hi.board.quaternion.copy(hi.origLocalQuat);
            stateRef.current.heldItem = null;
            stateRef.current._setHoldState?.(null);
          }
        }
      }

      // ── Torches scintillantes ──────────────────────────────────────────────
      const tNow = performance.now() * 0.001;
      torchFlamesRef.current.forEach(({ mat, base, torchObj }, fi) => {
        if (torchObj && !torchObj.lit) return;
        mat.emissiveIntensity = Math.max(0, base + Math.sin(tNow*7.3+fi*2.1)*0.15 + Math.sin(tNow*14.6+fi*1.3)*0.08);
      });

      // ── Oiseaux ───────────────────────────────────────────────────────────
      birdsRef.current.forEach(bird => {
        bird.userData.x += bird.userData.speed * 0.016;
        if (bird.userData.x > 14000) bird.userData.x = -14000;
        bird.userData.flapT += 0.016 * 3.8;
        bird.position.set(bird.userData.x, bird.userData.y + Math.sin(bird.userData.x*0.0003)*160, bird.userData.z);
        const flap = Math.sin(bird.userData.flapT) * 0.55;
        // children[0]=corps, [1]=aile gauche (lGrp), [2]=aile droite (rGrp)
        bird.children[1].rotation.z = -flap; // gauche monte quand flap > 0
        bird.children[2].rotation.z =  flap; // droite monte symétriquement
      });

      // ── Bannières ondulantes ──────────────────────────────────────────────
      if (stateRef.current._bannerMeshes) {
        stateRef.current._bannerMeshes.forEach((bm, bi) => {
          const pos = bm.geometry.attributes.position;
          for (let vi = 0; vi < pos.count; vi++) {
            const u = (pos.getX(vi) + 60) / 120; // 0..1 left to right
            const wave = Math.sin(tNow * 2.2 + u * 3.5 + bm.userData.flapOffset) * 18 * u;
            pos.setZ(vi, wave);
          }
          pos.needsUpdate = true;
          bm.geometry.computeVertexNormals();
        });
      }

      // ── Sorcier suit le regard du joueur ─────────────────────────────────
      const sm = stateRef.current._sorcierModel;
      if (sm) {
        sm.rotation.y = Math.atan2(
          camera.position.x - sm.position.x,
          camera.position.z - sm.position.z
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Molette : défilement du parchemin 3D ──────────────────────────────────
    const onWheel = (e) => {
      const sp = stateRef.current.parchmentObj;
      if (!sp || sp.returning) return;
      const sd = sp.grp.userData?.scrollData;
      if (!sd) return;
      e.preventDefault();
      const delta = e.deltaY;
      sd.scrollOffset = Math.max(0, Math.min(sd.maxScroll, sd.scrollOffset + delta * 0.55));

      // Redessine le canvas d'affichage avec le nouvel offset
      const dCtx = sd.dCv.getContext('2d');
      dCtx.clearRect(0, 0, sd.CW, sd.DISP_H);
      dCtx.drawImage(sd.vCv, 0, sd.scrollOffset, sd.CW, sd.DISP_H, 0, 0, sd.CW, sd.DISP_H);
      sd.tex.needsUpdate = true;

      // Rotation des rouleaux (sens opposés — simulation de déroulement)
      // rotateY tourne autour de l'axe local Y du rouleau = axe du cylindre horizontal
      sd.topRoller.rotateY( delta * 0.012);
      sd.botRoller.rotateY(-delta * 0.012);
    };
    mount.addEventListener('wheel', onWheel, { passive: false });

    const stateSnap = stateRef.current;
    return () => {
      stateSnap._cancelJays?.();
      if (stateSnap._bubbleInterval) clearInterval(stateSnap._bubbleInterval);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('wheel', onWheel);
      renderer.dispose();
      sceneRef.current = null;
      sunRef.current   = null;
      moonRef.current  = null;
      rainRef.current  = null;
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  function onPointerDown(e) {
    const s = stateRef.current;
    s.dragX  = e.clientX;
    s.dragX0 = e.clientX;
    s.dragY0 = e.clientY;
    if (s.camera) s.rotY = -THREE.MathUtils.radToDeg(s.camera.rotation.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const s = stateRef.current;
    if (s.dragX === null) return;
    if (s.atStand) return; // pas de rotation quand on est face à un stand
    const dx = e.clientX - s.dragX;
    s.dragX = e.clientX;
    s.camTarget = null;
    s.rotY = Math.max(-70, Math.min(70, s.rotY + dx * 0.3));
    if (s.camera) s.camera.rotation.y = THREE.MathUtils.degToRad(-s.rotY);
  }
  function onPointerUp(e) {
    const s = stateRef.current;
    const moved = Math.hypot(
      e.clientX - (s.dragX0 ?? e.clientX),
      e.clientY - (s.dragY0 ?? e.clientY)
    );
    s.dragX = null;
    console.log(`[UP] moved=${moved.toFixed(1)} atStand=${s.atStand} → click=${s.atStand || moved < 6}`);
    if (s.atStand || moved < 6) handleStandClick(e);
  }
  function onPointerCancel() { stateRef.current.dragX = null; }

  function handleStandClick(e) {
    const s = stateRef.current;
    console.log(`[CLICK] camera=${!!s.camera} atStand=${s.atStand} heldItem=${s.heldItem?.state ?? 'none'}`);
    if (!s.camera) return;

    // ── Clic sur un lien dans le parchemin ouvert ──
    const pGrp = s.parchmentObj?.grp;
    if (pGrp?.userData?.linkAreas?.length) {
      const bounds = mountRef.current.getBoundingClientRect();
      const mouse  = new THREE.Vector2(
        ((e.clientX - bounds.left) / bounds.width)  *  2 - 1,
        -((e.clientY - bounds.top)  / bounds.height) *  2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouse, s.camera);
      const pHits = rc.intersectObject(pGrp, true);
      const pHit  = pHits.find(h => h.object.userData.isParchmentPlane);
      if (pHit?.uv) {
        const CW    = pHit.object.userData.CW    ?? 680;
        const DISPV = pHit.object.userData.DISP_H ?? 840;
        const cx    = pHit.uv.x * CW;
        const cy    = (1 - pHit.uv.y) * DISPV + (pGrp.userData.scrollData?.scrollOffset ?? 0);
        const hit   = pGrp.userData.linkAreas.find(a => cx >= a.x1 && cx <= a.x2 && cy >= a.y1 && cy <= a.y2);
        if (hit) {
          if (hit.download) {
            const a = document.createElement('a');
            a.href = hit.url; a.download = hit.download;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          } else {
            window.open(hit.url, '_blank', 'noopener,noreferrer');
          }
          return;
        }
      }
    }

    // Objet tenu → séquence de retour (parchemin rentre d'abord, puis objet repart)
    const activeStates = ['held_center','held_revealed','flying_in'];
    if (s.heldItem && activeStates.includes(s.heldItem.state)) {
      if (s.parchmentObj && !s.parchmentObj.returning) {
        // Parchemin rentre dans l'objet → puis flying_out déclenché automatiquement
        s.parchmentObj.returning = true;
        s.heldItem.state = 'parchment_returning';
        s._setHoldState?.(null);
      } else if (!s.parchmentObj) {
        s.heldItem.state = 'flying_out';
        s._setHoldState?.(null);
      }
      return;
    }

    const stands = standsRef.current;
    if (stands.length === 0) return;

    const bounds = mountRef.current.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((e.clientX - bounds.left) / bounds.width)  *  2 - 1,
      -((e.clientY - bounds.top)  / bounds.height) *  2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, s.camera);

    // ── Easter egg : détection des 3 pierres ──
    const eggHits = raycaster.intersectObjects(eggStonesRef.current.filter(Boolean), false);
    if (eggHits.length > 0) {
      const si2 = eggHits[0].object.userData.eggStone;
      if (si2 !== undefined && !s.atStand && !s.eggDive) {
        const seq = s._eggSequence ?? (s._eggSequence = []);
        const req = [0, 2, 1]; // gauche → droite → milieu
        // Enfoncer la pierre cliquée
        if (s._stoneTargetY && s._stoneOrigY) {
          s._stoneTargetY[si2] = s._stoneOrigY[si2] - 26;
        }
        seq.push(si2);
        const ok = seq.every((v, i) => v === req[i]);
        if (!ok) {
          // Mauvais ordre : tout remonter
          setTimeout(() => {
            if (s._stoneTargetY && s._stoneOrigY)
              [0,1,2].forEach(i => { s._stoneTargetY[i] = s._stoneOrigY[i]; });
          }, 320);
          seq.length = 0;
        } else if (seq.length === req.length) {
          seq.length = 0; triggerEasterEgg();
        }
        return;
      }
    }

    // ── Easter egg : les 8 torches du château ──
    if (!s.atStand && !s._torchEggDone) {
      const hitboxes = (s._torchObjects || []).filter(t => t.isEgg && t.hitbox).map(t => t.hitbox);
      if (hitboxes.length > 0) {
        const tHits = raycaster.intersectObjects(hitboxes, false);
        if (tHits.length > 0) {
          handleTorchClick(tHits[0].object.userData.torchIdx);
          return;
        }
      }
    }

    const groups = stands.map(sd => sd.group);

    // Multi-sample en croix sur le rayon du curseur (24px = moitié du curseur 48px)
    // → chaque clic couvre toute la zone visuelle du curseur, pas seulement le pixel exact
    const toNDC = (px, py) => new THREE.Vector2(
      ((px - bounds.left) / bounds.width)  *  2 - 1,
      -((py - bounds.top)  / bounds.height) *  2 + 1
    );
    const CURSOR_OFFSETS = [[0,0],[14,10],[28,10],[8,24],[24,24],[14,38],[30,38]];
    let standIdx, itemIdx, navStandIdx;
    for (const [dx, dy] of CURSOR_OFFSETS) {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(toNDC(e.clientX + dx, e.clientY + dy), s.camera);
      let si, ii;
      for (const inter of rc.intersectObjects(groups, true)) {
        const ud = inter.object.userData;
        if (si === undefined && ud.standIdx !== undefined) si = ud.standIdx;
        if (ii === undefined && ud.itemIdx  !== undefined) ii = ud.itemIdx;
        if (si !== undefined && ii !== undefined) break;
      }
      if (si !== undefined && ii !== undefined) { standIdx = si; itemIdx = ii; break; }
      if (si !== undefined && navStandIdx === undefined) navStandIdx = si;
    }
    if (standIdx === undefined && navStandIdx !== undefined) standIdx = navStandIdx;
    if (standIdx === undefined) return;

    // ── Mode "face à un stand" : pas de navigation, seulement les objets ──
    if (s.atStand) {
      if (itemIdx !== undefined) {
        const ref = (s.itemRefs ?? []).find(r => r.standIdx === standIdx && r.itemIdx === itemIdx);
        if (ref) {
          if (s.heldItem) s.heldItem.state = 'flying_out';
          const rev = s._revealedItems?.has?.(`${standIdx}_${itemIdx}`) ?? false;
          s.heldItem = {
            board: ref.board, group: ref.group,
            origLocalPos:  ref.board.userData.origLocalPos.clone(),
            origLocalQuat: ref.board.userData.origLocalQuat.clone(),
            state: 'flying_in',
            standIdx, itemIdx, revealedOnStart: rev,
          };
        }
      }
      return;
    }

    // ── Mode "place du marché" : naviguer vers le stand ──
    const { cx, cz, ry } = stands[standIdx];
    s.camTarget = { x: cx + Math.sin(ry) * 1700, z: cz + Math.cos(ry) * 1700, ry };

    if (itemIdx !== undefined) {
      const ref = (s.itemRefs ?? []).find(r => r.standIdx === standIdx && r.itemIdx === itemIdx);
      if (ref) {
        if (s.heldItem) s.heldItem.state = 'flying_out';
        s.pendingBoard = ref;
      }
    }
  }

  function triggerEasterEgg() {
    const s = stateRef.current;
    // Enfoncer les 3 pierres
    if (s._stoneTargetY && s._stoneOrigY) {
      [0,1,2].forEach(i => { s._stoneTargetY[i] = s._stoneOrigY[i] - 26; });
    }
    // Démarrer la caméra dans le puits
    setTimeout(() => {
      s.eggDive = { t: 0, done: false };
    }, 300);
  }

  function dismissDragon() {
    setEggPhase('fadeout');
    setTimeout(() => {
      stateRef.current._destroyCave?.();
      stateRef.current._restoreCam?.();
      // Remonter les 3 pierres du puit
      const s = stateRef.current;
      if (s._stoneTargetY && s._stoneOrigY) {
        [0,1,2].forEach(i => { s._stoneTargetY[i] = s._stoneOrigY[i]; });
      }
      s._eggSequence = [];
      setCoinCount(nc => nc + 50);
      setEggPhase(null);
    }, 900);
  }

  function handleKingGift() {
    setKingGone(true);
    setCoinCount(c => c + 10);
  }

  function handleBuy() {
    if (!holdState) return;
    const item = STANDS_CONTENT[holdState.standIdx]?.items[holdState.itemIdx];
    if (!item?.cost) return;
    if (coinCount < item.cost) return;
    setCoinCount(nc => nc - item.cost);
    // Poudre révélatrice (item 0 du sorcier)
    if (holdState.standIdx === 8 && holdState.itemIdx === 0) {
      setHasPowder(true);
    }
    // Parchemin PDF (item 1 du sorcier) — force le téléchargement
    if (holdState.standIdx === 8 && holdState.itemIdx === 1) {
      const a = document.createElement('a');
      a.href = '/florian-quillon-portfolio.pdf';
      a.download = 'Florian-Quillon-Portfolio.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Renvoyer l'objet à sa place
    const s = stateRef.current;
    if (s.heldItem) s.heldItem.state = 'flying_out';
    setHoldState(null);
  }

  function handleSaupoudrer() {
    const s = stateRef.current;
    if (!holdState) return;
    const { standIdx, itemIdx } = holdState;
    const key = `${standIdx}_${itemIdx}`;
    const newSet = new Set([...revealedItems, key]);
    setRevealedItems(newSet);
    s._revealedItems = newSet;
    // 1. Paillettes
    setSprinkling(true);
    // 2. Fumée après les paillettes (+ parchemin sort en même temps)
    setTimeout(() => {
      setSmokingPhase(true);
      s.requestParchment = { standIdx, itemIdx };
      if (s.heldItem) s.heldItem.state = 'held_revealed';
    }, 1000);
    // 3. Fin de l'animation
    setTimeout(() => {
      setSprinkling(false);
      setSmokingPhase(false);
      setHoldState({ standIdx, itemIdx, phase: 'revealed' });
    }, 2200);
  }

  // ── Easter egg torches ──────────────────────────────────────────────────────
  const TORCH_EGG_SEQ = [1, 4, 3, 6, 7, 2, 5, 0]; // spiral horaire : S-droite → E-avant → N-droite → O-avant → O-arrière → N-gauche → E-arrière → S-gauche

  function extinguishTorch(torchObj) {
    torchObj.lit = false;
    torchObj.flames.forEach(({ mat }) => {
      mat.color.setHex(0x111111);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    });
  }

  function relightTorch(torchObj) {
    torchObj.lit = true;
    torchObj.flames.forEach(({ mat, origColor, origEmissive, base }) => {
      mat.color.setHex(origColor);
      mat.emissive.setHex(origEmissive);
      mat.emissiveIntensity = base;
    });
  }

  function relightAllEggTorches() {
    const objs = stateRef.current._torchObjects || [];
    objs.filter(t => t.isEgg).forEach(t => relightTorch(t));
    stateRef.current._torchEggSeq = [];
  }

  function handleTorchClick(torchIdx) {
    const s = stateRef.current;
    const objs = s._torchObjects || [];
    const torchObj = objs[torchIdx];
    if (!torchObj || !torchObj.lit || !torchObj.isEgg || s._torchEggDone) return;

    const seq = s._torchEggSeq ?? (s._torchEggSeq = []);
    const pos = seq.length;

    extinguishTorch(torchObj);
    seq.push(torchIdx);

    if (TORCH_EGG_SEQ[pos] !== torchIdx) {
      // Mauvais ordre — tout rallumer après un délai
      setTimeout(relightAllEggTorches, 700);
    } else if (seq.length === TORCH_EGG_SEQ.length) {
      // Séquence complète !
      s._torchEggDone = true;
      setCoinCount(c => c + 50);
      setTimeout(() => {
        // Ciel noir + caméra tourne vers le ciel
        if (sceneRef.current) sceneRef.current.background = new THREE.Color(0x000000);
        stateRef.current._camTargetX = THREE.MathUtils.degToRad(72);
        // Feux d'artifice après que la caméra ait eu le temps de monter
        setTimeout(() => {
          setFireworksActive(true);
          // Dialog après quelques secondes de spectacle
          setTimeout(() => setTorchEggDone(true), 3500);
        }, 1100);
      }, 300);
    }
  }

  function dismissTorchEgg() {
    setTorchEggDone(false);
    setFireworksActive(false);
    stateRef.current._camTargetX = null; // retour caméra à -3°
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(0x2a3a5a);
    const eggTorches = (stateRef.current._torchObjects || []).filter(t => t.isEgg);
    eggTorches.forEach((t, i) => setTimeout(() => relightTorch(t), i * 200));
  }

  function handleBack() {
    const s = stateRef.current;

    // Déclencher la même séquence que le clic de rangement
    const activeStates = ['held_center', 'held_revealed', 'flying_in'];
    if (s.heldItem && activeStates.includes(s.heldItem.state)) {
      if (s.parchmentObj && !s.parchmentObj.returning) {
        s.parchmentObj.returning = true;
        s.heldItem.state = 'parchment_returning';
      } else if (!s.parchmentObj) {
        s.heldItem.state = 'flying_out';
      }
    }

    s.camTarget  = { x: 0, z: WALL_DIST * 0.85, ry: 0 };
    s.atStand    = false;
    s.pendingBoard = null;
    setAtStand(false);
    setHoldState(null);
  }

  const isDay = wx ? wx.isDay : true;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10, overflow: 'hidden', cursor: atStand ? 'pointer' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Étoiles (nuit) ── */}
      {!isDay && Array.from({ length: 40 }, (_, i) => (
        <div key={`star-${i}`} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 11, borderRadius: '50%',
          left: `${(i * 137.508) % 97}%`, top: `${(i * 83.721) % 55}%`,
          width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2,
          backgroundColor: `rgba(255,255,255,${0.35 + (i % 5) * 0.1})`,
        }} />
      ))}

      <div style={{ position: 'absolute', top: '5%', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 2, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {atStand ? 'CLIQUER sur un objet · ÉCHAP pour repartir' : 'CLIQUER-GLISSER POUR REGARDER'}
        </div>
      </div>

      {/* ── Boutique Sorcier / Saupoudrer / Poudre requise ── */}
      {holdState?.phase === 'center' && (() => {
        const si = holdState.standIdx, ii = holdState.itemIdx;
        const item = STANDS_CONTENT[si]?.items[ii];
        const isShop = item?.cost !== undefined;
        const alreadyRevealed = revealedItems.has(`${si}_${ii}`);

        // ── Boutique Sorcier ──────────────────────────────────────────────
        if (isShop) {
          const isPowder = si === 8 && ii === 0;
          const alreadyBought = isPowder && hasPowder;
          const canAfford = coinCount >= item.cost;
          return (
            <div
              style={{ position:'fixed', top:'50%', left:'60%', transform:'translateY(-50%)',
                zIndex:60, maxWidth:260, animation:'bubble-pop 0.35s ease-out forwards' }}
              onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}
            >
              <div style={{
                background:'linear-gradient(160deg,#1a0830,#0a0420)',
                border:'2px solid #8020e0', borderRadius:12,
                padding:'18px 20px', textAlign:'center',
                boxShadow:'0 0 24px rgba(128,0,255,0.5)',
                fontFamily:'Georgia,serif',
              }}>
                <div style={{fontSize:'1.5rem', marginBottom:6}}>🧙</div>
                <div style={{color:'#d870f0', fontWeight:700, fontSize:'0.95rem', marginBottom:4}}>
                  {item.title}
                </div>
                {item.content.map((l,i)=>(
                  <div key={i} style={{color:'#a850c8', fontSize:'0.78rem', lineHeight:1.5}}>{l}</div>
                ))}
                <div style={{
                  color:'#ffd700', fontWeight:700, fontSize:'1rem',
                  margin:'12px 0 8px', letterSpacing:1,
                }}>
                  {item.cost} 🪙
                  <span style={{color:'#907030', fontSize:'0.78rem', marginLeft:8}}>
                    (vous : {coinCount})
                  </span>
                </div>
                {alreadyBought ? (
                  <div style={{color:'#60c060', fontWeight:700, fontSize:'0.85rem'}}>
                    ✓ Déjà en votre possession
                  </div>
                ) : canAfford ? (
                  <button onClick={handleBuy} style={{
                    background:'linear-gradient(135deg,#c89820,#8b6010)',
                    border:'2px solid #ffd040', borderRadius:8,
                    color:'#1a0a00', fontSize:'0.88rem', fontFamily:'Georgia,serif',
                    fontWeight:700, padding:'8px 20px', cursor:'pointer',
                    boxShadow:'0 0 12px rgba(200,150,0,0.5)',
                  }}>
                    Acheter ✓
                  </button>
                ) : (
                  <div style={{color:'#cc4444', fontSize:'0.82rem', fontWeight:700}}>
                    Fonds insuffisants 😞
                  </div>
                )}
              </div>
            </div>
          );
        }

        // ── Saupoudrer bloqué (pas de poudre) ────────────────────────────
        if (!hasPowder && !alreadyRevealed) {
          return (
            <div
              style={{ position:'fixed', top:'50%', left:'62%', transform:'translateY(-50%)',
                zIndex:60, animation:'bubble-pop 0.35s ease-out forwards' }}
              onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}
            >
              <div style={{
                background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)',
                border:'2px solid #555', borderRadius:12,
                padding:'14px 20px', textAlign:'center',
                fontFamily:'Georgia,serif', color:'#888',
                boxShadow:'0 4px 16px rgba(0,0,0,0.7)',
                maxWidth:220,
              }}>
                <div style={{fontSize:'1.4rem', marginBottom:6}}>🧪</div>
                <div style={{fontSize:'0.82rem', lineHeight:1.5}}>
                  Poudre Révélatrice requise !<br/>
                  <span style={{color:'#6a3a8a'}}>Allez chez le Sorcier</span><br/>
                  pour en acheter une fiole.
                </div>
              </div>
            </div>
          );
        }

        // ── Saupoudrer (poudre disponible, pas encore révélé) ────────────
        if (!alreadyRevealed) {
          return (
            <div
              style={{ position:'fixed', top:'50%', left:'62%', transform:'translateY(-50%)', zIndex:60 }}
              onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}
            >
              <button onClick={handleSaupoudrer} style={{
                background:'linear-gradient(135deg,#2a0060 0%,#6a0090 60%,#3a0070 100%)',
                border:'2px solid #c090ff', borderRadius:12,
                color:'#f0d0ff', fontSize:'1rem', fontFamily:'Georgia,serif', fontWeight:700,
                padding:'12px 24px', cursor:'pointer', letterSpacing:1,
                boxShadow:'0 0 20px rgba(180,80,255,0.6),inset 0 1px 0 rgba(255,200,255,0.3)',
                animation:'bubble-pop 0.4s ease-out forwards',
              }}>
                ✨ Saupoudrer
              </button>
            </div>
          );
        }

        return null;
      })()}

      {/* ── Paillettes qui tombent ── */}
      {sprinkling && Array.from({length:28},(_, i)=>(
        <div key={`g${i}`} style={{
          position:'fixed', pointerEvents:'none', zIndex:300,
          left:`${5+(i*37.13+i*i*1.7)%90}%`,
          top:`${-5-(i%4)*3}%`,
          width: 6+i%5, height: 6+i%5,
          borderRadius: i%3===0 ? '50%' : '2px',
          background: ['#ffd700','#ff8c00','#c0c0c0','#ff69b4','#7fffd4','#ff4500','#ffffff'][i%7],
          animation:`glitter-fall ${0.9+(i*0.13)%1.0}s ease-in ${(i*0.07)%0.9}s both`,
          transform:`rotate(${i*43}deg)`,
        }}/>
      ))}

      {/* ── Fumée (après les paillettes) ── */}
      {smokingPhase && Array.from({length:200},(_, i)=>(
        <div key={`sm${i}`} style={{
          position:'fixed', pointerEvents:'none', zIndex:290,
          left:`${(i*13.7+i*i*0.4)%95}%`,
          top:`${20+(i*7.3+i%5*9)%55}%`,
          width:  60 + (i*23)%140,
          height: 60 + (i*23)%140,
          borderRadius:'50%',
          background:`rgba(${160+(i*7)%80},${155+(i*5)%70},${185+(i*9)%60},${0.25+((i*3)%4)*0.09})`,
          filter:`blur(${8+(i*3)%18}px)`,
          animation:`smoke-puff ${0.8+(i*0.17)%1.5}s ease-out ${(i*0.09)%1.1}s both`,
        }}/>
      ))}

      {/* ── Bouton retour (visible face à un stand) ── */}
      {atStand && (
        <div
          style={{
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, pointerEvents: 'auto',
            animation: 'bubble-pop 0.3s ease-out forwards',
          }}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
        >
          <button
            onClick={handleBack}
            style={{
              background: 'linear-gradient(180deg,#5a3a1a 0%,#3a2008 100%)',
              border: '3px solid #c89820',
              borderRadius: 8,
              color: '#f0d890',
              fontSize: '0.9rem',
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              letterSpacing: 1,
              padding: '10px 28px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,100,0.2)',
            }}
          >
            ← Place du marché
          </button>
        </div>
      )}
      {flashIn && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'white', pointerEvents: 'none', animation: 'flash-out 0.8s ease-out forwards' }} />
      )}

      {/* ── Easter egg : overlay retour (fadeout) ── */}
      {eggPhase === 'fadeout' && (
        <div style={{ position:'fixed', inset:0, zIndex:900, background:'#000',
          opacity:1, pointerEvents:'all', animation:'cave-fadeout 0.9s ease both' }}/>
      )}
      {eggPhase === 'dialog' && (
        <div style={{ position:'fixed', inset:0, zIndex:910,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          pointerEvents:'none' }}>
          {/* Bulle de dialogue dragon */}
          <div style={{
            background:'linear-gradient(135deg,#1a3a0a,#0a1a04)',
            border:'4px solid #4aaa20', borderRadius:12,
            padding:'28px 36px 20px', maxWidth:500, textAlign:'center',
            boxShadow:'0 0 40px rgba(80,255,20,0.3), 0 8px 32px rgba(0,0,0,0.9)',
            fontFamily:'Georgia,serif', color:'#c0ff80',
            animation:'bubble-pop 0.4s ease-out forwards',
            pointerEvents:'auto',
          }} onPointerDown={e=>e.stopPropagation()}>
            <div style={{fontSize:'2rem',marginBottom:10}}>🐉</div>
            <p style={{margin:'0 0 8px',fontSize:'1rem',lineHeight:1.6,color:'#e0ff90'}}>
              <strong>MWA HA HA HA !</strong>
            </p>
            <p style={{margin:'0 0 12px',fontSize:'0.9rem',lineHeight:1.6}}>
              Félicitations, brave explorateur ! Tu as découvert ma grotte secrète !<br/>
              En récompense de ta persévérance et de ta curiosité... voici{' '}
              <span style={{color:'#ffd700',fontWeight:700}}>50 pièces d'or !</span>
            </p>
            <p style={{margin:'0 0 18px',fontSize:'0.85rem',color:'#a0c870',fontStyle:'italic'}}>
              Maintenant PARTEZ avant que je change d'avis et que je vous fasse RÔTIR ! 🔥
            </p>
            <button
              onClick={dismissDragon}
              style={{
                background:'linear-gradient(135deg,#c89820,#a07010)',
                border:'2px solid #ffd040', borderRadius:8,
                color:'#1a1000', fontSize:'0.9rem', fontFamily:'Georgia,serif',
                fontWeight:700, padding:'10px 28px', cursor:'pointer',
                boxShadow:'0 4px 12px rgba(200,150,0,0.5)',
              }}>
              Prendre l'or et fuir ! 💨
            </button>
          </div>
        </div>
      )}

      {/* ── Overlay plongée puits (opacité gérée UNIQUEMENT via ref, pas React) ── */}
      <div ref={eggDiveOverlayRef} style={{
        position:'fixed', inset:0, zIndex:895, background:'#000',
        pointerEvents:'none',
      }}/>

      {/* ── Inventaire (bottom-left) ── */}
      {!eggPhase && (coinCount > 0 || hasPowder) && (
        <div style={{
          position:'fixed', bottom:20, left:20, zIndex:80,
          display:'flex', flexDirection:'column', alignItems:'flex-start',
          gap:10, pointerEvents:'none',
        }}>

          {/* Poudre révélatrice */}
          {hasPowder && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              animation:'bubble-pop 0.5s ease-out forwards',
            }}>
              {/* Fiole CSS style Lego */}
              <div style={{ position:'relative', width:52, height:64, flexShrink:0 }}>
                {/* Corps de la fiole */}
                <div style={{
                  position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
                  width:36, height:44, borderRadius:'4px 4px 10px 10px',
                  background:'linear-gradient(160deg,#a050e0 0%,#6010a0 60%,#3a0070 100%)',
                  border:'2px solid #c080ff',
                  boxShadow:'0 0 12px rgba(180,80,255,0.7), inset 0 2px 4px rgba(255,200,255,0.3)',
                }}/>
                {/* Col */}
                <div style={{
                  position:'absolute', bottom:44, left:'50%', transform:'translateX(-50%)',
                  width:18, height:14, borderRadius:'2px',
                  background:'linear-gradient(180deg,#7030b0,#5010a0)',
                  border:'2px solid #c080ff', borderBottom:'none',
                }}/>
                {/* Bouchon */}
                <div style={{
                  position:'absolute', bottom:56, left:'50%', transform:'translateX(-50%)',
                  width:22, height:10, borderRadius:'2px',
                  background:'linear-gradient(180deg,#8b5e3c,#5a3010)',
                  border:'1.5px solid #c09060',
                }}/>
                {/* Reflet */}
                <div style={{
                  position:'absolute', bottom:8, left:'calc(50% - 14px)',
                  width:6, height:20, borderRadius:'3px',
                  background:'rgba(255,255,255,0.25)',
                }}/>
                {/* Lueur */}
                <div style={{
                  position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                  width:32, height:32, borderRadius:'50%',
                  background:'rgba(160,80,255,0.18)',
                  filter:'blur(6px)',
                }}/>
              </div>
              {/* Label */}
              <div style={{
                background:'rgba(60,0,100,0.75)', border:'1.5px solid #8020e0',
                borderRadius:6, padding:'4px 10px',
                color:'#d870f0', fontFamily:'Georgia,serif',
                fontSize:'0.78rem', fontWeight:700,
                textShadow:'0 0 8px rgba(200,80,255,0.8)',
                boxShadow:'0 2px 8px rgba(0,0,0,0.6)',
              }}>
                ✨ Poudre<br/>
                <span style={{color:'#a850c8', fontSize:'0.68rem', fontWeight:400}}>Révélatrice</span>
              </div>
            </div>
          )}

          {/* Bourse de pièces */}
          {coinCount > 0 && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              animation:'bubble-pop 0.5s ease-out forwards',
            }}>
              <div style={{ position:'relative', width:52, height:56, flexShrink:0 }}>
                <img src="/coin_purse.png" alt="bourse"
                  style={{ width:52, height:52, imageRendering:'pixelated',
                    filter:'drop-shadow(0 2px 8px rgba(200,150,0,0.9))' }}
                  onError={e => { e.currentTarget.style.display='none'; }}
                />
                {/* Fallback emoji */}
                <div style={{
                  position:'absolute', inset:0, display:'flex',
                  alignItems:'center', justifyContent:'center',
                  fontSize:'2rem', zIndex:-1,
                }}>💰</div>
              </div>
              <div style={{
                background:'rgba(60,40,0,0.75)', border:'1.5px solid #d4a030',
                borderRadius:6, padding:'4px 10px',
                color:'#ffd700', fontFamily:'Georgia,serif',
                fontSize:'0.95rem', fontWeight:700,
                textShadow:'0 0 8px rgba(200,150,0,0.6)',
                boxShadow:'0 2px 8px rgba(0,0,0,0.6)',
                letterSpacing:1,
              }}>
                ×{coinCount}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Zone bas-droite : progression + journal + bouton aide ── */}
      {!eggPhase && (
        <div style={{
          position:'fixed', bottom:20, right:20, zIndex:80,
          display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6,
        }}>
          {revealedItems.size > 0 && (
            <div style={{
              pointerEvents:'none',
              background:'rgba(20,12,0,0.75)', border:'1.5px solid #c89820',
              borderRadius:8, padding:'6px 14px', fontFamily:'Georgia,serif',
              color:'#ffd700', fontSize:'0.78rem', fontWeight:700,
              boxShadow:'0 2px 8px rgba(0,0,0,0.6)',
              textShadow:'0 0 8px rgba(200,150,0,0.5)',
            }}>
              📜 {revealedItems.size} / 24 révélés
            </div>
          )}
          {revealedItems.size > 0 && (
            <button
              onClick={() => setShowQuest(q => !q)}
              onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}
              style={{
                background:'rgba(20,12,0,0.75)', border:'1.5px solid #c89820',
                borderRadius:8, padding:'6px 12px',
                color:'#ffd700', fontFamily:'Georgia,serif', fontSize:'0.78rem', fontWeight:700,
                cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.5)',
              }}>📖 Journal</button>
          )}
          <button
            onClick={() => setShowHelp(h => !h)}
            onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}
            style={{
              background:'rgba(20,12,0,0.75)', border:'2px solid #c89820',
              borderRadius:'50%', width:36, height:36, color:'#ffd700',
              fontFamily:'Georgia,serif', fontWeight:700, fontSize:'1.1rem',
              cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.5)',
            }}>?</button>
        </div>
      )}

      {/* ── Panneau d'aide ── */}
      {showHelp && (
        <div style={{
          position:'fixed', top:62, right:18, zIndex:90, maxWidth:280,
          background:'linear-gradient(160deg,#2a1a04,#1a0e00)',
          border:'2px solid #c89820', borderRadius:10,
          padding:'16px 20px', fontFamily:'Georgia,serif',
          color:'#f0d890', boxShadow:'0 8px 32px rgba(0,0,0,0.8)',
          animation:'bubble-pop 0.25s ease-out',
        }}
        onPointerDown={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>
          <div style={{fontWeight:700, fontSize:'0.95rem', marginBottom:10, borderBottom:'1px solid #c8982066', paddingBottom:6}}>
            ⚔️ Contrôles
          </div>
          {[
            ['🖱️ Cliquer-glisser','Regarder autour'],
            ['🖱️ Cliquer stand','S\'approcher'],
            ['🖱️ Cliquer objet','Examiner'],
            ['🖱️ Molette parchemin','Dérouler'],
            ['⌨️ Échap','Reculer'],
            ['✨ Saupoudrer','Révéler le contenu'],
          ].map(([key, val]) => (
            <div key={key} style={{display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, fontSize:'0.78rem'}}>
              <span style={{color:'#c89820'}}>{key}</span>
              <span style={{color:'#d4b870', textAlign:'right'}}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Journal de quête ── */}
      {showQuest && (
        <div style={{
          position:'fixed', inset:0, zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.6)',
        }}
        onPointerDown={e=>{e.stopPropagation(); setShowQuest(false);}}
        onPointerUp={e=>e.stopPropagation()}>
          <div style={{
            background:'linear-gradient(160deg,#2a1a04,#1a0e00)',
            border:'2px solid #c89820', borderRadius:12,
            padding:'24px 28px', maxWidth:560, width:'90vw', maxHeight:'80vh', overflowY:'auto',
            fontFamily:'Georgia,serif', color:'#f0d890',
            boxShadow:'0 12px 48px rgba(0,0,0,0.9)',
            animation:'bubble-pop 0.3s ease-out',
          }}
          onPointerDown={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:'1.1rem', marginBottom:16, borderBottom:'1px solid #c8982066', paddingBottom:8}}>
              📜 Journal des Parchemins — {revealedItems.size}/24
            </div>
            {STANDS_CONTENT.slice(0, 8).map((stand, si) => {
              const def = [{role:'Forgeron'},{role:'Moine'},{role:'Artisan'},{role:'Paysan'},{role:'Boucher'},{role:'Poissonnier'},{role:'Boulanger'},{role:'Tavernier'}][si];
              return (
                <div key={si} style={{marginBottom:14}}>
                  <div style={{fontWeight:700, color:'#c89820', fontSize:'0.85rem', marginBottom:4}}>
                    {def.role}
                  </div>
                  {stand.items.map((item, ii) => {
                    const revealed = revealedItems.has(`${si}_${ii}`);
                    return (
                      <div key={ii} style={{
                        display:'flex', alignItems:'center', gap:8, marginBottom:3,
                        fontSize:'0.75rem', color: revealed ? '#d4b870' : '#665544',
                      }}>
                        <span>{revealed ? '✓' : '○'}</span>
                        <span>{revealed ? item.title : '???'}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Événement nuit (0h-5h) ── */}
      {nightGift && (
        <div style={{
          position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          zIndex:300, textAlign:'center',
          background:'linear-gradient(135deg,#06091a,#111e3a)',
          border:'2px solid #88aaff', borderRadius:14,
          padding:'28px 36px', fontFamily:'Georgia,serif', color:'#c8d8ff',
          boxShadow:'0 0 60px rgba(100,140,255,0.3), 0 12px 40px rgba(0,0,0,0.9)',
          animation:'bubble-pop 0.4s ease-out forwards',
          maxWidth:380,
        }}
        onPointerDown={e=>{e.stopPropagation(); setNightGift(false);}}
        onPointerUp={e=>e.stopPropagation()}>
          <div style={{fontSize:'2rem', marginBottom:10}}>🌙✨</div>
          <div style={{fontWeight:700, fontSize:'1rem', marginBottom:8, color:'#aac8ff'}}>
            Âme nocturne !
          </div>
          <p style={{margin:'0 0 12px', fontSize:'0.88rem', lineHeight:1.6}}>
            Tu visites le portfolio entre minuit et l'aube...<br/>
            Les astres te récompensent de{' '}
            <span style={{color:'#ffd700', fontWeight:700}}>3 pièces d'or</span> !
          </p>
          <button onClick={() => setNightGift(false)} style={{
            background:'linear-gradient(135deg,#1a2870,#0a1240)',
            border:'1.5px solid #6688dd', borderRadius:8,
            color:'#aac8ff', fontFamily:'Georgia,serif', fontSize:'0.85rem',
            padding:'8px 20px', cursor:'pointer',
          }}>Merci, les étoiles !</button>
        </div>
      )}

      {/* ── Feux d'artifice ── */}
      <Fireworks active={fireworksActive} />

      {/* ── Easter egg torches : dialog récompense ── */}
      {torchEggDone && (
        <div style={{
          position:'fixed', inset:0, zIndex:910,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          pointerEvents:'none',
        }}>
          <div style={{
            background:'rgba(15,5,0,0.88)',
            border:'3px solid #ff8800', borderRadius:14,
            padding:'28px 36px 22px', maxWidth:480, textAlign:'center',
            boxShadow:'0 0 80px rgba(255,140,0,0.6), 0 8px 40px rgba(0,0,0,0.9)',
            fontFamily:'Georgia,serif', color:'#ffe0b0',
            animation:'bubble-pop 0.4s ease-out forwards',
            pointerEvents:'auto',
            backdropFilter:'blur(2px)',
          }} onPointerDown={e=>e.stopPropagation()}>
            <div style={{fontSize:'2.5rem', marginBottom:10}}>🎆</div>
            <div style={{fontWeight:700, fontSize:'1.1rem', marginBottom:10, color:'#ffaa40', letterSpacing:1}}>
              L'Esprit des Flammes !
            </div>
            <p style={{margin:'0 0 10px', fontSize:'0.92rem', lineHeight:1.65}}>
              Tu as trouvé l'ordre secret des torches... peu y parviennent.
            </p>
            <p style={{margin:'0 0 16px', fontSize:'0.88rem', lineHeight:1.65, color:'#ffcc80'}}>
              {/* ✏️ À PERSONNALISER — message secret du développeur */}
              En récompense, voici <span style={{color:'#ffd700', fontWeight:700}}>50 pièces d'or</span> et un secret :{' '}
              ce portfolio a été entièrement construit en Three.js et React, sans aucun framework 3D tiers. 🏗️
            </p>
            <button onClick={dismissTorchEgg} style={{
              background:'linear-gradient(135deg,#cc6600,#8b3a00)',
              border:'2px solid #ff8800', borderRadius:8,
              color:'#ffe0a0', fontFamily:'Georgia,serif', fontWeight:700,
              fontSize:'0.9rem', padding:'10px 28px', cursor:'pointer',
              boxShadow:'0 4px 14px rgba(200,80,0,0.5)',
            }}>
              Merci, Esprit ! 🙏
            </button>
          </div>
        </div>
      )}

      {/* ── Roi tutoriel ── */}
      {showKing && !kingGone && (
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, zIndex: 40,
            display: 'flex', alignItems: 'flex-end',
            padding: '0 0 0 12px', cursor: 'default',
            animation: 'king-rise 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
          onPointerDown={e => e.stopPropagation()}
          onPointerMove={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
        >
          <img src="/lego_roi.png" alt="" draggable={false}
            style={{ height: 1000, userSelect: 'none', flexShrink: 0, transform: 'translateY(90px)', imageRendering: 'pixelated' }} />

          <div style={{
            position: 'relative', background: '#fff', border: '3px solid #111',
            borderRadius: 12, padding: '18px 44px 16px 18px',
            maxWidth: 420, marginBottom: 550,
            boxShadow: '5px 5px 0 rgba(0,0,0,0.4)',
            fontFamily: '"Courier New",monospace',
            animation: 'bubble-pop 0.35s ease-out forwards',
          }}>
            {/* Triangle pointant vers le roi (gauche) */}
            <div style={{
              position: 'absolute', left: -19, bottom: 30,
              width: 0, height: 0,
              borderTop: '12px solid transparent',
              borderBottom: '12px solid transparent',
              borderRight: '19px solid #111',
            }} />
            <div style={{
              position: 'absolute', left: -14, bottom: 32,
              width: 0, height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderRight: '15px solid #fff',
            }} />

            {/* Fermer */}
            <button onClick={handleKingGift} style={{
              position: 'absolute', top: 8, right: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.1rem', color: '#aaa', padding: 0, lineHeight: 1,
            }}>✕</button>

            <p key={kingMsg} style={{
              margin: '0 0 14px', fontSize: '1rem', lineHeight: 1.6,
              color: '#111', animation: 'msg-in 0.22s ease-out forwards',
            }}>
              {KING_MESSAGES[kingMsg]}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Points de progression */}
              <div style={{ display: 'flex', gap: 5 }}>
                {KING_MESSAGES.map((_, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i === kingMsg ? '#222' : '#ddd',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>

              {kingMsg < KING_MESSAGES.length - 1 ? (
                <button onClick={() => setKingMsg(m => m + 1)} style={{
                  background: '#ffd700', border: '2.5px solid #111',
                  borderRadius: 6, cursor: 'pointer',
                  padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700,
                  boxShadow: '2px 2px 0 #111', fontFamily: 'inherit',
                }}>Suivant →</button>
              ) : (
                <button onClick={handleKingGift} style={{
                  background: '#ffd700', border: '2.5px solid #111',
                  borderRadius: 6, cursor: 'pointer',
                  padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700,
                  boxShadow: '2px 2px 0 #111', fontFamily: 'inherit',
                }}>Bonne visite ! ✓</button>
              )}
            </div>
          </div>
        </div>
      )}



<style>{`
        @keyframes flash-out  { from { opacity:1 } to { opacity:0 } }
        @keyframes king-rise  { from { transform:translateY(110%); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @keyframes bubble-pop { 0% { transform:scale(0.8); opacity:0 } 60% { transform:scale(1.04) } 100% { transform:scale(1); opacity:1 } }
        @keyframes msg-in     { from { opacity:0; transform:translateY(5px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popup-in    { from { opacity:0 } to { opacity:1 } }
        @keyframes popup-slide { from { transform:scale(0.88) translateY(12px); opacity:0 } to { transform:scale(1) translateY(0); opacity:1 } }
        @keyframes glitter-fall{ 0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1} 100%{transform:translateY(105vh) rotate(600deg) scale(0.2);opacity:0} }
        @keyframes cave-blackout{ from{opacity:0} to{opacity:1} }
        @keyframes cave-fadein  { from{opacity:1} to{opacity:0} }
        @keyframes cave-fadeout { from{opacity:0} to{opacity:1} }
        @keyframes smoke-puff    { 0%{transform:scale(0.3) translateY(0);opacity:0.7} 100%{transform:scale(4) translateY(-80px);opacity:0} }
      `}</style>
    </div>
  );
}
