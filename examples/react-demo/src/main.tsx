import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FocusGroup, keyboard, Manager, NavigationProvider, useFocusable, type Mode } from '@samvv/nav-react'

type RectangleProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  mode?: Mode;
  defaultFocused?: boolean;
}

function Rectangle({ mode, color, defaultFocused, x, y, w, h }: RectangleProps) {
  const { ref, focused } = useFocusable<HTMLDivElement>({
    mode,
    defaultFocused,
  });
  return (
    <div ref={ref} style={{
      position: 'absolute',
      backgroundColor: color,
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      border: focused ? '4px solid black' : '',
    }} />
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
      <Rectangle defaultFocused color="red" x={100} y={50} w={100} h={50} />
      <Rectangle color="red" x={300} y={25} w={50} h={50} />
      <Rectangle color="red" x={100} y={250} w={100} h={50} />
      <Rectangle color="red" x={300} y={225} w={50} h={50} />
      <FocusGroup mode={1}>
        <Rectangle color="blue" defaultFocused x={100} y={450} w={100} h={50} />
        <Rectangle color="blue" x={300} y={425} w={50} h={50} />
        <Rectangle color="blue" x={100} y={650} w={100} h={50} />
        <Rectangle color="blue" x={300} y={625} w={50} h={50} />
      </FocusGroup>
    </NavigationProvider>
  </StrictMode>,
)
