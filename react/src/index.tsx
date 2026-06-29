import { AABB, Direction, Navigation, type RegionId } from "@samvv/nav";
import { createContext, useContext, useEffect, useId, useRef } from "react";
import { Subject, Subscription } from "rxjs";

// TODO throttle layout updates
// TODO register window resize events

export type OnFocusFn = () => void;
export type OnBlurFn = () => void;

export type FocusableProps = {
  onFocus?: OnFocusFn;
  onBlur?: OnBlurFn;
  defaultFocused?: boolean;
  children: React.ReactNode;
}

type Element = { id: string, region: RegionId, onFocus?: OnFocusFn | undefined; onBlur?: OnBlurFn | undefined; }

export class Manager {

  private subscription: Subscription;
  private focus: string | null = null;
  private elementsByReactId = new Map<string, Element>();
  private elementsByRegionId = new Map<RegionId, Element>();
  public nav = new Navigation(
    window.innerWidth,
    window.innerHeight
  );

  public constructor(
    private device: Device
  ) {
    console.log('construct');
    this.subscription = device.move.subscribe(dir => this.navigate(dir));
  }

  public register(id: string, node: HTMLElement, onFocus: OnFocusFn | undefined, onBlur: OnBlurFn | undefined): void {
    console.log('register', id)
    const existing = this.elementsByReactId.get(id);
    if (existing !== undefined) {
      console.log('update', id);
      existing.onFocus = onFocus;
      existing.onBlur = onBlur;
      return;
    }
    const rect = node.getBoundingClientRect();
    const aabb = new AABB([ rect.left, rect.top ], [ rect.right, rect.bottom ]);
    const region = this.nav.add(aabb);
    const element: Element = { id, region, onBlur, onFocus };
    this.elementsByRegionId.set(region, element);
    this.elementsByReactId.set(id, element);
    this.update();
  }

  private update() {
    // TODO throttle me
    this.nav.update();
  }

  public unregister(id: string): void {
    console.log('unregister', id)
    const element = this.elementsByReactId.get(id);
    if (element !== undefined) {
      this.nav.remove(element.region);
      this.elementsByRegionId.delete(element.region);
      this.elementsByReactId.delete(id);
      this.update();
    }
  }

  public setFocus(newFocus: string): void {
    if (this.focus !== null) {
      const element = this.elementsByReactId.get(this.focus);
      if (element !== undefined && element.onBlur !== undefined) {
        element.onBlur();
      }
    }
    this.focus = newFocus;
    const element = this.elementsByReactId.get(this.focus);
    if (element !== undefined && element.onFocus !== undefined) {
      element.onFocus();
    }
  }

  public navigate(direction: Direction): void {
    if (this.focus === null) {
      return;
    }
    const element = this.elementsByReactId.get(this.focus);
    if (element === undefined) {
      console.warn(`Navigation region for React component ID ${this.focus} not found.`);
      return;
    }
    const newElement = this.elementsByRegionId.get(this.nav.navigate(element.region, direction) ?? element.region);
    if (newElement !== undefined) {
      this.setFocus(newElement.id);
    }
  }

  public close(): void {
    this.subscription.unsubscribe();
  }

}

const Ctx = createContext<Manager | null>(null);

export interface Device {
  move: Subject<Direction>;
  close: () => void;
}

export function keyboard(): Device {
  const move = new Subject<Direction>;
  const handler = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        move.next(Direction.Left);
        break;
      case 'ArrowRight':
        move.next(Direction.Right);
        break;
      case 'ArrowUp':
        move.next(Direction.Up);
        break;
      case 'ArrowDown':
        move.next(Direction.Down);
        break;
    }
  }
  window.addEventListener('keydown', handler);
  return {
    move,
    close() {
      window.removeEventListener('keydown', handler);
    }
  };
}

export type NavigationProviderProps = {
  device: Device;
  children: React.ReactNode;
}

export function NavigationProvider({ device, children }: NavigationProviderProps) {
  // FIXME manager will not be re-created on change
  const managerRef = useRef<Manager>(null);
  if (managerRef.current === null) {
    managerRef.current = new Manager(device);
  }
  return (
    <Ctx.Provider value={managerRef.current}>
      {children}
    </Ctx.Provider>
  );
}

function useManager() {
  const nav = useContext(Ctx);
  if (nav === null) {
    throw new Error(`The context wasn't set. Are you sure your application is wrapped in <NavigationProvider />?`);
  }
  return nav;
}

export function Focusable({
  onFocus,
  onBlur,
  defaultFocused,
  ...props
}: FocusableProps) {
  const id = useId();
  const didDefaultFocus = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const manager = useManager();
  useEffect(() => {
    const element = elementRef.current;
    if (element !== null) {
      manager.register(id, element, onFocus, onBlur);
      return () => {
        manager.unregister(id);
      }
    }
  }, [ manager, elementRef.current ]);
  useEffect(() => {
    if (didDefaultFocus.current) {
      return;
    }
    if (defaultFocused) {
      manager.setFocus(id);
      didDefaultFocus.current = true;
    }
  }, [ manager, defaultFocused ]);
  return (
    <div ref={elementRef} {...props} />
  );
}
