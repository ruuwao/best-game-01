# EMBERLINE — Hold the Last Light

[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/ruuwao/best-game-01/rank.svg)](https://make.fun/c/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/ruuwao/best-game-01/reward.svg)](https://make.fun/c/best-game-01)

A complete, original arena-defense game that plays offline in a desktop browser
from static files — no build step, no network request, no library.

## The game

Dusk is falling on a ruined starport and the ember drones are coming for the
last light. You fly the skiff **Kestrel** around the central beacon and hold
the line through **ten waves** of drones — chasers, spitters, splitters,
bulwarks — ending with the boss **Ash Sovereign**. Drones that reach the
beacon chew through its hull; if the beacon falls, or your skiff does, the
light goes out.

Between waves you pick **one of three upgrade cards** — damage, fire rate,
twin barrels, piercing rounds, plating, beacon mending, dash capacitor, scrap
magnet and more — so every run builds differently. Kills chain a score combo,
drones drop scrap, and a dash (with a short moment of invulnerability) gets
you out of a bad spot.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Fly |
| Mouse | Aim |
| Hold click / Space | Fire |
| Shift / right-click | Dash |
| P / Esc | Pause |
| R | Restart |
| M | Sound on/off |
| 1 / 2 / 3 or click | Pick an upgrade card |

## Screens

Title → ten waves of play → upgrade choice between waves → pause → victory
or game over, each with its stats and a restart. The best score is kept in
the browser between visits.

## Tech

- Plain ES modules under `game/` — `index.html` plus `src/` (config, seeded
  RNG, input, procedural WebAudio, world simulation, renderer, screenshot
  staging). No vendored engine, no assets to download.
- Deterministic: `?seed=N` replays the same waves; `?shot=start|play|upgrade|end`
  stages the four screenshots from real play.
- `main.ts` copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `node serve.ts` serves `game/` locally for play-testing.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```
