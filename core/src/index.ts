import { AABB, isIntersectionLineAABB, Line } from "./shapes.js";

export * from "./math.js";
export { AABB, type Line } from "./shapes.js"

const MAX_ITERATIONS = 50000;

export enum Direction {
  Left,
  Right,
  Up,
  Down,
}

const ALL_DIRECTIONS = [ Direction.Left, Direction.Right, Direction.Up, Direction.Down ];

function invertDirection(direction: Direction): Direction {
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

const enum HandleFlags {
  FinishedUp    = 1 << 1,
  FinishedDown  = 1 << 2,
  FinishedLeft  = 1 << 3,
  FinishedRight = 1 << 4,
  Finished = FinishedUp | FinishedDown | FinishedLeft | FinishedRight,
}

export type RegionId = Handle;

type Handle = {
  base: AABB;
  extended: AABB;
  flags: number;
  left: Handle[];
  right: Handle[];
  top: Handle[];
  bottom: Handle[];
  defaultFocusBottom?: Handle;
  defaultFocusTop?: Handle;
  defaultFocusLeft?: Handle;
  defaultFocusRight?: Handle;
  lastFocusLeft?: Handle | undefined;
  lastFocusRight?: Handle | undefined;
  lastFocusTop?: Handle | undefined;
  lastFocusBottom?: Handle | undefined;
}

function getLastFocus(handle: Handle, direction: Direction): Handle | undefined {
  switch (direction) {
    case Direction.Up:
      return handle.lastFocusTop;
    case Direction.Down:
      return handle.lastFocusBottom;
    case Direction.Left:
      return handle.lastFocusLeft;
    case Direction.Right:
      return handle.lastFocusRight;
  }
}

function setLastFocus(handle: Handle, direction: Direction, newHandle: Handle | undefined): void {
  switch (direction) {
    case Direction.Up:
      handle.lastFocusTop = newHandle;
    case Direction.Down:
      handle.lastFocusBottom = newHandle;
    case Direction.Left:
      handle.lastFocusLeft = newHandle;
    case Direction.Right:
      handle.lastFocusRight = newHandle;
  }
}

function getDefaultFocus(handle: Handle, direction: Direction): Handle | undefined {
  switch (direction) {
    case Direction.Up:
      return handle.lastFocusTop;
    case Direction.Down:
      return handle.lastFocusBottom;
    case Direction.Left:
      return handle.lastFocusLeft;
    case Direction.Right:
      return handle.lastFocusRight;
  }
}

function setDefaultFocus(handle: Handle, direction: Direction, newHandle: Handle | undefined): void {
  switch (direction) {
    case Direction.Up:
      handle.lastFocusTop = newHandle;
    case Direction.Down:
      handle.lastFocusBottom = newHandle;
    case Direction.Left:
      handle.lastFocusLeft = newHandle;
    case Direction.Right:
      handle.lastFocusRight = newHandle;
  }
}

function getNeighbours(handle: Handle, direction: Direction): Handle[] {
  switch (direction) {
    case Direction.Left:
      return handle.left;
    case Direction.Right:
      return handle.right;
    case Direction.Up:
      return handle.top;
    case Direction.Down:
      return handle.bottom;
  }
}

class IterationLimitReachedError extends Error {
}

export class Navigation {

  private handles = new Set<Handle>();

  public constructor(
    public width: number,
    public height: number,
  ) {

  }

  private getHandles(): Iterable<Handle> {
    return this.handles;
  }

  public add(box: AABB): RegionId {
    const handle: Handle = {
      base: box,
      extended: box.deepClone(),
      flags: 0,
      left: [],
      right: [],
      top: [],
      bottom: [],
    }
    this.handles.add(handle);
    return handle;
  }

  public getAABB(id: RegionId): AABB {
    return (id as Handle).base;
  }

  public remove(id: RegionId): void {
    const handle = id as Handle;

    for (const direction of ALL_DIRECTIONS) {
      const neighbours = getNeighbours(handle, direction);

      for (const neighbour of neighbours) {

        // Remove handle from the neighbours' neighbours
        const neighbours2 = getNeighbours(neighbour, invertDirection(direction))
        for (let i = 0; i < neighbours.length;) {
          if (neighbours2[i] === handle) {
            neighbours2.splice(i, 1);
            continue;
          }
          i++;
        }

        // Reset the last focus if it points to handle
        for (const direction2 of ALL_DIRECTIONS) {
          const inverted = invertDirection(direction2);
          const last = getLastFocus(neighbour, inverted);
          if (last === handle) {
            setLastFocus(last, inverted, undefined);
          }
        }

        // Reset the default focus point if it points to handle
        for (const direction2 of ALL_DIRECTIONS) {
          const inverted = invertDirection(direction2);
          const last = getDefaultFocus(neighbour, inverted);
          if (last === handle) {
            setDefaultFocus(last, inverted, undefined);
          }
        }

      }

    }

    this.handles.delete(handle);
  }

  /**
   * @deprecated
   */
  public getExtendedOutline(id: RegionId) {
    return (id as Handle).extended;
  }

  public update(): void {

    // Reset the handles
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

    // Used to limit how long this algorithm may take
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
        handle.defaultFocusBottom = candidates[0]![1];
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
        handle.defaultFocusTop = candidates[0]![1];
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
        handle.defaultFocusLeft = candidates[0]![1];
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
        handle.defaultFocusRight = candidates[0]![1];
      }
    }

  }

  public getRegions(): Iterable<RegionId> {
    return this.handles.values();
  }

  public navigate(id: RegionId, direction: Direction): RegionId | undefined {
    const handle = id as Handle;
    let newHandle;
    switch (direction) {
      case Direction.Up:
        newHandle = handle.lastFocusTop ?? handle.defaultFocusTop;
        break;
      case Direction.Down:
        newHandle = handle.lastFocusBottom ?? handle.defaultFocusBottom;
        break;
      case Direction.Left:
        newHandle = handle.lastFocusLeft ?? handle.defaultFocusLeft;
        break;
      case Direction.Right:
        newHandle = handle.lastFocusRight ?? handle.defaultFocusRight;
        break;
    }
    if (newHandle !== undefined) {
      if (handle.left.indexOf(newHandle) !== -1) {
        newHandle.lastFocusRight = handle;
      } else if (handle.right.indexOf(newHandle) !== -1) {
        newHandle.lastFocusLeft = handle;
      } else if (handle.top.indexOf(newHandle) !== -1) {
        newHandle.lastFocusBottom = handle;
      } else if (handle.bottom.indexOf(newHandle) !== -1) {
        newHandle.lastFocusTop = handle;
      }
    }
    return newHandle;
  }

}
