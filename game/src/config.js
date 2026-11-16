// EMBERLINE — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** The beacon at the centre of the arena: lose the game if its hull reaches zero. */
export const BEACON = { x: 640, y: 360, radius: 46, hull: 260 };

export const PLAYER = {
  radius: 16,
  speed: 305,
  hull: 100,
  fireInterval: 0.16,
  bulletSpeed: 760,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 2.4,
  dashInvulnerable: 0.35,
  hitInvulnerable: 0.7,
  pickupRadius: 90,
};

/** Wave table: how many of each drone a wave sends, and how fast they trickle in. */
export const WAVES = [
  { cinder: 6, spitter: 0, splitter: 0, bulwark: 0, boss: 0, interval: 1.15 },
  { cinder: 9, spitter: 2, splitter: 0, bulwark: 0, boss: 0, interval: 1.05 },
  { cinder: 10, spitter: 4, splitter: 2, bulwark: 0, boss: 0, interval: 0.95 },
  { cinder: 12, spitter: 5, splitter: 4, bulwark: 1, boss: 0, interval: 0.9 },
  { cinder: 14, spitter: 6, splitter: 5, bulwark: 2, boss: 0, interval: 0.85 },
  { cinder: 16, spitter: 8, splitter: 6, bulwark: 3, boss: 0, interval: 0.8 },
  { cinder: 18, spitter: 9, splitter: 8, bulwark: 4, boss: 0, interval: 0.75 },
  { cinder: 20, spitter: 10, splitter: 9, bulwark: 5, boss: 0, interval: 0.7 },
  { cinder: 22, spitter: 12, splitter: 10, bulwark: 6, boss: 0, interval: 0.65 },
  { cinder: 10, spitter: 6, splitter: 6, bulwark: 4, boss: 1, interval: 0.6 },
];

export const ENEMY = {
  cinder: { radius: 14, hull: 22, speed: 98, damage: 8, score: 50, scrap: 2, colour: '#ff7a3c' },
  spitter: { radius: 17, hull: 34, speed: 62, damage: 10, score: 100, scrap: 3, colour: '#c77dff', range: 280, shotInterval: 2.3, orbSpeed: 210 },
  splitter: { radius: 20, hull: 48, speed: 72, damage: 12, score: 150, scrap: 3, colour: '#3ce0a0' },
  bulwark: { radius: 30, hull: 175, speed: 40, damage: 20, score: 300, scrap: 5, colour: '#e5534b' },
  boss: { radius: 52, hull: 1500, speed: 46, damage: 26, score: 5000, scrap: 40, colour: '#ffd166', shotInterval: 1.6, orbSpeed: 240 },
};

/** Upgrade cards offered between waves: id, name, flavour, max stacks, apply. */
export const UPGRADES = [
  { id: 'damage', name: 'Overcharged Rounds', desc: '+25% bullet damage', max: 5, icon: 'DMG' },
  { id: 'rate', name: 'Rapid Cycler', desc: '+20% fire rate', max: 5, icon: 'RPM' },
  { id: 'multishot', name: 'Twin Barrels', desc: '+1 projectile per shot', max: 2, icon: 'x2' },
  { id: 'pierce', name: 'Piercing Rounds', desc: 'Bullets pierce +1 enemy', max: 3, icon: '>>>' },
  { id: 'speed', name: 'Ion Thrusters', desc: '+12% move speed', max: 4, icon: 'ION' },
  { id: 'plating', name: 'Ablative Plating', desc: '+30 max hull, repair 30', max: 5, icon: 'ARM' },
  { id: 'beacon', name: 'Beacon Mending', desc: 'Repair the beacon +45 hull', max: 9, icon: 'LGT' },
  { id: 'dash', name: 'Dash Capacitor', desc: '-30% dash cooldown', max: 3, icon: 'DSH' },
  { id: 'magnet', name: 'Scrap Magnet', desc: '+70% pickup radius', max: 3, icon: 'MAG' },
  { id: 'surge', name: 'Adrenal Surge', desc: '+12% damage, +8% speed', max: 4, icon: 'SUR' },
];

export const COMBO_WINDOW = 3.0;
export const SCRAP_SCORE = 10;
export const TOTAL_WAVES = 10;

export const PALETTE = {
  skyTop: '#0b1026',
  skyMid: '#1c1440',
  skyLow: '#3d1e2e',
  horizon: '#b4502e',
  star: '#dfe6ff',
  ruinFar: '#171233',
  ruinNear: '#0e0b22',
  ground: '#14102a',
  grid: 'rgba(120, 140, 255, 0.07)',
  beaconCore: '#ffd166',
  beaconRing: '#ff9f1c',
  player: '#4fc3f7',
  playerDark: '#1b6ca8',
  bullet: '#ffe66d',
  scrap: '#ffd166',
  text: '#eef1f5',
  muted: '#9aa3b8',
  danger: '#ff5964',
  heal: '#3ce0a0',
  panel: 'rgba(16, 20, 44, 0.88)',
  panelEdge: '#3a4370',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberline.best';
