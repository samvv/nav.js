import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Focusable, keyboard, NavigationProvider } from '@samvv/nav-react'

type RectangleProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  start?: boolean;
}

function Rectangle({ start, x, y, w, h }: RectangleProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Focusable
      defaultFocused={start}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'absolute',
        backgroundColor: 'red',
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        border: focused ? '4px solid black' : '',
      }}
    />
  );
}

const kb = keyboard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider device={kb}>
      <Rectangle start x={100} y={50} w={100} h={50} />
      <Rectangle x={300} y={25} w={50} h={50} />
      <Rectangle x={100} y={250} w={100} h={50} />
      <Rectangle x={300} y={225} w={50} h={50} />
    </NavigationProvider>
  </StrictMode>,
)
