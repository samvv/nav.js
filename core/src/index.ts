import { v4 as uuid4 } from "uuid";

import { AABB, isIntersectionLineAABB, Line } from "./shapes.js";

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
}

class IterationLimitReachedError extends Error {
}

export class Navigation {

  private handles = new Set<Handle>();
  private handlesById = new Map<string, Handle>();

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

          function *intersectLine(line: Line): Iterable<Handle> {
            for (const other of self.getHandles()) {
              if (other !== handle && isIntersectionLineAABB(line, other.extended)) {
                yield other;
              }
            }
          }

          function isIntersectionLine(line: Line): boolean {
            return !intersectLine(line)[Symbol.iterator]().next().done;
          }

          if ((handle.flags & HandleFlags.FinishedDown) === 0) {
            handle.extended.bottom++;
            if (handle.extended.bottom >= this.height || isIntersectionLine([ handle.extended.bottomLeft, handle.extended.bottomRight ])) {
              handle.extended.bottom--;
              handle.flags |= HandleFlags.FinishedDown;
            } else {
              step();
              handleChanged = true;
            }
          }

          if ((handle.flags & HandleFlags.FinishedUp) === 0) {
            handle.extended.top--;
            if (handle.extended.top <= 0 || isIntersectionLine([ handle.extended.topLeft, handle.extended.topRight ])) {
              handle.extended.top++;
              handle.flags |= HandleFlags.FinishedUp;
            } else {
              step();
              handleChanged = true;
            }
          }

          if ((handle.flags & HandleFlags.FinishedLeft) === 0) {
            handle.extended.left--;
            if (handle.extended.left <= 0 || isIntersectionLine([ handle.extended.topLeft, handle.extended.bottomLeft ])) {
              handle.extended.left++;
              handle.flags |= HandleFlags.FinishedLeft;
            } else {
              step();
              handleChanged = true;
            }
          }

          if ((handle.flags & HandleFlags.FinishedRight) === 0) {
            handle.extended.right++;
            if (handle.extended.width >= this.width || isIntersectionLine([ handle.extended.topRight, handle.extended.bottomRight ])) {
              handle.extended.right--;
              handle.flags |= HandleFlags.FinishedRight;
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

  }

  public navigate(direction: Direction): void {
    // TODO
  }

}
