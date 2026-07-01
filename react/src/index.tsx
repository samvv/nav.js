import { AABB, Direction, Navigation, type RegionId } from "@samvv/nav";
import { createContext, useContext, useEffect, useId, useRef } from "react";
import { debounceTime, Subject, Subscription } from "rxjs";

// TODO throttle layout updates
// TODO register window resize events
// TODO copy data from old manager to new manager

export type OnFocusFn = () => void;
export type OnBlurFn = () => void;

export type Mode = number | string

const DEFAULT_MODE: Mode = 0;
const UPDATE_THROTTLE_MSEC = 200;

type Element = {
  id: string;
  mode: Mode;
  region: RegionId;
  onFocus?: OnFocusFn | undefined;
  onBlur?: OnBlurFn | undefined;
}

class DOMNavigation extends Navigation {

  private updates = new Subject<void>();

  public constructor() {
    super(window.innerWidth, window.innerHeight);
    this.updates.pipe(debounceTime(UPDATE_THROTTLE_MSEC)).subscribe(() => {
      super.update();
    });
  }

  public override update(): void {
    this.updates.next();
  }

}

type ModeInfo = {
  /**
   * A React ID pointing to the component that needs to be focused, or null if there is no focus.
   */
  focus: string | null;
  nav: Navigation;
};

export class Manager {

  private subscription: Subscription;
  private elementsByReactId = new Map<string, Element>();
  private elementsByRegionId = new Map<RegionId, Element>();
  private modeMap = new Map<Mode, ModeInfo>();

  public constructor(
    private device: Device,
    private mode = DEFAULT_MODE
  ) {
    console.log('construct');
    this.subscription = device.move.subscribe(dir => this.navigate(dir));
  }

  private get focus(): string | null {
    return this.getModeInfo(this.mode).focus;
  }

  private getModeInfo(mode: Mode): ModeInfo {
    let data = this.modeMap.get(mode);
    if (data === undefined) {
      data = { focus: null, nav: new DOMNavigation() };
      this.modeMap.set(mode, data);
    }
    return data;
  }

  private getNav(mode: Mode): Navigation {
    return this.getModeInfo(mode).nav;
  }

  public register(id: string, mode: Mode, node: HTMLElement, onFocus: OnFocusFn | undefined, onBlur: OnBlurFn | undefined): void {
    console.log('register', id)
    const existing = this.elementsByReactId.get(id);
    if (existing !== undefined) {
      console.log('update', id);
      if (existing.mode !== mode) {
        const nav1 = this.getNav(existing.mode);
        nav1.remove(existing.region);
        nav1.update();
        existing.mode = mode;
        const nav2 = this.getNav(mode);
        nav2.add(existing.region.base);
        nav2.update();
      }
      existing.onFocus = onFocus;
      existing.onBlur = onBlur;
      return;
    }
    const nav = this.getNav(mode);
    const rect = node.getBoundingClientRect();
    const aabb = new AABB([ rect.left, rect.top ], [ rect.right, rect.bottom ]);
    const region = nav.add(aabb);
    const element: Element = { id, mode, region, onBlur, onFocus };
    this.elementsByRegionId.set(region, element);
    this.elementsByReactId.set(id, element);
    nav.update();
  }

  public unregister(id: string): void {
    console.log('unregister', id)
    const element = this.elementsByReactId.get(id);
    if (element !== undefined) {
      const nav = this.getNav(element.mode);
      nav.remove(element.region);
      this.elementsByRegionId.delete(element.region);
      this.elementsByReactId.delete(id);
      nav.update();
    }
  }

  public setFocus(newMode: Mode, newFocus: string | null): void {
    if (this.focus !== null) {
      const element = this.elementsByReactId.get(this.focus);
      element?.onBlur?.();
    }
    this.mode = newMode;
    this.getModeInfo(newMode).focus = newFocus;
    if (newFocus !== null) {
      const element = this.elementsByReactId.get(newFocus);
      element?.onFocus?.();
    }
  }

  public navigate(direction: Direction): void {
    if (this.focus === null) {
      return;
    }
    const element = this.elementsByReactId.get(this.focus);
    if (element === undefined) {
      console.warn(`Navigation element for React component ID ${this.focus} not found.`);
      return;
    }
    const nav = this.getNav(element.mode);
    const newElement = this.elementsByRegionId.get(nav.navigate(element.region, direction) ?? element.region);
    if (newElement !== undefined) {
      this.setFocus(this.mode, newElement.id);
    }
  }

  public getMode(): Mode {
    return this.mode;
  }

  public setMode(newMode: Mode): void {
    if (newMode === this.mode) {
      return;
    }
    this.setFocus(newMode, this.getModeInfo(newMode).focus);
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
  manager: Manager;
  children: React.ReactNode;
}

export function NavigationProvider({ manager, children }: NavigationProviderProps) {
  return (
    <Ctx.Provider value={manager}>
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

export type FocusGroupProps = {
  mode: Mode;
  children: React.ReactNode;
}

const FocusGroupContext = createContext<Mode>(DEFAULT_MODE);

export function FocusGroup({ mode, children }: FocusGroupProps) {
  return (
    <FocusGroupContext.Provider value={mode}>
      {children}
    </FocusGroupContext.Provider>
  );
}

function useNearestFocusGroupMode(): Mode {
  return useContext(FocusGroupContext);
}

export type FocusableProps = {
  onFocus?: OnFocusFn;
  onBlur?: OnBlurFn;
  mode?: Mode;
  defaultFocused?: boolean;
  children: React.ReactNode;
}

export function Focusable({
  onFocus,
  onBlur,
  defaultFocused,
  mode: modeOverride,
  ...props
}: FocusableProps) {
  const id = useId();
  const didDefaultFocus = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const groupMode = useNearestFocusGroupMode();
  const mode = modeOverride ?? groupMode;
  const manager = useManager();
  const callbacksRef = useRef({ onFocus, onBlur });
  callbacksRef.current = { onFocus, onBlur };
  useEffect(() => {
    const element = elementRef.current;
    if (element !== null) {
      const stableFocus = () => callbacksRef.current.onFocus?.();
      const stableBlur = () => callbacksRef.current.onBlur?.();
      manager.register(id, mode, element, stableFocus, stableBlur);
      return () => {
        manager.unregister(id);
      }
    }
  }, [ manager, elementRef.current ]);
  useEffect(() => {
    if (!defaultFocused || didDefaultFocus.current) {
      return;
    }
    manager.setFocus(mode, id);
    didDefaultFocus.current = true;
  }, [ manager, defaultFocused ]);
  return (
    <div ref={elementRef} {...props} />
  );
}
