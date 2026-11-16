// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, upgrade,
// paused, game over and victory.
//
// ?seed=N fixes the wave pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_PICK_1, ACTION_PICK_2,
  ACTION_PICK_3, ACTION_RESTART, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playSfx(names) {
  for (const name of names) {
    if (name === 'shoot') audio.shoot();
    else if (name === 'hit') audio.hit();
    else if (name === 'explode') audio.explode(false);
    else if (name === 'explode-big') audio.explode(true);
    else if (name === 'hurt') audio.hurt();
    else if (name === 'pickup') audio.pickup();
    else if (name === 'dash') audio.dash();
    else if (name === 'beacon-hit') audio.hurt();
    else if (name === 'boss') audio.boss();
    else if (name === 'boss-shot') audio.shoot();
    else if (name === 'spit') audio.shoot();
    else if (name === 'summon') audio.boss();
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, true, STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dashQueued = false;

  // Play-test hook: ?debug=1 exposes the world for automated checks.
  if (params.get('debug') === '1') {
    window.__ember = {
      world,
      get screen() { return screen; },
      get best() { return best; },
    };
  }

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startRun() {
    world.startRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startPad();
    audio.waveHorn();
    announce('Playing. Defend the beacon.');
  }

  function finishRun(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won
      ? `Victory. Score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
    }
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startRun();
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startRun();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      let pick = -1;
      if (actions & ACTION_PICK_1) pick = 0;
      else if (actions & ACTION_PICK_2) pick = 1;
      else if (actions & ACTION_PICK_3) pick = 2;
      if (pick >= 0 && world.chooseUpgrade(pick)) {
        audio.upgrade();
        world.beginNextWave();
        screen = SCREEN_PLAY;
        audio.waveHorn();
        announce(`Wave ${world.state.wave}.`);
      }
      return;
    }
    if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && (actions & ACTION_CONFIRM)) {
      startRun();
    }
  }

  function handleClicks() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    if (screen === SCREEN_TITLE) {
      startRun();
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      const cardW = 300;
      const gap = 28;
      const total = cardW * 3 + gap * 2;
      const startX = (1280 - total) / 2;
      const y = 230;
      const cardH = 220;
      for (let i = 0; i < 3; i += 1) {
        const x = startX + i * (cardW + gap);
        if (click.x >= x && click.x <= x + cardW && click.y >= y && click.y <= y + cardH) {
          if (world.chooseUpgrade(i)) {
            audio.upgrade();
            world.beginNextWave();
            screen = SCREEN_PLAY;
            audio.waveHorn();
            announce(`Wave ${world.state.wave}.`);
          }
          return;
        }
      }
      return;
    }
    if (screen === SCREEN_OVER || screen === SCREEN_WIN) startRun();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const move = input.move();
    const aim = input.aim();
    const dash = dashQueued;
    dashQueued = false;
    const firing = input.firing();
    const result = world.step(STEP, { move, aim, firing, dash }, false);
    playSfx(result.sfx);
    if (result.events & EVENT_WIN) finishRun(true);
    else if (result.events & EVENT_OVER) finishRun(false);
    else if (result.events & EVENT_WAVE_CLEAR) {
      world.prepareUpgrades();
      screen = SCREEN_UPGRADE;
      audio.upgrade();
      announce(`Wave ${world.state.wave} cleared. Choose an upgrade.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClicks();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted(), STEP);
  }

  // Leaving the tab pauses a running game rather than letting drones eat the beacon unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberline. Press Enter or click to launch.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
