
export function unreachable(): never {
  throw new Error(`Code has been reached that should never be executed. This is a bug.`);
}
