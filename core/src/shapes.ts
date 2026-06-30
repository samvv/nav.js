
import { Vec2 } from "./math.js";
import { unreachable } from "./util.js";

export enum Direction {
  Left,
  Right,
  Up,
  Down,
}

export enum Axis {
  X,
  Y,
}

export const ALL_DIRECTIONS = [ Direction.Left, Direction.Right, Direction.Up, Direction.Down ];

export function invertAxis(axis: Axis): Axis {
  switch (axis) {
    case Axis.X:
      return Axis.Y;
    case Axis.Y:
      return Axis.X;
  }
}

export function getAxis(direction: Direction): Axis {
  switch (direction) {
    case Direction.Left:
    case Direction.Right:
      return Axis.X;
    case Direction.Up:
    case Direction.Down:
      return Axis.Y;
  }
}

export function axisToBeginDirection(axis: Axis): Direction {
  switch (axis) {
    case Axis.X:
      return Direction.Left;
    case Axis.Y:
      return Direction.Up;
  }
}

export function axisToEndDirection(axis: Axis): Direction {
  switch (axis) {
    case Axis.X:
      return Direction.Right;
    case Axis.Y:
      return Direction.Down;
  }
}

export function invertDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Left:
      return Direction.Right;
    case Direction.Right:
      return Direction.Left;
    case Direction.Up:
      return Direction.Down;
    case Direction.Down:
      return Direction.Up;
  }
}

export type Line = [start: Vec2, end: Vec2];

export class AABB {

  public constructor(
    public readonly topLeft: Vec2,
    public readonly bottomRight: Vec2,
  ) {

  }

  public clone(): AABB {
    return new AABB(this.topLeft, this.bottomRight);
  }

  public deepClone(): AABB {
    return new AABB(Vec2.clone(this.topLeft), Vec2.clone(this.bottomRight));
  }

  public get left(): number {
    return this.topLeft[0];
  }

  public get top(): number {
    return this.topLeft[1];
  }

  public get right(): number {
    return this.bottomRight[0];
  }

  public get bottom(): number {
    return this.bottomRight[1];
  }

  public get(direction: Direction): number {
    switch (direction) {
      case Direction.Left:
        return this.left;
      case Direction.Right:
        return this.right;
      case Direction.Up:
        return this.top;
      case Direction.Down:
        return this.bottom;
    }
  }

  public set left(newLeft: number) {
    this.topLeft[0] = newLeft;
  }

  public set right(newRight: number) {
    this.bottomRight[0] = newRight;
  }

  public set top(newTop: number) {
    this.topLeft[1] = newTop;
  }

  public set bottom(newBottom: number) {
    this.bottomRight[1] = newBottom;
  }

  public get topRight(): Vec2 {
    return [ this.right, this.top ]
  }

  public get bottomLeft(): Vec2 {
    return [ this.left, this.bottom ]
  }

  public get width(): number {
    return this.right - this.left;
  }

  public get height(): number {
    return this.bottom - this.top;
  }

  public get center(): Vec2 {
    return [ (this.left + this.right) / 2, (this.top + this.bottom) / 2 ]
  }

  public getLine(direction: Direction): Line {
    switch (direction) {
      case Direction.Left:
        return [ this.topLeft, this.bottomLeft ];
      case Direction.Right:
        return [ this.topRight, this.bottomRight ];
      case Direction.Up:
        return [ this.topLeft, this.topRight ];
      case Direction.Down:
        return [ this.bottomLeft, this.bottomRight ];
    }
  }

  /**
   * Grow this AABB in the given direction with a fixed size.
   */
  public extend(direction: Direction, n: number): void {
    switch (direction) {
      case Direction.Up:
        this.top -= n;
        break;
      case Direction.Right:
        this.right += n;
        break;
      case Direction.Left:
        this.left -= n;
        break;
      case Direction.Down:
        this.bottom += n;
        break;
    }
  }

  /**
   * Check whether this AABB overflows the given AABB in one particular direction.
   */
  public exceeds(outer: AABB, direction: Direction) {
    switch (direction) {
      case Direction.Left:
        return this.left <= outer.left;
      case Direction.Right:
        return this.right >= outer.right;
      case Direction.Up:
        return this.top <= outer.top;
      case Direction.Down:
        return this.bottom >= outer.bottom;
    }
  }

}

export function isIntersectionPointAABB([x,y]: Vec2, box: AABB): boolean {
  return x >= box.left
      && x <= box.right
      && y >= box.top
      && y <= box.bottom;
}

const INSIDE = 0b0000;
const LEFT   = 0b0001;
const RIGHT  = 0b0010;
const BOTTOM = 0b0100;
const TOP    = 0b1000;

export function isIntersectionLineAABB(line: Line, b: AABB): boolean {

  function getCode(x: number, y: number): number {
    let code = INSIDE;
    if (x < b.left) {
      code |= LEFT;
    } else if (x > b.right) {
      code |= RIGHT;
    }
    if (y < b.top) {
      code |= TOP;
    } else if (y > b.bottom) {
      code |= BOTTOM;
    }
    return code;
  }

  let [[x0, y0], [x1, y1]] = line;

  let code1 = getCode(x0, y0);
  let code2 = getCode(x1, y1);

  for (;;) {
    if ((code1 | code2) === 0) {
      return true;
    }
    if ((code1 & code2) > 0) {
      return false;
    }
    const code = code1 > code2 ? code1 : code2;
    let x, y;
    if (code & TOP) {
      x = x0 + (x1 - x0) * (b.top - y0) / (y1 - y0);
      y = b.top;
    } else if (code & BOTTOM) {
      x = x0 + (x1 - x0) * (b.bottom - y0) / (y1 - y0);
      y = b.bottom;
    } else if (code & RIGHT) {
      x = b.right;
      y = y0 + (y1 - y0) * (b.right - x0) / (x1 - x0);
    } else if (code & LEFT) {
      x = b.left;
      y = y0 + (y1 - y0) * (b.left - x0) / (x1 - x0);
    } else {
      unreachable();
    }
    if (code === code1) {
      x0 = x;
      y0 = y;
      code1 = getCode(x0, y0);
    } else {
      x1 = x;
      y1 = y;
      code2 = getCode(x1, y1);
    }
  }
}
