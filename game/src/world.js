// The simulation: one fixed-step world. The player skiff defends the beacon
// against ten waves of ember drones; the tenth ends with the Ash Sovereign.
// Everything random comes from the seeded RNG, so a seed replays identically.

import { BEACON, COMBO_WINDOW, ENEMY, FIELD, PLAYER, SCRAP_SCORE, TOTAL_WAVES, UPGRADES, WAVES } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_BEACON_HIT = 16;

const TAU = Math.PI * 2;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function makePlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 170,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hull: PLAYER.hull,
    maxHull: PLAYER.hull,
    speed: PLAYER.speed,
    damage: PLAYER.bulletDamage,
    fireInterval: PLAYER.fireInterval,
    projectiles: 1,
    pierce: 0,
    pickupRadius: PLAYER.pickupRadius,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    invulnerable: 0,
    trail: 0,
  };
}

export function createWorld(random) {
  const state = {
    time: 0,
    wave: 0,
    wavePhase: 'idle',
    spawnQueue: [],
    spawnTimer: 0,
    player: makePlayer(),
    beaconHull: BEACON.hull,
    beaconMax: BEACON.hull,
    enemies: [],
    bullets: [],
    orbs: [],
    particles: [],
    floaters: [],
    pickups: [],
    score: 0,
    scrap: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    shake: 0,
    boss: null,
    bossTimer: 0,
    summonTimer: 0,
    upgradesTaken: {},
    upgradeChoices: [],
    banner: '',
    bannerTimer: 0,
    attractKills: 0,
  };

  function addParticles(x, y, count, colour, speed, size, life = 0.6) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.angle();
      const velocity = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random.range(life * 0.5, life),
        maxLife: life,
        size: random.range(size * 0.5, size),
        colour,
      });
    }
    if (state.particles.length > 420) state.particles.splice(0, state.particles.length - 420);
  }

  function addFloater(x, y, text, colour) {
    state.floaters.push({ x, y, text, colour, life: 1.1 });
    if (state.floaters.length > 24) state.floaters.shift();
  }

  function spawnEnemy(kind, x, y) {
    const def = ENEMY[kind];
    const enemy = {
      kind,
      x, y,
      vx: 0, vy: 0,
      radius: def.radius,
      hull: def.hull,
      maxHull: def.hull,
      speed: def.speed * random.range(0.92, 1.08),
      damage: def.damage,
      score: def.score,
      scrap: def.scrap,
      colour: def.colour,
      attackTimer: random.range(0.2, 0.8),
      shotTimer: random.range(1, def.shotInterval ?? 2),
      wobble: random.angle(),
      flash: 0,
    };
    if (kind === 'boss') {
      state.boss = enemy;
      state.bossTimer = 0;
      state.summonTimer = 6;
    }
    state.enemies.push(enemy);
    return enemy;
  }

  function spawnEdge(kind) {
    const side = random.int(0, 3);
    const margin = 30;
    let x;
    let y;
    if (side === 0) { x = random.range(margin, FIELD.width - margin); y = margin; }
    else if (side === 1) { x = random.range(margin, FIELD.width - margin); y = FIELD.height - margin; }
    else if (side === 2) { x = margin; y = random.range(margin, FIELD.height - margin); }
    else { x = FIELD.width - margin; y = random.range(margin, FIELD.height - margin); }
    return spawnEnemy(kind, x, y);
  }

  function startWave(number) {
    const def = WAVES[number - 1];
    const queue = [];
    for (const kind of ['cinder', 'spitter', 'splitter', 'bulwark', 'boss']) {
      for (let i = 0; i < (def[kind] ?? 0); i += 1) queue.push(kind);
    }
    // Shuffle with the seeded RNG, but keep the boss last.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random.next() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    queue.sort((a, b) => (a === 'boss' ? 1 : 0) - (b === 'boss' ? 1 : 0));
    state.wave = number;
    state.wavePhase = 'spawning';
    state.spawnQueue = queue;
    state.spawnTimer = 0.6;
    state.banner = number === TOTAL_WAVES ? 'FINAL WAVE — THE ASH SOVEREIGN' : `WAVE ${number}`;
    state.bannerTimer = 2.4;
  }

  function rollUpgradeChoices() {
    const available = UPGRADES.filter((u) => (state.upgradesTaken[u.id] ?? 0) < u.max);
    const choices = [];
    while (choices.length < 3 && available.length > 0) {
      const index = Math.floor(random.next() * available.length);
      choices.push(available.splice(index, 1)[0]);
    }
    while (choices.length < 3) {
      choices.push({ id: 'repair', name: 'Field Repairs', desc: 'Repair hull +40 and beacon +25', max: 99, icon: 'FIX' });
    }
    state.upgradeChoices = choices;
  }

  function applyUpgrade(id) {
    const player = state.player;
    state.upgradesTaken[id] = (state.upgradesTaken[id] ?? 0) + 1;
    if (id === 'damage') player.damage *= 1.25;
    else if (id === 'rate') player.fireInterval *= 0.83;
    else if (id === 'multishot') player.projectiles += 1;
    else if (id === 'pierce') player.pierce += 1;
    else if (id === 'speed') player.speed *= 1.12;
    else if (id === 'plating') { player.maxHull += 30; player.hull = Math.min(player.maxHull, player.hull + 30); }
    else if (id === 'beacon') state.beaconHull = Math.min(state.beaconMax, state.beaconHull + 45);
    else if (id === 'dash') { /* cooldown scales in stepPlayer via upgradesTaken.dash */ }
    else if (id === 'magnet') player.pickupRadius *= 1.7;
    else if (id === 'surge') { player.damage *= 1.12; player.speed *= 1.08; }
    else if (id === 'repair') {
      player.hull = Math.min(player.maxHull, player.hull + 40);
      state.beaconHull = Math.min(state.beaconMax, state.beaconHull + 25);
    }
  }

  function killEnemy(enemy, index, sfx) {
    const multiplier = 1 + 0.2 * Math.min(state.combo, 10);
    const gained = Math.round(enemy.score * multiplier);
    state.score += gained;
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    state.kills += 1;
    addFloater(enemy.x, enemy.y - enemy.radius, `+${gained}`, '#ffd166');
    addParticles(enemy.x, enemy.y, enemy.kind === 'boss' ? 60 : 18, enemy.colour, 260, 4);
    addParticles(enemy.x, enemy.y, 8, '#ffffff', 140, 2.5);
    state.shake = Math.min(1, state.shake + (enemy.kind === 'bulwark' ? 0.45 : enemy.kind === 'boss' ? 1 : 0.2));
    for (let i = 0; i < enemy.scrap; i += 1) {
      state.pickups.push({
        x: enemy.x + random.range(-14, 14),
        y: enemy.y + random.range(-14, 14),
        vx: random.range(-40, 40),
        vy: random.range(-40, 40),
        life: 9,
        kind: 'scrap',
      });
    }
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        const child = spawnEnemy('cinder', enemy.x + random.range(-18, 18), enemy.y + random.range(-18, 18));
        child.hull = 14;
      }
      sfx.push('split');
    }
    if (enemy.kind === 'boss') {
      state.boss = null;
      sfx.push('explode-big');
      return 'boss';
    }
    sfx.push('explode');
    state.enemies.splice(index, 1);
    return null;
  }

  function fireBullet(player, sfx) {
    const spread = 0.11;
    const count = player.projectiles;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      const angle = player.angle + offset;
      state.bullets.push({
        x: player.x + Math.cos(angle) * 22,
        y: player.y + Math.sin(angle) * 22,
        vx: Math.cos(angle) * PLAYER.bulletSpeed,
        vy: Math.sin(angle) * PLAYER.bulletSpeed,
        radius: PLAYER.bulletRadius,
        damage: player.damage,
        pierce: player.pierce,
        life: 1.1,
      });
    }
    addParticles(player.x + Math.cos(player.angle) * 24, player.y + Math.sin(player.angle) * 24, 2, '#ffe66d', 120, 3, 0.15);
    sfx.push('shoot');
  }

  function fireOrb(enemy, targetX, targetY, speed) {
    const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
    state.orbs.push({
      x: enemy.x + Math.cos(angle) * (enemy.radius + 6),
      y: enemy.y + Math.sin(angle) * (enemy.radius + 6),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      damage: enemy.damage,
      life: 6,
    });
  }

  function stepPlayer(dt, input, sfx) {
    const player = state.player;
    player.fireTimer -= dt;
    player.dashCooldown -= dt;
    player.invulnerable -= dt;
    player.trail -= dt;

    // Dash: a burst in the current move direction (or facing) with brief immunity.
    if (input.dash && player.dashCooldown <= 0) {
      const dir = input.move.x !== 0 || input.move.y !== 0
        ? { x: input.move.x, y: input.move.y }
        : { x: Math.cos(player.angle), y: Math.sin(player.angle) };
      player.vx = dir.x * PLAYER.dashSpeed;
      player.vy = dir.y * PLAYER.dashSpeed;
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown * (1 - 0.3 * (state.upgradesTaken.dash ?? 0));
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashInvulnerable);
      addParticles(player.x, player.y, 12, '#4fc3f7', 200, 3, 0.4);
      sfx.push('dash');
    }
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
    } else {
      const accel = 2600;
      player.vx += input.move.x * accel * dt;
      player.vy += input.move.y * accel * dt;
      const drag = Math.exp(-6 * dt);
      player.vx *= drag;
      player.vy *= drag;
      const speed = Math.hypot(player.vx, player.vy);
      const max = player.speed;
      if (speed > max) {
        player.vx = (player.vx / speed) * max;
        player.vy = (player.vy / speed) * max;
      }
    }
    player.x = Math.min(FIELD.width - 24, Math.max(24, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - 24, Math.max(24, player.y + player.vy * dt));
    player.angle = Math.atan2(input.aim.y - player.y, input.aim.x - player.x);

    if (player.trail <= 0) {
      player.trail = 0.03;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > 120) {
        state.particles.push({
          x: player.x - Math.cos(player.angle) * 16, y: player.y - Math.sin(player.angle) * 16,
          vx: -player.vx * 0.08, vy: -player.vy * 0.08,
          life: 0.35, maxLife: 0.35, size: 3, colour: '#2f8fc7',
        });
      }
    }

    if (input.firing && player.fireTimer <= 0) {
      player.fireTimer = player.fireInterval;
      fireBullet(player, sfx);
    }
  }

  function stepEnemies(dt, sfx) {
    const player = state.player;
    const beacon = { x: BEACON.x, y: BEACON.y };
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.flash -= dt;
      enemy.attackTimer -= dt;
      enemy.shotTimer -= dt;
      const toPlayer = dist(enemy.x, enemy.y, player.x, player.y);
      const toBeacon = dist(enemy.x, enemy.y, beacon.x, beacon.y);
      let target = beacon;
      let targetDist = toBeacon;
      if (enemy.kind !== 'boss' && toPlayer < 190) {
        target = player;
        targetDist = toPlayer;
      }
      if (enemy.kind === 'spitter') {
        // Keep a firing distance from the beacon; strafe slowly around it.
        const desired = ENEMY.spitter.range;
        const angle = Math.atan2(enemy.y - beacon.y, enemy.x - beacon.x);
        const radial = toBeacon - desired;
        const move = -Math.sign(radial) * Math.min(Math.abs(radial), enemy.speed * dt);
        const strafe = Math.sin(state.time * 0.8 + enemy.wobble) * 14 * dt;
        enemy.x += Math.cos(angle) * move;
        enemy.y += Math.sin(angle) * move + strafe;
        enemy.vx = (Math.cos(angle) * move) / dt;
        enemy.vy = (Math.sin(angle) * move + strafe) / dt;
        if (enemy.shotTimer <= 0) {
          enemy.shotTimer = ENEMY.spitter.shotInterval * random.range(0.9, 1.1);
          const aimAt = toPlayer < 320 ? player : beacon;
          fireOrb(enemy, aimAt.x, aimAt.y, ENEMY.spitter.orbSpeed);
          sfx.push('spit');
        }
      } else if (enemy.kind === 'boss') {
        const angle = Math.atan2(beacon.y - enemy.y, beacon.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * dt;
        enemy.y += Math.sin(angle) * enemy.speed * dt;
        enemy.vx = Math.cos(angle) * enemy.speed;
        enemy.vy = Math.sin(angle) * enemy.speed;
        if (enemy.shotTimer <= 0) {
          enemy.shotTimer = ENEMY.boss.shotInterval;
          for (let k = 0; k < 12; k += 1) {
            const a = (k / 12) * TAU + state.time * 0.35;
            state.orbs.push({
              x: enemy.x + Math.cos(a) * (enemy.radius + 4),
              y: enemy.y + Math.sin(a) * (enemy.radius + 4),
              vx: Math.cos(a) * ENEMY.boss.orbSpeed,
              vy: Math.sin(a) * ENEMY.boss.orbSpeed,
              radius: 7, damage: enemy.damage, life: 6,
            });
          }
          sfx.push('boss-shot');
        }
        state.summonTimer -= dt;
        if (state.summonTimer <= 0 && enemy.hull < enemy.maxHull * 0.6) {
          state.summonTimer = 8;
          for (let k = 0; k < 3; k += 1) spawnEnemy('cinder', enemy.x + random.range(-60, 60), enemy.y + random.range(-60, 60));
          sfx.push('summon');
        }
      } else {
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        const wobble = enemy.kind === 'cinder' ? Math.sin(state.time * 3 + enemy.wobble) * 0.35 : 0;
        enemy.vx = Math.cos(angle + wobble) * enemy.speed;
        enemy.vy = Math.sin(angle + wobble) * enemy.speed;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      }

      // Contact attacks against the player or the beacon.
      const reachPlayer = enemy.radius + PLAYER.radius;
      const reachBeacon = enemy.radius + BEACON.radius - 6;
      if (toPlayer < reachPlayer && enemy.attackTimer <= 0) {
        enemy.attackTimer = 0.85;
        if (player.invulnerable <= 0) {
          player.hull -= enemy.damage;
          player.invulnerable = PLAYER.hitInvulnerable;
          state.shake = Math.min(1, state.shake + 0.4);
          addParticles(player.x, player.y, 10, '#ff5964', 220, 3.5);
          sfx.push('hurt');
          if (player.hull <= 0) return EVENT_OVER;
        }
      }
      if (toBeacon < reachBeacon && enemy.attackTimer <= 0) {
        enemy.attackTimer = 0.9;
        state.beaconHull -= enemy.damage;
        addParticles(BEACON.x, BEACON.y, 8, '#ff9f1c', 180, 3);
        state.shake = Math.min(1, state.shake + 0.25);
        sfx.push('beacon-hit');
        if (state.beaconHull <= 0) return EVENT_OVER;
      }
    }
    return EVENT_NONE;
  }

  function stepBullets(dt, sfx) {
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.bullets.splice(i, 1);
        continue;
      }
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        if (dist(bullet.x, bullet.y, enemy.x, enemy.y) > bullet.radius + enemy.radius) continue;
        enemy.hull -= bullet.damage;
        enemy.flash = 0.09;
        addParticles(bullet.x, bullet.y, 4, '#ffe66d', 160, 2.5, 0.25);
        sfx.push('hit');
        if (enemy.hull <= 0) {
          const result = killEnemy(enemy, j, sfx);
          if (result === 'boss') return EVENT_WIN;
        }
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          state.bullets.splice(i, 1);
        }
        break;
      }
    }
    return EVENT_NONE;
  }

  function stepOrbs(dt, sfx) {
    const player = state.player;
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const orb = state.orbs[i];
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.life -= dt;
      let dead = orb.life <= 0 || orb.x < -20 || orb.x > FIELD.width + 20 || orb.y < -20 || orb.y > FIELD.height + 20;
      if (!dead && dist(orb.x, orb.y, player.x, player.y) < orb.radius + PLAYER.radius - 2) {
        dead = true;
        if (player.invulnerable <= 0) {
          player.hull -= orb.damage;
          player.invulnerable = PLAYER.hitInvulnerable;
          state.shake = Math.min(1, state.shake + 0.35);
          addParticles(player.x, player.y, 10, '#ff5964', 220, 3.5);
          sfx.push('hurt');
          if (player.hull <= 0) return EVENT_OVER;
        }
      }
      if (!dead && dist(orb.x, orb.y, BEACON.x, BEACON.y) < orb.radius + BEACON.radius - 4) {
        dead = true;
        state.beaconHull -= orb.damage;
        addParticles(BEACON.x, BEACON.y, 6, '#ff9f1c', 160, 3);
        sfx.push('beacon-hit');
        if (state.beaconHull <= 0) return EVENT_OVER;
      }
      if (dead) state.orbs.splice(i, 1);
    }
    return EVENT_NONE;
  }

  function stepPickups(dt, sfx) {
    const player = state.player;
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.life -= dt;
      const d = dist(pickup.x, pickup.y, player.x, player.y);
      if (d < player.pickupRadius) {
        const angle = Math.atan2(player.y - pickup.y, player.x - pickup.x);
        const pull = 520 * (1 - d / (player.pickupRadius + 1)) + 120;
        pickup.vx += Math.cos(angle) * pull * dt * 4;
        pickup.vy += Math.sin(angle) * pull * dt * 4;
      }
      pickup.vx *= Math.exp(-2 * dt);
      pickup.vy *= Math.exp(-2 * dt);
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (d < PLAYER.radius + 12) {
        state.pickups.splice(i, 1);
        state.scrap += 1;
        state.score += SCRAP_SCORE;
        sfx.push('pickup');
      } else if (pickup.life <= 0) {
        state.pickups.splice(i, 1);
      }
    }
  }

  function stepParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-2.5 * dt);
      p.vy *= Math.exp(-2.5 * dt);
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 1.8);
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
  }

  function stepSpawning(dt, sfx) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      const kind = state.spawnQueue.shift();
      spawnEdge(kind);
      if (kind === 'boss') sfx.push('boss');
      state.spawnTimer = WAVES[state.wave - 1].interval * random.range(0.85, 1.15);
    }
    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.wavePhase = 'cleared';
      return EVENT_WAVE_CLEAR;
    }
    return EVENT_NONE;
  }

  function stepAttract(dt, sfx) {
    // The title screen's living backdrop: the skiff orbits the beacon and
    // shoots drifting drones; nothing here can hurt the player or the beacon.
    const player = state.player;
    const orbit = state.time * 0.35;
    const targetX = BEACON.x + Math.cos(orbit) * 220;
    const targetY = BEACON.y + Math.sin(orbit) * 150;
    let nearest = null;
    let nearestDist = Infinity;
    for (const enemy of state.enemies) {
      const d = dist(enemy.x, enemy.y, player.x, player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }
    const aim = nearest ?? { x: targetX, y: targetY };
    const input = {
      move: { x: Math.max(-1, Math.min(1, (targetX - player.x) / 60)), y: Math.max(-1, Math.min(1, (targetY - player.y) / 60)) },
      aim: { x: aim.x, y: aim.y },
      firing: nearest !== null,
      dash: false,
    };
    stepPlayer(dt, input, sfx);
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.wobble += dt;
      enemy.x += Math.cos(enemy.wobble * 0.7) * 24 * dt;
      enemy.y += Math.sin(enemy.wobble * 0.9) * 18 * dt + 12 * dt;
      if (enemy.y > FIELD.height + 40) state.enemies.splice(i, 1);
    }
    if (state.enemies.length < 5 && random.next() < dt * 0.5) {
      spawnEnemy(random.pick(['cinder', 'spitter', 'splitter']), random.range(80, FIELD.width - 80), -30);
    }
    const result = stepBullets(dt, sfx);
    if (result === EVENT_WIN) {
      state.boss = null;
      state.enemies.length = 0;
    }
    stepParticles(dt);
    state.attractKills = state.kills;
    return EVENT_NONE;
  }

  return {
    state,
    reset() {
      state.time = 0;
      state.wave = 0;
      state.wavePhase = 'idle';
      state.spawnQueue = [];
      state.spawnTimer = 0;
      state.player = makePlayer();
      state.beaconHull = BEACON.hull;
      state.enemies = [];
      state.bullets = [];
      state.orbs = [];
      state.particles = [];
      state.floaters = [];
      state.pickups = [];
      state.score = 0;
      state.scrap = 0;
      state.combo = 0;
      state.comboTimer = 0;
      state.kills = 0;
      state.shake = 0;
      state.boss = null;
      state.upgradesTaken = {};
      state.upgradeChoices = [];
      state.banner = '';
      state.bannerTimer = 0;
      state.attractKills = 0;
    },
    startRun() {
      this.reset();
      startWave(1);
    },
    beginNextWave() {
      startWave(state.wave + 1);
    },
    prepareUpgrades() {
      rollUpgradeChoices();
    },
    chooseUpgrade(index) {
      const choice = state.upgradeChoices[index];
      if (!choice) return false;
      applyUpgrade(choice.id);
      state.upgradeChoices = [];
      return true;
    },
    step(dt, input, attract = false) {
      state.time += dt;
      const sfx = [];
      let events = EVENT_NONE;
      if (attract) {
        stepAttract(dt, sfx);
        return { events, sfx };
      }
      if (state.wavePhase === 'idle') return { events, sfx };
      stepPlayer(dt, input, sfx);
      events |= stepEnemies(dt, sfx);
      if (events & EVENT_OVER) return { events, sfx };
      events |= stepBullets(dt, sfx);
      if (events & EVENT_WIN) return { events, sfx };
      events |= stepOrbs(dt, sfx);
      if (events & EVENT_OVER) return { events, sfx };
      stepPickups(dt, sfx);
      stepParticles(dt);
      if (state.wavePhase === 'spawning') {
        events |= stepSpawning(dt, sfx);
      }
      return { events, sfx };
    },
  };
}
