import { isEqual } from 'lodash';
import { AnyFn, isFunction, isObject } from '@type-dom/utils';
import { effect } from '../effect';
import { Ref, isRef, toRaw } from './ref';
// import { pauseTracking, resumeTracking } from '../untrack';

export type WatchSource<T> = (() => T | undefined) | Ref<T | undefined>;
export type WatchCallback<T> = (newValue: T, oldValue?: T) => void;
export type WatchStopHandle = () => void;

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
  flush?: 'pre' | 'post' | 'sync'; // post = after DOM update
}

export function watch<T>(
  source: WatchSource<T> | undefined,
  cb: WatchCallback<T>,
  options: WatchOptions = {}
): WatchStopHandle | undefined {
  if (!source) {
    return;
  }
  let getter: () => T | undefined;
  let oldValue: T | undefined;
  let newValue: T | undefined;
  let isScheduled = false;
  let isFirstRun = true;
  const cleanupFns: (() => void)[] = [];

  if (isFunction(source)) {
    getter = source;
  } else if (isRef(source)) {
    getter = () => source.get() as T;
  } else {
    throw new Error('Invalid watch source');
  }

  const job = () => {
    // untracked(() => {
      newValue = getter();
      if (newValue instanceof Map) {
        console.warn('newValue is ', newValue);
      }
      // 深度比较对象
      if (options.deep && isObject(newValue) && isObject(oldValue)) {
        newValue = toRaw(newValue);
        oldValue = toRaw(oldValue);
      }

      // 初次运行或当值变化时触发回调
      if (oldValue === undefined && options.immediate || !isEqual(oldValue, newValue)) {
        const valueToPass = options.deep ? JSON.parse(JSON.stringify(newValue)) : newValue;
        cb(valueToPass, oldValue === undefined ? undefined : options.deep ? JSON.parse(JSON.stringify(oldValue)) : oldValue);
        oldValue = newValue;
      }
    // })

    isScheduled = false;
  };

  const scheduler: (run: () => void) => unknown = (run: () => void) => {
    if (isScheduled) return;
    isScheduled = true;
    if (options.flush === 'post') {
      queuePostRenderEffect(run);
    } else if (options.flush === 'pre') {
      requestAnimationFrame(run);
    } else {
      run();
    }
  };

  const stopEffect = effect(() => {
    // getter(); // 仅用于依赖收集
    // if (isFirstRun) {
    //   isFirstRun = false;
    //   oldValue = getter();
    //   // oldValue = options.deep ? deepClone(getter()) : getter();
    //   // 如果设置了 immediate，在第一次运行前手动调用一次
    //   // if (options.immediate) scheduler(job);
    // } else {
      scheduler(job);
    // }
  })
  // 如果设置了 immediate，在第一次运行前手动调用一次
  if (options.immediate) {
    scheduler(job);
  } else {
    oldValue = getter();
  }
  const stop = () => {
    stopEffect();
    cleanupFns.forEach(fn => fn());
    cleanupFns.length = 0;
  };

  return stop;
}

function queuePostRenderEffect(fn: AnyFn) {
  // 这里应该有一个实际的渲染队列管理器
  // 为了简化，我们直接使用微任务队列
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    Promise.resolve().then(fn);
  }
}

