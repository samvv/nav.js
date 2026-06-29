import { v4 as uuid4 } from "uuid";

import { AABB, isIntersectionLineAABB, Line } from "./shapes.js";

export * from "./math.js";
export { AABB, type Line } from "./shapes.js"

export const enum Direction {
  Left,
  Right,
  Up,
  Down,
}

type Handle = {
  id: string;
  base: AABB;
  extended: AABB;
  finishedUp: boolean;
  finishedDown: boolean;
  finishedLeft: boolean;
  finishedRight: boolean;
}

class IterationLimitReachedError extends Error {
}

export class Navigation<T> {

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
      finishedDown: false,
      finishedUp: false,
      finishedLeft: false,
      finishedRight: false,
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
      handle.finishedUp = false;
      handle.finishedDown = false;
      handle.finishedLeft = false;
      handle.finishedRight = false;
    }

    const self = this;

    let i = 0;

    const step = () => {
      if (i++ === 5000) {
        throw new IterationLimitReachedError();
      }
    }

    // TODO use this
    let curr = [...this.getHandles()];
    let next = new Set<Handle>();

    try {

      for (;;) {

        let changed = false;

        for (const handle of this.getHandles()) {

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

          if (!handle.finishedDown) {
            handle.extended.bottom++;
            if (handle.extended.bottom >= this.height || isIntersectionLine([ handle.extended.bottomLeft, handle.extended.bottomRight ])) {
              handle.extended.bottom--;
              handle.finishedDown = true;
            } else {
              step();
              changed = true;
            }
          }
123948
          if (!handle.finishedUp) {
            handle.extended.top--;
            if (handle.extended.top <= 0 || isIntersectionLine([ handle.extended.topLeft, handle.extended.topRight ])) {
              handle.extended.top++;
              handle.finishedUp = true;
            } else {
              step();
              changed = true;
            }
          }

          if (!handle.finishedLeft) {
            handle.extended.left--;
            if (handle.extended.left <= 0 || isIntersectionLine([ handle.extended.topLeft, handle.extended.bottomLeft ])) {
              handle.extended.left++;
              handle.finishedLeft = true;
            } else {
              step();
              changed = true;
            }
          }

          if (!handle.finishedRight) {
            handle.extended.right++;
            if (handle.extended.width >= this.width || isIntersectionLine([ handle.extended.topRight, handle.extended.bottomRight ])) {
              handle.extended.right--;
              handle.finishedRight = true;
            } else {
              step();
              changed = true;
            }
          }

        }

        if (!changed) {
          break;
        }

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
