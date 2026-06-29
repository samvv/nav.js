
export type Vec2 = [x: number, y: number];

export namespace Vec2 {

  export function clone(v: Vec2): Vec2 {
    return [ v[0], v[1] ];
  }

}
