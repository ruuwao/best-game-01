// EMBERLINE — the entrypoint. It hands the game in: copies this directory's
// game/ and screenshots/ into the output directory and writes dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// The game itself is plain static files (game/index.html and its ES modules,
// no library, no network request) that any static server can serve; run
// `node serve.ts` and open http://localhost:8080 to play it.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function assertGameFits() {
  // The scorer's own caps, checked here first so a bad entry fails loudly
  // instead of silently: at most 993 files and directories under game/,
  // 48 MiB of game files in all, and index.html a regular file under 1 MiB.
  let entries = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const info = statSync(path);
      entries += 1;
      if (info.isDirectory()) walk(path);
      else bytes += info.size;
    }
  };
  walk(gameDir);
  if (entries > 993) throw new Error(`game/ holds ${entries} entries, over the 993 cap`);
  if (bytes > 48 * 1024 * 1024) throw new Error(`game/ is ${bytes} bytes, over the 48 MiB cap`);
  const index = statSync(join(gameDir, 'index.html'));
  if (!index.isFile() || index.size > 1024 * 1024) throw new Error('game/index.html is missing or over 1 MiB');
}

assertGameFits();

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`EMBERLINE handed in: ${out}`);
