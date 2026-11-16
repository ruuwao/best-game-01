// Keyboard + mouse, read as one frame's intent: movement, aim in field
// coordinates, whether the trigger is held, and one-shot actions (confirm,
// pause, restart, mute, dash, upgrade picks 1/2/3).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_DASH = 16;
export const ACTION_PICK_1 = 32;
export const ACTION_PICK_2 = 64;
export const ACTION_PICK_3 = 128;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;
  let clickX = 0;
  let clickY = 0;

  function fieldPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') actions |= ACTION_DASH;
    if (event.code === 'Digit1') actions |= ACTION_PICK_1;
    if (event.code === 'Digit2') actions |= ACTION_PICK_2;
    if (event.code === 'Digit3') actions |= ACTION_PICK_3;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const point = fieldPoint(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = fieldPoint(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    mouseDown = true;
    mouseClicked = true;
    clickX = point.x;
    clickY = point.y;
    if (event.button === 2) actions |= ACTION_DASH;
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const length = Math.hypot(x, y);
        x /= length;
        y /= length;
      }
      return { x, y };
    },
    aim() {
      return { x: mouseX, y: mouseY };
    },
    firing() {
      return mouseDown || keys.has('Space');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      if (!mouseClicked) return null;
      mouseClicked = false;
      return { x: clickX, y: clickY };
    },
  };
}
