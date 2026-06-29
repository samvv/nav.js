import { v4 as uuid4 } from "uuid";

import { AABB, isIntersectionLineAABB, Line } from "./shapes.js";
import { which } from "bun";

export * from "./math.js";
export { AABB, type Line } from "./shapes.js"

const MAX_ITERATIONS = 50000;

export const enum Direction {
  Left,
  Right,
  Up,
  Down,
}

const enum HandleFlags {
  FinishedUp    = 1 << 1,
  FinishedDown  = 1 << 2,
  FinishedLeft  = 1 << 3,
  FinishedRight = 1 << 4,
  Finished = FinishedUp | FinishedDown | FinishedLeft | FinishedRight,
}

type Handle = {
  id: string;
  base: AABB;
  extended: AABB;
  flags: number;
  left: Handle[];
  right: Handle[];
  top: Handle[];
  bottom: Handle[];
  focusBottom?: Handle;
  focusTop?: Handle;
  focusLeft?: Handle;
  focusRight?: Handle;
  lastFocusLeft: Handle;
  lastFocusRight: Handle;
  lastFocusTop: Handle;
  lastFocusBottom: Handle;
}

class IterationLimitReachedError extends Error {
}

export class Navigation {

  private handles = new Set<Handle>();
  private handlesById = new Map<string, Handle>();

  public focus: Handle | null = null;

  public constructor(
    public width: number,
    public height: number,
  ) {

  }

  private getHandles(): Iterable<Handle> {
    return this.handles;
  }

  public add(region: AABB): string {
    const id = uuid4();
    const handle: Handle = {
      id,
      base: region,
      extended: region.deepClone(),
      flags: 0,
      left: [],
      right: [],
      top: [],
      bottom: [],
    }
    this.handles.add(handle);
    this.handlesById.set(id, handle);
    return id;
  }

  public getOutline(id: string) {
    return this.handlesById.get(id)!.extended;
  }

  public layout(): void {

    for (const handle of this.getHandles()) {
      handle.extended = handle.base.deepClone();
      handle.flags &= ~HandleFlags.Finished;
      handle.left = [];
      handle.right = [];
      handle.top = [];
      handle.bottom = [];
    }

    const self = this;

    let i = 0;

    const step = () => {
      if (i++ === MAX_ITERATIONS) {
        throw new IterationLimitReachedError();
      }
    }

    let curr = [...this.getHandles()];
    let next = [];

    try {

      for (;;) {

        for (const handle of curr) {

          let handleChanged = false;

          function *intersectHandlesLine(line: Line): Iterable<Handle> {
            for (const other of self.getHandles()) {
              if (other !== handle && isIntersectionLineAABB(line, other.extended)) {
                yield other;
              }
            }
          }

          if ((handle.flags & HandleFlags.FinishedDown) === 0) {
            handle.extended.bottom++;
            const others = [...intersectHandlesLine([ handle.extended.bottomLeft, handle.extended.bottomRight ])];
            if (handle.extended.bottom >= this.height || others.length > 0) {
              handle.extended.bottom--;
              handle.flags |= HandleFlags.FinishedDown;
              for (const other of others) {
                handle.bottom.push(other);
                other.top.push(handle);
              }
            } else {
              step();
              handleChanged = true;
            }
          }

          if ((handle.flags & HandleFlags.FinishedUp) === 0) {
            handle.extended.top--;
            const others = [...intersectHandlesLine([ handle.extended.topLeft, handle.extended.topRight ])];
            if (handle.extended.top <= 0 || others.length > 0) {
              handle.extended.top++;
              handle.flags |= HandleFlags.FinishedUp;
              for (const other of others) {
                handle.top.push(other);
                other.bottom.push(handle);
              }
            } else {
              step();
              handleChanged = true;
            }
          }

          if ((handle.flags & HandleFlags.FinishedLeft) === 0) {
            handle.extended.left--;
            const others = [...intersectHandlesLine([ handle.extended.topLeft, handle.extended.bottomLeft ])];
            if (handle.extended.left <= 0 || others.length > 0) {
              handle.extended.left++;
              handle.left.push();
              handle.flags |= HandleFlags.FinishedLeft;
              for (const other of others) {
                handle.left.push(other);
                other.right.push(handle);
              }
            } else {
              step();
              handleChanged = true;
            }
          }

          if ((handle.flags & HandleFlags.FinishedRight) === 0) {
            handle.extended.right++;
            const others = [...intersectHandlesLine([ handle.extended.topRight, handle.extended.bottomRight ])];
            if (handle.extended.width >= this.width || others.length > 0) {
              handle.extended.right--;
              handle.flags |= HandleFlags.FinishedRight;
              for (const other of others) {
                handle.right.push(other);
                other.left.push(handle);
              }
            } else {
              step();
              handleChanged = true;
            }
          }

          if (handleChanged) {
            next.push(handle);
          }

        }

        if (next.length === 0) {
          break;
        }
        curr = next;
        next = [];

      }

    } catch (error) {
      if (error instanceof IterationLimitReachedError) {
        console.error('Navigation.layout() failed due to too much iterations');
        return;
      }
      throw error;
    }

    for (const handle of this.getHandles()) {
      if (handle.bottom.length > 0) {
        const candidates: Array<[number, Handle]> = [];
        for (const other of handle.bottom) {
          const min = other.extended.left < handle.extended.left
            ? handle.extended.left
            : other.extended.left;
          const max = other.extended.right > handle.extended.right
            ? handle.extended.right
            : other.extended.right;
          const d = max - min;
          candidates.push([ d, other ]);
        }
        candidates.sort((a, b) => b[0] - a[0]);
        handle.focusBottom = candidates[0]![1];
      }
      if (handle.top.length > 0) {
        const candidates: Array<[number, Handle]> = [];
        for (const other of handle.top) {
          const min = other.extended.left < handle.extended.left
            ? handle.extended.left
            : other.extended.left;
          const max = other.extended.right > handle.extended.right
            ? handle.extended.right
            : other.extended.right;
          const d = max - min;
          candidates.push([ d, other ]);
        }
        candidates.sort((a, b) => b[0] - a[0]);
        handle.focusTop = candidates[0]![1];
      }
      if (handle.left.length > 0) {
        const candidates: Array<[number, Handle]> = [];
        for (const other of handle.left) {
          const min = other.extended.top < handle.extended.top
            ? handle.extended.top
            : other.extended.top;
          const max = other.extended.bottom > handle.extended.bottom
            ? handle.extended.bottom
            : other.extended.bottom;
          const d = max - min;
          candidates.push([ d, other ]);
        }
        candidates.sort((a, b) => b[0] - a[0]);
        handle.focusLeft = candidates[0]![1];
      }
      if (handle.right.length > 0) {
        const candidates: Array<[number, Handle]> = [];
        for (const other of handle.right) {
          const min = other.extended.top < handle.extended.top
            ? handle.extended.top
            : other.extended.top;
          const max = other.extended.bottom > handle.extended.bottom
            ? handle.extended.bottom
            : other.extended.bottom;
          const d = max - min;
          candidates.push([ d, other ]);
        }
        candidates.sort((a, b) => b[0] - a[0]);
        handle.focusRight = candidates[0]![1];
      }
    }

  }

  private setFocus(handle: Handle): void {
    if (this.focus !== null) {
      if (this.focus.left.indexOf(handle) !== -1) {
        handle.lastFocusRight = this.focus;
      } else if (this.focus.right.indexOf(handle) !== -1) {
        handle.lastFocusLeft = this.focus;
      } else if (this.focus.top.indexOf(handle) !== -1) {
        handle.lastFocusBottom = this.focus;
      } else if (this.focus.bottom.indexOf(handle) !== -1) {
        handle.lastFocusTop = this.focus;
      }
    }
    this.focus = handle;
  }

  public focusTopLeft(): void {
    let min = null;
    let minX = Infinity;
    let minY = Infinity;
    for (const handle of this.getHandles()) {
      if (handle.extended.left < minX || handle.extended.top < minY) {
        min = handle;
        minX = handle.extended.left;
        minY = handle.extended.top;
      }
    }
    if (min !== null) {
      this.setFocus(min);
    }
  }

  public navigate(direction: Direction): void {
    if (this.focus === null) {
      return;
    }
    let newHandle;
    switch (direction) {
      case Direction.Up:
        newHandle = this.focus.lastFocusTop ?? this.focus.focusTop;
        break;
      case Direction.Down:
        newHandle = this.focus.lastFocusBottom ?? this.focus.focusBottom;
        break;
      case Direction.Left:
        newHandle = this.focus.lastFocusLeft ?? this.focus.focusLeft;
        break;
      case Direction.Right:
        newHandle = this.focus.lastFocusRight ?? this.focus.focusRight;
        break;
    }
    if (newHandle !== undefined) {
      this.setFocus(newHandle);
    }
  }

}
