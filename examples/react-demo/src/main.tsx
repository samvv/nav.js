import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Focusable, keyboard, Manager, NavigationProvider, type Mode } from '@samvv/nav-react'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider manager={manager}>
      <button onClick={() => manager.setMode(1 - manager.getMode())}>Switch Mode</button>
      <Rectangle color="red" start x={100} y={50} w={100} h={50} />
      <Rectangle color="red" x={300} y={25} w={50} h={50} />
      <Rectangle color="red" x={100} y={250} w={100} h={50} />
      <Rectangle color="red" x={300} y={225} w={50} h={50} />
      <Rectangle color="blue" mode={1} start x={100} y={450} w={100} h={50} />
      <Rectangle color="blue" mode={1} x={300} y={425} w={50} h={50} />
      <Rectangle color="blue" mode={1} x={100} y={650} w={100} h={50} />
      <Rectangle color="blue" mode={1} x={300} y={625} w={50} h={50} />
    </NavigationProvider>
  </StrictMode>,
)
