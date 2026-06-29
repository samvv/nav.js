
import { test, expect } from "bun:test"

import { AABB, isIntersectionPointAABB, isIntersectionLineAABB } from "./shapes.js"

test("isIntersectionPointAABB() correctly detects overlaps", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionPointAABB([ 10, 10 ], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([ 6,  10 ], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([ 14, 10 ], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([ 6, 9 ], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([ 14, 9 ], aabb1)).toBeTrue;
});

test("isIntersectionPointAABB() correctly detects no overlap", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionPointAABB([0, 0], aabb1)).toBeFalse;
  expect(isIntersectionPointAABB([10, 15], aabb1)).toBeFalse;
  expect(isIntersectionPointAABB([20, 9], aabb1)).toBeFalse;
  expect(isIntersectionPointAABB([0, 9], aabb1)).toBeFalse;
});

test("isIntersectionPointAABB() correctly detects overlaps on the edges", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionPointAABB([15, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([14, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([13, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([12, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([11, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([10, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([9, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([8, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([7, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([6, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([5, 8], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([5, 9], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([5, 10], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([5, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([15, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([14, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([13, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([12, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([11, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([10, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([9, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([8, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([7, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([6, 11], aabb1)).toBeTrue;
  expect(isIntersectionPointAABB([5, 11], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects overlaps of one end", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([ [ 0, 0 ], [ 6, 14 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 20, 20 ], [ 6, 14 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 0, 20 ], [ 6, 14 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 20, 0 ], [ 6, 14 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 0, 0 ], [ 10, 10 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 20, 20 ], [ 10, 10 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 0, 20 ], [ 10, 10 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 20, 0 ], [ 10, 10 ] ], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects overlaps inside the AABB", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([ [ 6, 9 ], [ 6, 14 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 6, 11 ], [ 10, 10 ] ], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects overlaps on the edge", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([ [ 0, 0 ], [ 5, 8 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 20, 0 ], [ 15, 8 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 0, 20 ], [ 5, 11 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 20, 20 ], [ 15, 11 ] ], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects overlaps on smaller paralllel segments", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([ [ 10, 8 ], [ 12, 8 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 10, 11 ], [ 12, 11 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 5, 9 ], [ 5, 10 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 15, 9 ], [ 15, 10 ] ], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects overlaps on smaller paralllel segments", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([ [ 2, 8 ], [ 17, 8 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 2, 11 ], [ 17, 11 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 5, 5 ], [ 5, 15 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 15, 5 ], [ 15, 15 ] ], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects no overlap", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([ [ 6, 9 ], [ 6, 14 ] ], aabb1)).toBeTrue;
  expect(isIntersectionLineAABB([ [ 6, 11 ], [ 10, 10 ] ], aabb1)).toBeTrue;
});

test("intersectLineAABB() correctly detects lines going through the AABB", () => {
  const aabb1 = new AABB([ 5, 8 ], [15, 11 ]);
  expect(isIntersectionLineAABB([[ 10, 0 ], [ 10, 20 ]], aabb1)).toBeTrue;
});
