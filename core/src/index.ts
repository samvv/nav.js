import { AABB, ALL_DIRECTIONS, axisToBeginDirection, Direction, axisToEndDirection, getAxis, invertDirection, isIntersectionLineAABB, Line, invertAxis } from "./shapes.js";

export * from "./math.js";
export { Direction, AABB, type Line } from "./shapes.js"

const MAX_ITERATIONS = 50000;

export type RegionId = Handle;

type Handle = {
  base: AABB;
  extended: AABB;
  finishedFlags: number;
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
      break;
    case Direction.Down:
      handle.lastFocusBottom = newHandle;
      break;
    case Direction.Left:
      handle.lastFocusLeft = newHandle;
      break;
    case Direction.Right:
      handle.lastFocusRight = newHandle;
      break;
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

  private frame: AABB;
  private handles = new Set<Handle>();

  public constructor(
    width: number,
    height: number,
  ) {
    this.frame = new AABB([ 0, 0 ], [ width, height ]);
  }

  private getHandles(): Iterable<Handle> {
    return this.handles;
  }

  public add(box: AABB): RegionId {
    const handle: Handle = {
      base: box,
      extended: box.deepClone(),
      finishedFlags: 0,
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
      handle.finishedFlags = 0;
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

          for (const direction of ALL_DIRECTIONS) {
            const bit = 1 << direction;
            if ((handle.finishedFlags & bit) === 0) {
              const delta = 1;
              handle.extended.extend(direction, delta);
              const others = [...intersectHandlesLine(handle.extended.getLine(direction))];
              if (handle.extended.exceeds(this.frame, direction) || others.length > 0) {
                handle.extended.extend(direction, -delta);
                handle.finishedFlags |= bit;
                for (const other of others) {
                  getNeighbours(handle, direction).push(other);
                  getNeighbours(other, invertDirection(direction)).push(handle);
                }
              } else {
                step();
                handleChanged = true;
              }
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
      for (const direction of ALL_DIRECTIONS) {
        const neighbours = getNeighbours(handle, direction);
        if (neighbours.length > 0) {
          const overlapAxis = invertAxis(getAxis(direction));
          const start = axisToBeginDirection(overlapAxis);
          const stop = axisToEndDirection(overlapAxis);
          const candidates: Array<[number, Handle]> = [];
          for (const other of neighbours) {
            const min = Math.max(other.extended.get(start), handle.extended.get(start));
            const max = Math.min(other.extended.get(stop), handle.extended.get(stop));
            const d = max - min;
            candidates.push([ d, other ]);
          }
          candidates.sort((a, b) => b[0] - a[0]);
          setDefaultFocus(handle, direction, candidates[0]![1]);
        }
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
