import "./style.css";

import { Navigation, AABB, type Vec2, Direction } from "@samvv/nav";

const nav = new Navigation(window.innerWidth, window.innerHeight);

const canvas = document.createElement('canvas');
canvas.style.display = 'block';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

let boxes: { id: string; aabb: AABB; }[] = [];
let start: Vec2 | null = null;
const end = [0, 0];

window.addEventListener('mousedown', e => {
  start = [ e.pageX, e.pageY ];
});

window.addEventListener('mousemove', e => {
  if (start === null) {
    return;
  }
  end[0] = e.pageX;
  end[1] = e.pageY;
  render();
});

window.addEventListener('mouseup', e => {
  if (start === null) {
    return;
  }
  const end  = [ e.pageX, e.pageY ];
  createBox(new AABB(
    [ Math.min(start[0], end[0]), Math.min(start[1], end[1]) ],
    [ Math.max(start[0], end[0]), Math.max(start[1], end[1]) ]
  ));
  start = null;
  nav.layout();
  save();
  render();
});

window.addEventListener('keydown', e => {
  switch (e.key) {
    case 'c':
      clear();
      break;
    case 'ArrowLeft':
      nav.navigate(Direction.Left);
      break;
    case 'ArrowRight':
      nav.navigate(Direction.Right);
      break;
    case 'ArrowUp':
      nav.navigate(Direction.Up);
      break;
    case 'ArrowDown':
      nav.navigate(Direction.Down);
      break;
  }
});

function createBox(aabb: AABB): void {
  const id = nav.add(aabb);
  boxes.push({ id, aabb });
}

function clear() {
  boxes = [];
  save();
  nav.layout();
  render();
}

function save() {
  localStorage.setItem('boxes', JSON.stringify(boxes.map(b => [b.aabb.top, b.aabb.left, b.aabb.bottom, b.aabb.right])));
}

function load() {
  const found = localStorage.getItem('boxes');
  if (found === null) {
    return;
  }
  for (const [top, left, bottom, right] of JSON.parse(found)) {
    createBox(new AABB([ left, top ], [ right, bottom ]));
  }
  nav.layout();
  render();
}

function render() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const box of boxes) {
    if (nav.focus === box) {
      ctx.fillStyle = 'green';
    } else {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    }
    ctx.fillRect(box.aabb.left, box.aabb.top, box.aabb.width, box.aabb.height);
    const outline = nav.getOutline(box.id);
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(outline.left, outline.top, outline.width, outline.height);
  }
  if (start !== null) {
    ctx.fillStyle = 'red';
    ctx.fillRect(start[0], start[1], end[0] - start[0], end[1] - start[1]);
  }
}

load();
