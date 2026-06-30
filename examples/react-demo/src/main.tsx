import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Focusable, FocusGroup, keyboard, Manager, NavigationProvider, type Mode } from '@samvv/nav-react'

type RectangleProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  mode?: Mode;
  start?: boolean;
}

function Rectangle({ mode, color, start, x, y, w, h }: RectangleProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Focusable
      mode={mode}
      defaultFocused={start}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'absolute',
        backgroundColor: color,
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        border: focused ? '4px solid black' : '',
      }}
    />
  );
}

const manager = new Manager(keyboard());

function nextMode(mode: Mode): Mode {
  switch (mode) {
    case 0: return 1;
    case 1: return 0;
    default:
      throw new Error(`Unreachable code executed.`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider manager={manager}>
      <button onClick={() => manager.setMode(nextMode(manager.getMode()))}>Switch Mode</button>
      <Rectangle color="red" start x={100} y={50} w={100} h={50} />
      <Rectangle color="red" x={300} y={25} w={50} h={50} />
      <Rectangle color="red" x={100} y={250} w={100} h={50} />
      <Rectangle color="red" x={300} y={225} w={50} h={50} />
      <FocusGroup mode={1}>
        <Rectangle color="blue" start x={100} y={450} w={100} h={50} />
        <Rectangle color="blue" x={300} y={425} w={50} h={50} />
        <Rectangle color="blue" x={100} y={650} w={100} h={50} />
        <Rectangle color="blue" x={300} y={625} w={50} h={50} />
      </FocusGroup>
    </NavigationProvider>
  </StrictMode>,
)
