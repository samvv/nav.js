Nav
===

Nav is a JavaScript/TypeScript library for automatically generating directional
navigation. With Nav, you can navigate any app with just your arrow keys,
without ever needing to explicitly define which element flows to which other
element.

## Quick Start

```sh
npm install @samvv/nav
```

```ts
import { Navigation, AABB, Direction } from "@samvv/nav"

const nav = new Navigation();

const rect1 = new AABB([ 50, 100 ], [ 200, 500 ]);
const rect2 = new AABB([ 350, 200 ], [ 400, 600 ]);

const rect1Handle = nav.add(rect1);
const rect1Handle = nav.add(rect2);

assert(nav.focus === null);

let focus = rect1Handle;

focus = nav.navigate(focus, Direction.Right); // Move to rect2
focus = nav.navigate(focus, Direction.Left); // Move to rect1

assert(focus == rect1Handle);
```

## API

### new Navigation(opts)

Create a new object that holds a single layout and is able to navigate that
layout.

Currently there are no options to be passed.

### Navigation.add(aabb)

Add a focusable region to the layout.

The region is described by an axis-aligned bounding box (AABB). This is similar
to a plain rectangle that does not have any special transformations applied to
it.

This function returns a transparent handle to that region inside the layout.
You can pass it to `.remove()` to delete the region or `.navigate()` to move
focus.

```ts
// Add a square of size 10 to the layout
nav.add(new AABB([ 5, 5 ], [ 15, 15 ]));
```

### Navigation.remove(handle)

Remove a focusable region from the layout.

```ts
const x = nav.add(new AABB([ 5, 5 ], [ 15, 15 ]));

nav.remove(x);
```

### Navigation.update()

Analyse the layout of all of the elements that were added and re-calculate a
graph that allows `.navigate()` to work.

You must call this method at least once before using `.navigate()`.
Likewise, you must ensure that this method has been called at least once after
several calls to `.add()` or `.remove()`.

> [!WARNING]
>
> Depending on the algorithm that this library uses at the moment, this
> operation can be very intensive. Try to batch calls to `.add()` and
> `.remove()` as much as possible before calling this method!

```ts
nav.add(new AABB([ 5, 5 ], [ 15, 15 ]));
nav.add(new AABB([ 20, 20 ], [ 40, 45 ]));
nav.add(new AABB([ 5, 100 ], [ 50, 120 ]));

nav.update();
```

### Navigation.navigate(focus, direction)

Move the focus point left, right, up or down.
