import { isEqual } from 'lodash';
import { AnyFn, isFunction, isObject } from '@type-dom/utils';
import { effect } from '../effect';
import { Signal } from '../signal';
import { Computed } from '../computed';
import { isRef, Ref, toRaw } from './ref';

// export function watch<T>(getter: () => T, callback: (newValue: T, oldValue?: T) => void, options?: IWatchOptions): Effect<void> {
//   let oldValue: T = getter();
//   // console.warn('watch, oldValue: ', oldValue);
//   return effect(() => {
//     const newValue = getter();
//     // console.warn('watch, newValue: ', newValue);
//     if (options?.immediate) {
//       callback(newValue, oldValue);
//       oldValue = newValue;
//     } else if (newValue !== oldValue) {
//       callback(newValue, oldValue);
//       oldValue = newValue;
//     } else if (isRef(newValue)) {
//       if (unref(newValue) !== unref(oldValue)) {
//         callback(newValue, oldValue);
//         oldValue = newValue;
//       } else {
//         if (typeof unref(newValue) === 'object') {
//           callback(newValue);
//         }
//       }
//     } else if (isArray(newValue)) {
//       callback(newValue);
//     }
//   });
// }

export type WatchSource<T> = (() => T) | Ref<T>;
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
  let getter: () => T;
  let oldValue: T | undefined;
  let newValue: T | undefined;
  // let cleanup: (() => void) | null = null;

  if (isFunction(source)) {
    getter = source;
  } else if (isRef(source)) {
    getter = () => source.get() as T;
  } else {
    throw new Error('Invalid watch source');
  }

  const job = () => {
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
  };

  const scheduler = (run: () => void) => {
    // if (cleanup) {
    //   cleanup();
    // }
    // cleanup = options.onInvalidate?.(() => {
    //   cleanup = null;
    // });

    if (options.flush === 'post') {
      queuePostRenderEffect(run);
    } else if (options.flush === 'sync') {
      run();
    } else {
      queueMicrotask(run);
    }
  };

  const stop = effect(job);
  // const stop = effect(() => {
  //   if (options.flush === 'post') {
  //     queuePostRenderEffect(effect(job));
  //   } else if (options.flush === 'sync') {
  //     job();
  //   } else {
  //     queueMicrotask(effect(job));
  //   }
  // })
  // const runner = effect(job, {
  //   lazy: true,
  //   onTrack() {},
  //   onTrigger() {},
  //   scheduler
  // });

  // 如果设置了 immediate，在第一次运行前手动调用一次
  if (options.immediate) {
    job();
  } else {
    oldValue = getter();
  }
  return stop;
}

function queuePostRenderEffect(fn: AnyFn) {
  // 这里应该有一个实际的渲染队列管理器
  // 为了简化，我们直接使用微任务队列
  queueMicrotask(fn);
}
