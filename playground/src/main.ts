import "./style.css";

import { Navigation, AABB, RegionId, type Vec2, Direction } from "@samvv/nav";

const nav = new Navigation(window.innerWidth, window.innerHeight);

const canvas = document.createElement('canvas');
canvas.style.display = 'block';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d')!;

let boxes: RegionId[] = [];
let start: Vec2 | null = null;
const end = [0, 0];
let focus: RegionId | null = null;

function setFocus(newFocus: RegionId | null): void {
  focus = newFocus;
}

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
  if (start[0] === end[0] || start[1] === end[1]) {
    return;
  }
  createBox(new AABB(
    [ Math.min(start[0], end[0]), Math.min(start[1], end[1]) ],
    [ Math.max(start[0], end[0]), Math.max(start[1], end[1]) ]
  ));
  start = null;
  nav.update();
  save();
  render();
});

window.addEventListener('keydown', e => {
  switch (e.key) {
    case 'c':
      clear();
      break;
    case 'ArrowLeft':
      if (focus !== null) {
        setFocus(nav.navigate(focus, Direction.Left) ?? focus);
      }
      render();
      break;
    case 'ArrowRight':
      if (focus !== null) {
        setFocus(nav.navigate(focus, Direction.Right) ?? focus);
      }
      render();
      break;
    case 'ArrowUp':
      if (focus !== null) {
        setFocus(nav.navigate(focus, Direction.Up) ?? focus);
      }
      render();
      break;
    case 'ArrowDown':
      if (focus !== null) {
        setFocus(nav.navigate(focus, Direction.Down) ?? focus);
      }
      render();
      break;
  }
});

function createBox(aabb: AABB): void {
  const id = nav.add(aabb);
  boxes.push(id);
  if (focus === null) {
    setFocus(id);
  }
}

function clear() {
  for (const box of boxes) {
    nav.remove(box);
  }
  boxes = [];
  nav.update();
  setFocus(null);
  save();
  render();
}

function save() {
  localStorage.setItem('boxes', JSON.stringify(boxes.map(b => {
    const aabb = nav.getAABB(b);
    return [aabb.top, aabb.left, aabb.bottom, aabb.right]
  })));
}

function load() {
  const found = localStorage.getItem('boxes');
  if (found === null) {
    return;
  }
  for (const [top, left, bottom, right] of JSON.parse(found)) {
    createBox(new AABB([ left, top ], [ right, bottom ]));
  }
  nav.update();
  render();
}

function render() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const box of boxes) {
    if (focus === box) {
      ctx.fillStyle = 'green';
    } else {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    }
    const aabb = nav.getAABB(box);
    ctx.fillRect(aabb.left, aabb.top, aabb.width, aabb.height);
    const outline = nav.getExtendedOutline(box);
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(outline.left, outline.top, outline.width, outline.height);
  }
  if (start !== null) {
    ctx.fillStyle = 'red';
    ctx.fillRect(start[0], start[1], end[0] - start[0], end[1] - start[1]);
  }
}

load();
