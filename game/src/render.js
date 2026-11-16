// Every pixel: the dusk starport, the beacon, the skiff, the drones, the HUD
// and every screen. The renderer scales the fixed 1280x720 field to the canvas
// and paints in layers: sky, ruins, ground, entities, effects, HUD, screen.

import { BEACON, ENEMY, FIELD, FONT, PALETTE, PLAYER, TOTAL_WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  const embers = [];
  const ruinsFar = [];
  const ruinsNear = [];
  let seedState = 1234567;
  function seeded() {
    seedState = (seedState * 1664525 + 1013904223) >>> 0;
    return seedState / 4294967296;
  }
  for (let i = 0; i < 130; i += 1) {
    stars.push({ x: seeded() * FIELD.width, y: seeded() * 430, size: seeded() * 1.6 + 0.4, twinkle: seeded() * Math.PI * 2 });
  }
  for (let i = 0; i < 46; i += 1) {
    embers.push({ x: seeded() * FIELD.width, y: seeded() * FIELD.height, size: seeded() * 2.4 + 0.8, speed: seeded() * 14 + 6, drift: seeded() * 10 - 5 });
  }
  let x = -20;
  while (x < FIELD.width + 40) {
    const w = 40 + seeded() * 90;
    ruinsFar.push({ x, w, h: 90 + seeded() * 170, windows: Math.floor(seeded() * 8) + 2 });
    x += w + 8 + seeded() * 30;
  }
  x = -40;
  while (x < FIELD.width + 60) {
    const w = 60 + seeded() * 110;
    ruinsNear.push({ x, w, h: 50 + seeded() * 110, windows: Math.floor(seeded() * 6) + 1 });
    x += w + 14 + seeded() * 40;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground(time, dt) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.45, PALETTE.skyMid);
    sky.addColorStop(0.72, PALETTE.skyLow);
    sky.addColorStop(1, PALETTE.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const star of stars) {
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(time * 0.9 + star.twinkle));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    // A low ember moon and its glow.
    const moonX = 1080;
    const moonY = 110;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 130);
    moonGlow.addColorStop(0, 'rgba(255, 190, 110, 0.5)');
    moonGlow.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 130, moonY - 130, 260, 260);
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 140, 80, 0.55)';
    ctx.beginPath();
    ctx.arc(moonX - 10, moonY - 6, 8, 0, Math.PI * 2);
    ctx.arc(moonX + 12, moonY + 10, 6, 0, Math.PI * 2);
    ctx.arc(moonX + 4, moonY - 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // Ruined skyline, far and near, with a few lit windows.
    ctx.fillStyle = PALETTE.ruinFar;
    for (const ruin of ruinsFar) {
      ctx.fillRect(ruin.x, 470 - ruin.h, ruin.w, ruin.h);
      ctx.beginPath();
      ctx.moveTo(ruin.x, 470 - ruin.h);
      ctx.lineTo(ruin.x + ruin.w / 2, 470 - ruin.h - 18);
      ctx.lineTo(ruin.x + ruin.w, 470 - ruin.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 190, 100, 0.5)';
      for (let i = 0; i < ruin.windows; i += 1) {
        ctx.fillRect(ruin.x + 8 + (i * 13) % (ruin.w - 14), 470 - ruin.h + 18 + (i * 23) % (ruin.h - 30), 4, 6);
      }
      ctx.fillStyle = PALETTE.ruinFar;
    }
    ctx.fillStyle = PALETTE.ruinNear;
    for (const ruin of ruinsNear) {
      ctx.fillRect(ruin.x, 520 - ruin.h, ruin.w, ruin.h);
      ctx.fillStyle = 'rgba(255, 170, 90, 0.55)';
      for (let i = 0; i < ruin.windows; i += 1) {
        ctx.fillRect(ruin.x + 10 + (i * 17) % (ruin.w - 18), 520 - ruin.h + 14 + (i * 29) % (ruin.h - 26), 5, 7);
      }
      ctx.fillStyle = PALETTE.ruinNear;
    }

    // Ground: dark slab with a faint survey grid and a horizon glow.
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 520, FIELD.width, FIELD.height - 520);
    const horizonGlow = ctx.createLinearGradient(0, 500, 0, 560);
    horizonGlow.addColorStop(0, 'rgba(255, 120, 50, 0.22)');
    horizonGlow.addColorStop(1, 'rgba(255, 120, 50, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, 500, FIELD.width, 60);
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= FIELD.width; gx += 64) {
      ctx.moveTo(gx, 520);
      ctx.lineTo(gx, FIELD.height);
    }
    for (let gy = 520; gy <= FIELD.height; gy += 40) {
      ctx.moveTo(0, gy);
      ctx.lineTo(FIELD.width, gy);
    }
    ctx.stroke();

    // Drifting embers rising off the ground.
    for (const ember of embers) {
      ember.y -= ember.speed * dt;
      ember.x += ember.drift * dt + Math.sin(time + ember.size * 9) * 0.2;
      if (ember.y < 480) {
        ember.y = FIELD.height;
        ember.x = seeded() * FIELD.width;
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBeacon(state, time) {
    const pulse = 1 + Math.sin(time * 2.2) * 0.05;
    const glow = ctx.createRadialGradient(BEACON.x, BEACON.y, 10, BEACON.x, BEACON.y, 190 * pulse);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.4)');
    glow.addColorStop(0.5, 'rgba(255, 159, 28, 0.14)');
    glow.addColorStop(1, 'rgba(255, 159, 28, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(BEACON.x - 200, BEACON.y - 200, 400, 400);

    // The ring the drones must not cross.
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.arc(BEACON.x, BEACON.y, BEACON.radius + 26, time * 0.15, time * 0.15 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // The beacon itself: a crystal pylon on a plinth.
    ctx.fillStyle = '#241d3d';
    ctx.beginPath();
    ctx.arc(BEACON.x, BEACON.y, BEACON.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3d7a';
    ctx.lineWidth = 3;
    ctx.stroke();
    const crystal = ctx.createLinearGradient(BEACON.x, BEACON.y - 34, BEACON.x, BEACON.y + 30);
    crystal.addColorStop(0, '#fff3c4');
    crystal.addColorStop(0.5, PALETTE.beaconCore);
    crystal.addColorStop(1, '#ff7a18');
    ctx.fillStyle = crystal;
    ctx.beginPath();
    ctx.moveTo(BEACON.x, BEACON.y - 36);
    ctx.lineTo(BEACON.x + 15, BEACON.y - 4);
    ctx.lineTo(BEACON.x + 9, BEACON.y + 26);
    ctx.lineTo(BEACON.x - 9, BEACON.y + 26);
    ctx.lineTo(BEACON.x - 15, BEACON.y - 4);
    ctx.closePath();
    ctx.fill();
    // Beacon hull arc.
    const fraction = Math.max(0, state.beaconHull / state.beaconMax);
    ctx.strokeStyle = fraction > 0.5 ? PALETTE.beaconCore : fraction > 0.25 ? '#ff9f1c' : PALETTE.danger;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(BEACON.x, BEACON.y, BEACON.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
    ctx.stroke();
  }

  function drawPlayer(player, time) {
    const blink = player.invulnerable > 0 && Math.floor(time * 16) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.scale(1.3, 1.3);
    if (!blink) {
      // Thruster flame.
      const flame = 10 + Math.sin(time * 31) * 4 + Math.hypot(player.vx, player.vy) * 0.02;
      const flameGrad = ctx.createLinearGradient(-14, 0, -14 - flame, 0);
      flameGrad.addColorStop(0, 'rgba(255, 220, 120, 0.9)');
      flameGrad.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-13, -5);
      ctx.lineTo(-14 - flame, 0);
      ctx.lineTo(-13, 5);
      ctx.closePath();
      ctx.fill();
      // Hull: a swept skiff with a cyan canopy.
      ctx.fillStyle = PALETTE.playerDark;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-6, -13);
      ctx.lineTo(-16, -7);
      ctx.lineTo(-16, 7);
      ctx.lineTo(-6, 13);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9fe2ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#cfeeff';
      ctx.beginPath();
      ctx.ellipse(4, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5d47';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(10, -3);
      ctx.lineTo(10, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Dash cooldown ring under the ship.
    if (player.dashCooldown > 0) {
      const fraction = 1 - player.dashCooldown / PLAYER.dashCooldown;
      ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
      ctx.stroke();
    }
  }

  function drawEnemy(enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const flash = enemy.flash > 0;
    const body = flash ? '#ffffff' : enemy.colour;
    if (enemy.kind === 'cinder') {
      ctx.rotate(Math.atan2(enemy.vy || 0, enemy.vx || 1) + Math.sin(time * 6 + enemy.wobble) * 0.2);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff2e1f';
      ctx.beginPath();
      ctx.arc(4, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'spitter') {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#2a1042';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5df2';
      ctx.beginPath();
      ctx.arc(Math.cos(time * 2 + enemy.wobble) * 4, Math.sin(time * 2 + enemy.wobble) * 4, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'splitter') {
      ctx.rotate(time * 0.8 + enemy.wobble);
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const r = i % 2 === 0 ? enemy.radius : enemy.radius * 0.62;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0a2e1f';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'bulwark') {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a1d16';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#ffb3ab';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius - 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2b0a08';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'boss') {
      const pulse = 1 + Math.sin(time * 3) * 0.04;
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.sin(time * 0.7) * 0.15);
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? enemy.radius + 8 : enemy.radius - 6;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7a4a00';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#3d1300';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff2e1f';
      ctx.beginPath();
      ctx.arc(0, 0, 10 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Health bar for anything tougher than a cinder.
    if (enemy.maxHull > 30 && enemy.hull < enemy.maxHull) {
      const w = enemy.radius * 2;
      const fraction = Math.max(0, enemy.hull / enemy.maxHull);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
      ctx.fillStyle = enemy.kind === 'boss' ? PALETTE.danger : '#ff9f1c';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * fraction, 5);
    }
  }

  function drawWorld(state, time, dt) {
    drawBackground(time, dt);
    drawBeacon(state, time);
    for (const pickup of state.pickups) {
      const blink = pickup.life < 2 && Math.floor(time * 8) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(time * 3 + pickup.x);
      ctx.fillStyle = PALETTE.scrap;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    for (const enemy of state.enemies) drawEnemy(enemy, time);
    for (const bullet of state.bullets) {
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 230, 109, 0.35)';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius + 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const orb of state.orbs) {
      ctx.fillStyle = '#ff5df2';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 93, 242, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawPlayer(state.player, time);
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.colour;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawBar(x, y, w, h, fraction, fill, label) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(x - 1, y - 1, w + 2, h + 2, 4);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(x, y, Math.max(0, w * Math.min(1, fraction)), h, 3);
    ctx.fill();
    if (label) {
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(label, x, y - 6);
    }
  }

  function drawHud(state, muted) {
    const player = state.player;
    // Top-left: hull + beacon.
    drawBar(24, 44, 220, 12, player.hull / player.maxHull, player.hull / player.maxHull > 0.3 ? '#3ce0a0' : PALETTE.danger, 'HULL');
    drawBar(24, 76, 220, 12, Math.max(0, state.beaconHull / state.beaconMax), '#ffd166', 'BEACON');
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.ceil(Math.max(0, player.hull))} / ${player.maxHull}`, 252, 56);
    ctx.fillText(`${Math.ceil(Math.max(0, state.beaconHull))} / ${state.beaconMax}`, 252, 88);

    // Top-centre: wave + enemies left.
    ctx.textAlign = 'center';
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(state.wave > 0 ? `WAVE ${state.wave} / ${TOTAL_WAVES}` : 'EMBERLINE', FIELD.width / 2, 34);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    const remaining = state.enemies.length + state.spawnQueue.length;
    ctx.fillText(state.wavePhase === 'cleared' ? 'WAVE CLEARED' : `${remaining} hostiles remain`, FIELD.width / 2, 56);

    // Boss bar.
    if (state.boss) {
      drawBar(FIELD.width / 2 - 220, 66, 440, 10, Math.max(0, state.boss.hull / state.boss.maxHull), PALETTE.danger, '');
      ctx.font = `800 13px ${FONT}`;
      ctx.fillStyle = '#ffd166';
      ctx.fillText('THE ASH SOVEREIGN', FIELD.width / 2, 96);
    }

    // Top-right: score, combo, scrap.
    ctx.textAlign = 'right';
    ctx.font = `800 24px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(state.score.toLocaleString('en-US'), FIELD.width - 24, 36);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`SCRAP ${state.scrap}   KILLS ${state.kills}`, FIELD.width - 24, 58);
    if (state.combo >= 2) {
      ctx.font = `800 16px ${FONT}`;
      ctx.fillStyle = '#ff9f1c';
      ctx.fillText(`COMBO x${Math.min(state.combo, 10)}`, FIELD.width - 24, 80);
    }

    // Bottom-left: dash + controls hint.
    ctx.textAlign = 'left';
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = player.dashCooldown <= 0 ? '#4fc3f7' : PALETTE.muted;
    ctx.fillText(player.dashCooldown <= 0 ? 'DASH READY  [SHIFT / RIGHT-CLICK]' : `DASH ${player.dashCooldown.toFixed(1)}s`, 24, FIELD.height - 20);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(muted ? 'M — SOUND OFF' : 'M — SOUND ON   P — PAUSE', FIELD.width - 24, FIELD.height - 20);

    // Wave banner.
    if (state.bannerTimer > 0) {
      ctx.globalAlpha = Math.min(1, state.bannerTimer);
      ctx.textAlign = 'center';
      ctx.font = `800 44px ${FONT}`;
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = 'rgba(255, 120, 40, 0.8)';
      ctx.shadowBlur = 24;
      ctx.fillText(state.banner, FIELD.width / 2, 190);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(5, 8, 24, 0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = `800 76px ${FONT}`;
    ctx.shadowColor = 'rgba(255, 120, 40, 0.9)';
    ctx.shadowBlur = 30;
    ctx.fillText('EMBERLINE', FIELD.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText('Hold the Last Light — ten waves stand between the dark and dawn.', FIELD.width / 2, 212);
    ctx.font = `400 16px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('WASD / arrows — fly      Mouse — aim      Hold click / Space — fire', FIELD.width / 2, 256);
    ctx.fillText('Shift / right-click — dash      P — pause      R — restart      M — sound', FIELD.width / 2, 282);
    ctx.fillStyle = '#ff9f1c';
    ctx.font = `700 17px ${FONT}`;
    ctx.fillText('Defend the beacon. If it falls — or you do — the light goes out.', FIELD.width / 2, 320);
    if (best > 0) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 18px ${FONT}`;
      ctx.fillText(`BEST SCORE  ${best.toLocaleString('en-US')}`, FIELD.width / 2, 362);
    }
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#4fc3f7';
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', FIELD.width / 2, 600);
    ctx.globalAlpha = 1;
    ctx.font = `400 13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('An original game — art, sound and code made for this entry. No network, no downloads.', FIELD.width / 2, 690);
  }

  function drawUpgrade(state) {
    ctx.fillStyle = 'rgba(5, 8, 24, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 120);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText('The beacon holds. Choose one upgrade — then the next wave comes.', FIELD.width / 2, 158);
    const cardW = 300;
    const cardH = 220;
    const gap = 28;
    const total = cardW * 3 + gap * 2;
    const startX = (FIELD.width - total) / 2;
    const y = 230;
    state.upgradeChoices.forEach((choice, index) => {
      const x = startX + index * (cardW + gap);
      const taken = state.upgradesTaken[choice.id] ?? 0;
      drawPanel(x, y, cardW, cardH);
      ctx.fillStyle = '#4fc3f7';
      ctx.font = `800 15px ${FONT}`;
      ctx.fillText(`[${index + 1}]  ${choice.icon}`, x + cardW / 2, y + 44);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 21px ${FONT}`;
      ctx.fillText(choice.name, x + cardW / 2, y + 84);
      ctx.font = `400 16px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(choice.desc, x + cardW / 2, y + 118);
      ctx.font = `600 13px ${FONT}`;
      ctx.fillStyle = taken > 0 ? '#ff9f1c' : PALETTE.muted;
      ctx.fillText(taken > 0 ? `OWNED x${taken}` : 'NEW', x + cardW / 2, y + 150);
      ctx.fillStyle = '#3ce0a0';
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText('CLICK TO TAKE', x + cardW / 2, y + 190);
    });
    ctx.font = `600 15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}    HULL ${Math.ceil(state.player.hull)}/${state.player.maxHull}    BEACON ${Math.ceil(state.beaconHull)}/${state.beaconMax}`, FIELD.width / 2, 510);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 8, 24, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.font = `400 18px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('P or Enter to resume — R to restart the run', FIELD.width / 2, 372);
  }

  function drawEnd(state, best, won) {
    ctx.fillStyle = won ? 'rgba(10, 24, 16, 0.62)' : 'rgba(24, 6, 10, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#ffd166' : PALETTE.danger;
    ctx.font = `800 64px ${FONT}`;
    ctx.shadowColor = won ? 'rgba(255, 190, 60, 0.8)' : 'rgba(255, 60, 70, 0.7)';
    ctx.shadowBlur = 28;
    ctx.fillText(won ? 'THE LIGHT HOLDS' : 'THE LIGHT GOES OUT', FIELD.width / 2, 220);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(
      won
        ? 'The Ash Sovereign is ash. Dawn breaks over the starport.'
        : state.beaconHull <= 0
          ? 'The beacon fell. The drones feast in the dark.'
          : 'Your skiff is scrap. The beacon stands alone.',
      FIELD.width / 2, 264,
    );
    const rows = [
      ['FINAL SCORE', state.score.toLocaleString('en-US')],
      ['WAVE REACHED', `${Math.min(state.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`],
      ['DRONES DESTROYED', String(state.kills)],
      ['SCRAP SALVAGED', String(state.scrap)],
      ['BEST SCORE', best.toLocaleString('en-US')],
    ];
    drawPanel(FIELD.width / 2 - 260, 300, 520, 44 * rows.length + 28);
    rows.forEach(([label, value], i) => {
      const y = 300 + 34 + i * 44;
      ctx.font = `600 16px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'left';
      ctx.fillText(label, FIELD.width / 2 - 230, y);
      ctx.font = `800 18px ${FONT}`;
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = 'right';
      ctx.fillText(value, FIELD.width / 2 + 230, y);
    });
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#4fc3f7';
    ctx.font = `800 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 620);
    ctx.globalAlpha = 1;
  }

  return {
    draw(state, screen, best, muted, dt = 0) {
      const time = state.time;
      const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
      const offsetX = (canvas.width - FIELD.width * scale) / 2;
      const offsetY = (canvas.height - FIELD.height * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05081a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shakeX = (Math.random() - 0.5) * state.shake * 14;
      const shakeY = (Math.random() - 0.5) * state.shake * 14;
      ctx.setTransform(scale, 0, 0, scale, offsetX + shakeX * scale, offsetY + shakeY * scale);
      drawWorld(state, time, dt);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_UPGRADE) drawUpgrade(state);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawEnd(state, best, false);
      else if (screen === SCREEN_WIN) drawEnd(state, best, true);
      else drawHud(state, muted);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
}
