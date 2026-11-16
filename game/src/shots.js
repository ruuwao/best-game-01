// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh run for a fixed number of steps, steered by an
// autopilot that flies, aims, fires and dashes, so the frame is what a short
// game really looks like — and the same seed always gives the same frame.

import { EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { STEP } from './config.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 150;
const UPGRADE_SECONDS = 120;
const END_LIMIT_SECONDS = 600;

/** The play scene's pilot fights well; the end scene's never fires and never dodges. */
function autopilot(state, skillful) {
  const player = state.player;
  let target = null;
  let nearestDist = Infinity;
  for (const enemy of state.enemies) {
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (d < nearestDist) {
      nearestDist = d;
      target = enemy;
    }
  }
  if (!skillful) {
    return { move: { x: 0, y: 0 }, aim: { x: player.x, y: player.y - 100 }, firing: false, dash: false };
  }
  // Orbit the beacon at a fighting distance, keeping clear of the nearest drone.
  const orbitAngle = state.time * 0.45;
  const holdX = 640 + Math.cos(orbitAngle) * 175;
  const holdY = 360 + Math.sin(orbitAngle) * 135;
  let moveX = (holdX - player.x) / 200;
  let moveY = (holdY - player.y) / 200;
  if (target && nearestDist < 130) {
    moveX += (player.x - target.x) / nearestDist;
    moveY += (player.y - target.y) / nearestDist;
  }
  const length = Math.hypot(moveX, moveY);
  if (length > 1) {
    moveX /= length;
    moveY /= length;
  }
  const aim = target
    ? {
      // Lead the target: bullets take dist / 760 s to arrive.
      x: target.x + (target.vx ?? 0) * (nearestDist / 760),
      y: target.y + (target.vy ?? 0) * (nearestDist / 760),
    }
    : { x: 640, y: 160 };
  return {
    move: { x: moveX, y: moveY },
    aim: { x: aim.x, y: aim.y },
    firing: target !== null,
    dash: target !== null && nearestDist < 70,
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. The world starts a real run; the pilot plays it forward.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    world.startRun();
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, true), true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.startRun();
  if (name === 'end') {
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const result = world.step(STEP, autopilot(world.state, false), false);
      if (result.events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // Play and upgrade: fight wave 1; on a clear, the upgrade scene shows the
  // cards, while the play scene rolls into wave 3 and stops twelve seconds in,
  // when the field is at its busiest.
  let elapsed = 0;
  let waveThreeAt = -1;
  const budget = name === 'upgrade' ? UPGRADE_SECONDS : PLAY_SECONDS;
  while (elapsed < budget) {
    const result = world.step(STEP, autopilot(world.state, true), false);
    elapsed += STEP;
    if (result.events & EVENT_OVER) break;
    if (result.events & EVENT_WAVE_CLEAR) {
      if (name === 'upgrade') {
        world.prepareUpgrades();
        return { screen: SCREEN_UPGRADE, best: world.state.score };
      }
      world.beginNextWave();
      if (world.state.wave === 3) waveThreeAt = elapsed;
    }
    if (name === 'play' && waveThreeAt >= 0 && elapsed - waveThreeAt > 12) break;
  }
  if (name === 'upgrade') {
    // The pilot did not clear wave 1 in time: show the play frame instead.
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  const over = world.state.player.hull <= 0 || world.state.beaconHull <= 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
