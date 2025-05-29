import { isArray, isBoolean, isNumber, isNull, isObject, isString, isUndefined, } from 'lodash-es';
export * from './system.js';
export * from './lib';

import { createReactiveSystem, type ReactiveFlags, type ReactiveNode, type Link } from './system.js';

const enum EffectFlags {
  Queued = 1 << 6,
}

interface IEffectScope extends ReactiveNode {
  cleanups?: (() => void)[];
}

export interface IEffect extends ReactiveNode {
  fn(): void;
}

export interface IComputed<T = any, S = T> extends ReactiveNode {
  value: T | undefined;
  getter: (previousValue?: S) => T;
  setter?: (newValue: S) => void;
}

interface ISignal<T = any> extends ReactiveNode {
  previousValue?: T;
  value?: T;
}

const pauseStack: (ReactiveNode | undefined)[] = [];
const queuedEffects: (IEffect | IEffectScope | undefined)[] = [];
const {
  link,
  unlink,
  propagate,
  checkDirty,
  endTracking,
  startTracking,
  shallowPropagate,
} = createReactiveSystem({
  update(signal: ISignal | IComputed): boolean {
    // console.warn('update signal is ', signal);
    if ('getter' in signal) {
      return updateComputed(signal);
    } else {
      return updateSignal(signal, signal.value);
    }
  },
  notify,
  unwatched(node: ISignal | IComputed | IEffect | IEffectScope) {
    if ('getter' in node) {
      let toRemove = node.deps;
      if (toRemove !== undefined) {
        node.flags = 17 as ReactiveFlags.Mutable | ReactiveFlags.Dirty;
        do {
          toRemove = unlink(toRemove, node);
        } while (toRemove !== undefined);
      }
    } else if (!('previousValue' in node)) {
      effectOper.call(node);
    }
  },
});

export let batchDepth = 0;

let notifyIndex = 0;
let queuedEffectsLength = 0;
let activeSub: ReactiveNode | undefined;
let activeScope: IEffectScope | undefined;

export function getCurrentSub(): ReactiveNode | undefined {
  return activeSub;
}

export function setCurrentSub(sub: ReactiveNode | undefined) {
  const prevSub = activeSub;
  activeSub = sub;
  return prevSub;
}

export function getCurrentScope(): IEffectScope | undefined {
  return activeScope;
}

export function setCurrentScope(scope: IEffectScope | undefined) {
  const prevScope = activeScope;
  activeScope = scope;
  return prevScope;
}

export function startBatch() {
  ++batchDepth;
}

export function endBatch() {
  if (!--batchDepth) {
    flush();
  }
}

/**
 * @deprecated Will be removed in the next major version. Use `const pausedSub = setCurrentSub(undefined)` instead for better performance.
 */
export function pauseTracking() {
  pauseStack.push(setCurrentSub(undefined));
}

/**
 * @deprecated Will be removed in the next major version. Use `setCurrentSub(pausedSub)` instead for better performance.
 */
export function resumeTracking() {
  setCurrentSub(pauseStack.pop());
}

export function signal<T>(): Signal<T>;
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T>(initialValue?: T): Signal<T> {
  if (arguments.length) {
    return new Signal<T>(initialValue);
  }
  return new Signal<T>();
}

export function computed<T>(getter: (previousValue?: any) => T,
                            setter?: (newValue: any) => void): Computed<T> {
  return new Computed(getter, setter);
}

export function effect(fn: () => void): () => void {
  const e: IEffect = {
    fn,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: 2 satisfies  ReactiveFlags.Watching,
  };
  if (activeSub !== undefined) {
    link(e, activeSub);
  } else if (activeScope !== undefined) {
    link(e, activeScope);
  }
  const prev = setCurrentSub(e);
  try {
    e.fn();
  } finally {
    setCurrentSub(prev);
  }
  return effectOper.bind(e);
}

export function effectScope(fn: () => void): () => void {
  const e: IEffectScope = {
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    flags: 0 satisfies ReactiveFlags.None,
  };
  if (activeScope !== undefined) {
    link(e, activeScope);
  }
  const prevSub = setCurrentSub(undefined);
  const prevScope = setCurrentScope(e);
  try {
    fn();
  } finally {
    setCurrentScope(prevScope);
    setCurrentSub(prevSub);
  }
  return effectOper.bind(e);
}

function updateComputed(c: IComputed): boolean {
  // console.warn('update computed is ', c);
  const prevSub = setCurrentSub(c);
  startTracking(c);
  try {
    const oldValue = c.value;
    // const value = c.value; // todo ？？？ 路由页面无法加载
    if (isObject(oldValue)) {
      if (oldValue instanceof Element) {
        // 	nothing
      } else if (oldValue instanceof Map) {
        // console.error('Map same value, ', oldValue); // todo 无效 ？？？
      } else {
        // console.error('object same value, ', value);
      }
      c.value = c.getter(oldValue);
      return true;
    }
    return oldValue !== (c.value = c.getter(oldValue));
  } finally {
    setCurrentSub(prevSub);
    endTracking(c);
  }
}
// todo  Map, Object
function updateSignal(s: ISignal, value: any): boolean {
  // console.warn('update signal is ', s);
  s.flags = 1 satisfies ReactiveFlags.Mutable;
  if (isObject(value)) {
    if (value instanceof Element) {
      // 	nothing
    } else if (value instanceof Map) {
      // console.error('Map same value, ', value); // todo 无效 ？？？
    } else {
      // console.error('object same value, ', value);
    }
    return true;
  }
  return s.previousValue !== (s.previousValue = value);
}

function notify(e: IEffect | IEffectScope) {
  const flags = e.flags;
  if (!(flags & EffectFlags.Queued)) {
    e.flags = flags | EffectFlags.Queued;
    const subs = e.subs;
    if (subs !== undefined) {
      notify(subs.sub as IEffect | IEffectScope);
    } else {
      queuedEffects[queuedEffectsLength++] = e;
    }
  }
}

function run(e: IEffect | IEffectScope, flags: ReactiveFlags): void {
  if (
    flags & 16 satisfies ReactiveFlags.Dirty
    || (flags & 32 satisfies ReactiveFlags.Pending && checkDirty(e.deps!, e))
  ) {
    const prev = setCurrentSub(e);
    startTracking(e);
    try {
      (e as IEffect).fn();
    } finally {
      setCurrentSub(prev);
      endTracking(e);
    }
    return;
  } else if (flags & 32 satisfies ReactiveFlags.Pending) {
    e.flags = flags & ~(32 satisfies ReactiveFlags.Pending);
  }
  let link = e.deps;
  while (link !== undefined) {
    const dep = link.dep;
    const depFlags = dep.flags;
    if (depFlags & EffectFlags.Queued) {
      run(dep, dep.flags = depFlags & ~EffectFlags.Queued);
    }
    link = link.nextDep;
  }
}

function flush(): void {
  while (notifyIndex < queuedEffectsLength) {
    const effect = queuedEffects[notifyIndex]!;
    queuedEffects[notifyIndex++] = undefined;
    run(effect, effect.flags &= ~EffectFlags.Queued);
  }
  notifyIndex = 0;
  queuedEffectsLength = 0;
}

export class Computed<T> implements IComputed<T> {
  value: T | undefined;

  // ReactiveNode
  deps?: Link;
  depsTail?: Link;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;

  getter: (previousValue?: any) => T;
  setter?: (newValue: any) => void; // add by me
  constructor(
    getter: (cachedValue?: any) => T,
    setter?: (newValue: any) => void
  ) {
    // this.value = undefined;
    // this.subs = undefined;
    // this.subsTail = undefined;
    // this.deps = undefined;
    // this.depsTail = undefined;
    this.flags =  17 as ReactiveFlags.Mutable | ReactiveFlags.Dirty;
    this.getter = getter;
    if (setter) {
      this.setter = setter;
    }
  }

  get() {
    // console.error('Computed get . ');
    const flags = this.flags;
    if (
      flags & 16 satisfies ReactiveFlags.Dirty
      || (flags & 32 satisfies ReactiveFlags.Pending && checkDirty(this.deps!, this))
    ) {
      if (updateComputed(this)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    } else if (flags & 32 satisfies ReactiveFlags.Pending) {
      this.flags = flags & ~(32 satisfies ReactiveFlags.Pending);
    }
    if (activeSub !== undefined) {
      link(this, activeSub);
    } else if (activeScope !== undefined) {
      link(this, activeScope);
    }
    return this.value!;
  }

  // add by me 可编辑的Computed， 根据vuejs的实现
  set(value: any) {
    // console.warn('Computed set . ');
    if (this.setter) {
      // 只有存在 setter 时才会有
      this.setter(value);
      this.notify();
    }
  }
  notify() {
    // console.warn('Computed notify . ');
    this.flags = 17 as ReactiveFlags.Mutable | ReactiveFlags.Dirty;
    const subs = this.subs;
    if (subs !== undefined) {
      propagate(subs);
      if (!batchDepth) {
        flush();
      }
    }
  }
}

export class Signal<T = unknown> implements ISignal<T> {
  previousValue: T | undefined;
  value: T | undefined;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;

  constructor(initialValue?: T) {
    if (arguments.length) { // 需要处理 参数是 null | undefined 的情景
      this.previousValue = initialValue;
      this.value = initialValue;
    }
    // this.subs = undefined;
    // this.subsTail = undefined;
    this.flags = 1 satisfies ReactiveFlags.Mutable;
  }

  get() {
    const value = this.value;
    if (this.flags & 16 satisfies ReactiveFlags.Dirty) {
      if (updateSignal(this, value)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    }
    if (activeSub !== undefined) {
      link(this, activeSub);
    }
    return value as T;
  }

  /**
   * 设置值
   * 如果值跟原来一样，不会触发更新
   * todo: 优化，如果值是对象或数组这种引用类型，内部值可能变了，却没有触发更新
   *    触发更新的规则如何设定？？？
   * @param value
   */
  set(value: T): void {
    // console.warn('signal set value is ', value);
    if (this.value !== value) {
      this.value = value
      this.flags = 17 as ReactiveFlags.Mutable | ReactiveFlags.Dirty;
      const subs = this.subs;
      if (subs !== undefined) {
        propagate(subs);
        if (!batchDepth) {
          flush();
        }
      }
    } else {
      if (isUndefined(value)) {
        // console.error('undefined same value, ', value);
      } else if (isString(value)) {
        // console.error('string same value, ', value);
      } else if (isNumber(value)) {
        // console.error('number same value, ', value);
      } else if (isNull(value)) {
        // console.error('object same value, ', value);
      }  else if (isBoolean(value)) {
        // console.error('boolean same value, ', value);
        // this.notify();
      } else if (isArray(value)) {
        // 数组的话，内部值可能变了，但是引用没变，所以触发更新
        // todo 是否需要深度比对 ？？？
        // console.error('array, same value, ', value);
        this.notify();
      } else if (isObject(value)) {
        this.value = value;
        // todo 是否需要深度比对 ？？？
        this.notify();
        if (value instanceof Element) {
          // 	nothing
        } else if (value instanceof Map) {
          // console.error('Map same value, ', value); // todo 无效 ？？？
        } else {
          // console.error('object same value, ', value);
        }
      } else {
        console.error('other type, same value, ', value, ' type is ', typeof value);
      }
    }
  }

  notify() {
    this.flags = 17 as ReactiveFlags.Mutable | ReactiveFlags.Dirty;
    const subs = this.subs;
    if (subs !== undefined) {
      propagate(subs);
      if (!batchDepth) {
        flush();
      }
    }
  }
}

function effectOper(this: IEffect | IEffectScope): void {
  let dep = this.deps;
  while (dep !== undefined) {
    dep = unlink(dep, this);
  }
  const sub = this.subs;
  if (sub !== undefined) {
    unlink(sub);
  }
  this.flags = 0 satisfies ReactiveFlags.None;
}

/**
 * alien-signals 中没有这个方法，难道是移除了？
 * Registers a dispose callback on the current active effect scope. The
 * callback will be invoked when the associated effect scope is stopped.
 *
 * @param fn - The callback function to attach to the scope's cleanup.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#onscopedispose}
 */
export function onScopeDispose(fn: () => void, failSilently = false): void {
  if (activeScope) {
    activeScope.cleanups?.push(fn);
  } else if (!failSilently) {
    console.warn(
      `onScopeDispose() is called when there is no active effect scope` +
      ` to be associated with.`
    );
  }
}
