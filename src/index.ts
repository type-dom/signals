export * from './system.js';

import { createReactiveSystem, type Link, ReactiveFlags, type ReactiveNode } from './system.js';

const isArray = Array.isArray;

/**
 * Quick object check - this is primarily used to tell
 * objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
const isObject = (val: unknown): val is object => val !== null && val !== undefined && typeof val === 'object';

// interface IEffectScope extends ReactiveNode {
//   cleanups?: (() => void)[];
// }

export interface EffectNode extends ReactiveNode {
  fn(): void;
}

export interface ComputedNode<T = any, S = T> extends ReactiveNode {
  value: T | undefined;
  getter: (previousValue?: S) => T;
  setter?: (newValue: S) => void;
}

interface SignalNode<T = any> extends ReactiveNode {
  currentValue?: T;
  pendingValue?: T;
}

let cycle = 0;
let batchDepth = 0;
let notifyIndex = 0;
let queuedLength = 0;
let activeSub: ReactiveNode | undefined;

const queued: (EffectNode | undefined)[] = [];
const {
  link,
  unlink,
  propagate,
  checkDirty,
  shallowPropagate,
} = createReactiveSystem({
  update(node: SignalNode | ComputedNode): boolean {
    // console.warn('update signal is ', signal);
    if (node.depsTail !== undefined) {
      return updateComputed(node as ComputedNode);
    } else {
      return updateSignal(node as SignalNode);
    }
  },
  notify(effect: EffectNode) {
    let insertIndex = queuedLength;
    let firstInsertedIndex = insertIndex;

    do {
      queued[insertIndex++] = effect;
      effect.flags &= ~ReactiveFlags.Watching;
      effect = effect.subs?.sub as EffectNode;
      if (effect === undefined || !(effect.flags & ReactiveFlags.Watching)) {
        break;
      }
      // eslint-disable-next-line no-constant-condition
    } while (true);

    queuedLength = insertIndex;

    while (firstInsertedIndex < --insertIndex) {
      const left = queued[firstInsertedIndex];
      queued[firstInsertedIndex++] = queued[insertIndex];
      queued[insertIndex] = left;
    }
  },
  unwatched(node) {
    if (!(node.flags & ReactiveFlags.Mutable)) {
      effectScopeOper.call(node);
    } else if (node.depsTail !== undefined) {
      node.depsTail = undefined;
      node.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
      purgeDeps(node);
    }
  },
});

export function getActiveSub(): ReactiveNode | undefined {
  return activeSub;
}

export function setActiveSub(sub: ReactiveNode |  undefined =  undefined) {
  const prevSub = activeSub;
  activeSub = sub;
  return prevSub;
}

export function getBatchDepth(): number {
  return batchDepth;
}

export function startBatch() {
  ++batchDepth;
}

export function endBatch() {
  if (!--batchDepth) {
    flush();
  }
}

export function getCurrentScope(): ReactiveNode | undefined {
  return activeSub;
}

export function setCurrentScope(scope: ReactiveNode | undefined) {
  const prevScope = activeSub;
  activeSub = scope;
  return prevScope;
}

export function isSignal(fn: unknown): boolean {
  return fn instanceof Signal;
}

export function isComputed(fn: unknown): boolean {
  return fn instanceof Computed;
}

export function isEffect(fn: () => void): boolean {
  return fn.name === 'bound effectOper';
}

export function isEffectScope(fn: () => void): boolean {
  return fn.name === 'bound effectScopeOper';
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
  const e: EffectNode = {
    fn,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: ReactiveFlags.Watching | ReactiveFlags.RecursedCheck,
  };
  const prevSub = setActiveSub(e);
  if (prevSub !== undefined) {
    link(e, prevSub, 0);
  }
  try {
    e.fn();
  } finally {
    activeSub = prevSub;
    e.flags &= ~ReactiveFlags.RecursedCheck;
  }
  return effectOper.bind(e);
}

export function effectScope(fn: () => void): () => void {
  const e: ReactiveNode = {
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    flags: ReactiveFlags.None,
  };
  const prevSub = setActiveSub(e);
  if (prevSub !== undefined) {
    link(e, prevSub, 0);
  }
  try {
    fn();
  } finally {
    activeSub = prevSub;
  }
  return effectScopeOper.bind(e);
}

export function trigger(fn: Signal | Computed<any> | (() => void)) {
  const sub: ReactiveNode = {
    deps: undefined,
    depsTail: undefined,
    flags: ReactiveFlags.Watching,
  };
  const prevSub = setActiveSub(sub);
  try {
    if (fn instanceof Signal || fn instanceof Computed) {
      fn.get();
    } else {
      fn();
    }
  } finally {
    activeSub = prevSub;
    let link = sub.deps;
    while (link !== undefined) {
      const dep = link.dep;
      link = unlink(link, sub);
      const subs = dep.subs;
      if (subs !== undefined) {
        sub.flags = ReactiveFlags.None;
        propagate(subs);
        shallowPropagate(subs);
      }
    }
    if (!batchDepth) {
      flush();
    }
  }
}

function updateComputed(c: ComputedNode): boolean {
  // console.warn('update computed is ', c);
  ++cycle;
  c.depsTail = undefined;
  c.flags = ReactiveFlags.Mutable | ReactiveFlags.RecursedCheck;
  const prevSub = setActiveSub(c);
  try {
    const oldValue = c.value;
    // const value = c.value; // todo ？？？ 路由页面无法加载
    if (isObject(oldValue)) { //注： 不能删除，否则 数组对象等notify失效
      // if (oldValue instanceof Element) { // node 环境会报错
      //   // 	nothing
      // } else if (oldValue instanceof Map) {
      //   // console.error('Map same value, ', oldValue); // todo 无效 ？？？
      // } else {
      //   // console.error('object same value, ', value);
      // }
      c.value = c.getter(oldValue);
      return true;
    }
    return oldValue !== (c.value = c.getter(oldValue));
  } finally {
    activeSub = prevSub;
    c.flags &= ~ReactiveFlags.RecursedCheck;
    purgeDeps(c);
  }
}
// todo  Map, Object
function updateSignal(s: SignalNode): boolean {
  // console.warn('updateSignal is ', s);
  s.flags = ReactiveFlags.Mutable;
  if (isObject(s.pendingValue)) {
    if (typeof Element !== 'undefined' && s.pendingValue instanceof Element) {
      //  nothing
    } else if (s.pendingValue instanceof Map) {
      // console.error('Map same value, ', value); // todo 无效 ？？？
    } else {
      // console.error('object same value, ', value);
    }
    s.currentValue = s.pendingValue
    return true;
  }
  return s.currentValue !== (s.currentValue = s.pendingValue);
}

function run(e: EffectNode): void {
  const flags = e.flags;
  if (
    flags & ReactiveFlags.Dirty
    || (
      flags & ReactiveFlags.Pending
      && checkDirty(e.deps!, e)
    )
  ) {
    ++cycle;
    e.depsTail = undefined;
    e.flags = ReactiveFlags.Watching | ReactiveFlags.RecursedCheck;
    const prevSub = setActiveSub(e);
    try {
      (e as EffectNode).fn();
    } finally {
      activeSub = prevSub;
      e.flags &= ~ReactiveFlags.RecursedCheck;
      purgeDeps(e);
    }
  } else {
    e.flags = ReactiveFlags.Watching;
  }
}

function flush(): void {
  try {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex]!;
      queued[notifyIndex++] = undefined;
      run(effect);
    }
  } finally {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex]!;
      queued[notifyIndex++] = undefined;
      effect.flags |= ReactiveFlags.Watching | ReactiveFlags.Recursed;
    }
    notifyIndex = 0;
    queuedLength = 0;
  }
}

export class Computed<T> implements ComputedNode<T> {
  value: T | undefined;

  // ReactiveNode
  subs?: Link;
  subsTail?: Link;
  deps?: Link;
  depsTail?: Link;
  flags: ReactiveFlags;

  getter: (previousValue?: any) => T;
  setter?: (newValue: any) => void; // add by me
  constructor(
    getter: (cachedValue?: any) => T,
    setter?: (newValue: any) => void
  ) {
    this.flags =  0 as ReactiveFlags.None;
    this.getter = getter;
    if (setter) {
      this.setter = setter;
    }
  }

  get() {
    // console.error('Computed get . ');
    const flags = this.flags;
    if (
      flags & ReactiveFlags.Dirty
      || (
        flags & ReactiveFlags.Pending
        && (
          checkDirty(this.deps!, this)
          || (this.flags = flags & ~ReactiveFlags.Pending, false)
        )
      )
    ) {
      if (updateComputed(this)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    } else if (!flags) {
      this.flags = ReactiveFlags.Mutable| ReactiveFlags.RecursedCheck;
      const prevSub = setActiveSub(this);
      try {
        this.value = this.getter();
      } finally {
        activeSub = prevSub;
        this.flags &= ~ReactiveFlags.RecursedCheck;
      }
    }
    const sub = activeSub;
    if (sub !== undefined) {
      link(this, sub, cycle);
    }
    return this.value as T;
  }

  // add by me 可编辑的Computed， 根据vuejs的实现
  set(value: any) {
    // console.warn('Computed set . ');
    if (this.setter) {
      // 只有存在 setter 时才会有
      this.setter(value);
      trigger(this);
    }
  }
}

export class Signal<T = unknown> implements SignalNode<T> {
  pendingValue: T | undefined;
  currentValue: T | undefined;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;

  constructor(initialValue?: T) {
    if (arguments.length) { // 需要处理 参数是 null | undefined 的情景
      this.pendingValue = initialValue;
      this.currentValue = initialValue;
    }
    // this.subs = undefined;
    // this.subsTail = undefined;
    this.flags = ReactiveFlags.Mutable;
  }

  get() {
    if (this.flags & ReactiveFlags.Dirty) {
      if (updateSignal(this)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    }
    let sub = activeSub;
    while (sub !== undefined) {
      if (sub.flags & (ReactiveFlags.Mutable | ReactiveFlags.Watching)) {
        link(this, sub, cycle);
        break;
      }
      sub = sub.subs?.sub;
    }
    return this.currentValue as T;
  }

  /**
   * 设置值
   * 如果值跟原来一样，不会触发更新
   * todo: 优化，如果值是对象或数组这种引用类型，内部值可能变了，却没有触发更新
   *    触发更新的规则如何设定？？？
   *    trigger 函数
   * @param value
   */
  set(value: T): void {
    // console.warn('signal set value is ', value);
    if (this.pendingValue !== (this.pendingValue = value)) {
      this.flags = 17 as ReactiveFlags.Mutable | ReactiveFlags.Dirty;
      const subs = this.subs;
      if (subs !== undefined) {
        propagate(subs);
        // 如果当前正在执行 effect（即 activeSub 存在且为 Watching），立即同步 currentValue
        // if (activeSub && (activeSub.flags & ReactiveFlags.Watching)) { // add by me follow to watch.test
        //   if (this.flags & ReactiveFlags.Dirty) {
        //     updateSignal(this);
        //   }
        // }
        // // 如果在 flush 过程中更新信号，立即同步 currentValue 以确保一致性
        // error toggle menus show previous menu item
        // if (notifyIndex > 0 && queuedLength > 0) { // add by me follow to watch.test
        //   if (this.flags & ReactiveFlags.Dirty) {
        //     updateSignal(this);
        //   }
        // }
        if (!batchDepth) {
          flush();
        }
      }
    } else {
      if (typeof value === 'undefined') {
        // console.error('undefined same value, ', value);
      } else if (typeof value === 'string') {
        // console.error('string same value, ', value);
      } else if (typeof value === 'number') {
        // console.error('number same value, ', value);
      } else if (value === null) {
        // console.error('object same value, ', value);
      }  else if (typeof value === 'boolean') {
        // console.error('boolean same value, ', value);
        // trigger(this);
      } else if (isArray(value)) {
        // 数组的话，内部值可能变了，但是引用没变，所以触发更新
        // todo 是否需要深度比对 ？？？
        // console.error('array, same value, ', value);
        this.pendingValue = value;
        trigger(this);
      } else if (isObject(value)) {
        this.pendingValue = value;
        // todo 是否需要深度比对 ？？？
        trigger(this);
        // if (value instanceof Element) {
        //   // 	nothing
        // } else if (value instanceof Map) {
        //   // console.error('Map same value, ', value); // todo 无效 ？？？
        // } else {
        //   // console.error('object same value, ', value);
        // }
      } else {
        console.error('other type, same value, ', value, ' type is ', typeof value);
      }
    }
  }
}

function effectOper(this: EffectNode): void {
  effectScopeOper.call(this);
}

function effectScopeOper(this: ReactiveNode): void {
  this.depsTail = undefined;
  this.flags = ReactiveFlags.None;
  purgeDeps(this);
  const sub = this.subs;
  if (sub !== undefined) {
    unlink(sub);
  }
}

function purgeDeps(sub: ReactiveNode) {
  const depsTail = sub.depsTail;
  let dep = depsTail !== undefined ? depsTail.nextDep : sub.deps;
  while (dep !== undefined) {
    dep = unlink(dep, sub);
  }
}
