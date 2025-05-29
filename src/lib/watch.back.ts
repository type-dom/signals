import { isEqual, isFunction, isObject } from 'lodash-es';
import { AnyFn } from '@type-dom/utils';

import { effect, effectScope, endBatch, startBatch } from '../index';
import { Ref, isRef, toRaw } from './ref';

export type OnCleanup = (cleanupFn: () => void) => void
export type WatchSource<T = any> = (() => T | undefined) | Ref<T>;
export type WatchCallback<V = any, OV = any> = (value: V, oldValue?: OV, onCleanup?: OnCleanup) => void;
export type WatchStopHandle = () => void;

export interface WatchOptions {
  immediate?: boolean;
  onError?: (error: unknown) => void;
  scheduler?: (fn: () => void) => void;
  deep?: boolean | number;
  once?: boolean;
  flush?: 'pre' | 'post' | 'sync'; // post = after DOM update
}

// const INITIAL_WATCHER_VALUE = {};
export function watchO<T>(
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
  // let isFirstRun = true;
  const cleanupFns: (() => void)[] = [];

  if (isRef(source)) {
    getter = () => source.get() as T;
  } else if (isFunction(source)) {
    getter = source;
  } else {
    throw new Error('Invalid watch source');
  }

  if (options.once && cb) {
    const _cb = cb
    cb = (...args) => {
      _cb(...args)
      stop()
    }
  }

  const job = () => {
    // console.warn('watch job . ');
    startBatch();
    // untracked(() => {
    newValue = getter();
    if (newValue instanceof Map) {
      // console.warn('newValue is Map ', newValue);
    }
    // 深度比较对象
    if (options.deep && isObject(newValue) && isObject(oldValue)) {
      newValue = toRaw(newValue);
      oldValue = toRaw(oldValue);
    }

    // 初次运行或当值变化时触发回调
    if (
      (oldValue === undefined && options.immediate) ||
      !isEqual(oldValue, newValue)
    ) {
      const valueToPass = options.deep
        ? JSON.parse(JSON.stringify(newValue))
        : newValue;
      cb(
        valueToPass,
        oldValue === undefined
          ? undefined
          : options.deep
          ? JSON.parse(JSON.stringify(oldValue))
          : oldValue
      );
      oldValue = newValue;
    }
    // })

    isScheduled = false;
    endBatch();
  };

  const scheduler: (run: () => void) => unknown = (run: () => void) => {
    if (isScheduled) return;
    isScheduled = true;
    // console.warn('scheduler . run .... ');
    if (options.flush === 'post') {
      queuePostRenderEffect(() => {
        console.warn('microtask . ');
        run();
      });
    } else if (options.flush === 'pre') {
      requestAnimationFrame(run);
    } else {
      run();
    }
  };

  const scopeStop = effectScope(() => {
    effect(() => {
      // console.warn('watch effect . ');
      // getter(); // 仅用于依赖收集
      // if (isFirstRun) {
      //   isFirstRun = false;
      //   oldValue = getter();
      //   // oldValue = options.deep ? deepClone(getter()) : getter();
      //   // 如果设置了 immediate，在第一次运行前手动调用一次
      //   // if (options.immediate) scheduler(job);
      // } else {
      // untracked(() => {
        scheduler(job);
      // });
      // }
    });
  });

  // 如果设置了 immediate，在第一次运行前手动调用一次
  if (options.immediate) {
    startBatch();
    scheduler(job);
    endBatch();
  } else {
    oldValue = getter();
  }
  const stop = () => {
    scopeStop();
    cleanupFns.forEach((fn) => fn());
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
