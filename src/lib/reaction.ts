import { isEqual } from 'lodash-es';
import { computed, effect, setCurrentSub } from '../index';
import { WatchCallback } from './watch';

// export type WatchStopHandle = () => void;

export interface WatchOptions<T = unknown, F extends boolean = boolean> {
  immediate?: F;
  equals?: F extends true
    ? (a: T, b: T | undefined) => boolean
    : (a: T, b: T) => boolean;   // relate deep
  onError?: (error: unknown) => void;
  scheduler?: (fn: () => void) => void;
  once?: boolean;
  deep?: boolean; // add by me
  flush?: 'pre' | 'post' | 'sync'; // post = after DOM update  scheduler
}

export function reaction<T>(
  dataFn: () => T | undefined,
  effectFn: WatchCallback<T>,
  options: WatchOptions = {}
): () => void {
  const {
    // scheduler = (fn) => fn(),
    // Object.is 是一个更严格的比较方法，适合需要精确判断值是否完全相等的场景。
    // equals = Object.is,
    onError,
    once = false,
    immediate = false,
  } = options;

  let prevValue: T | undefined;
  let version = 0;

  const tracked = computed(() => {
    try {
      return dataFn();
    } catch (error) {
      untracked(() => onError?.(error));
      return prevValue!;
    }
  });

  const dispose = effect(() => {
    // console.warn('watch effect . ');
    const current = tracked.get();
    if (!immediate && version === 0) {
      prevValue = current;
    }
    version++;
    // console.error('watch current  preValue is ', current, prevValue);
    // todo 下面的判断会导致 useVShow 显示不正确
    if (isEqual(current, prevValue!)) {
      // if (equals(current, prevValue)) {
      //   console.warn('current equals prevValue');
      // }
      return;
    }
    const oldValue = prevValue;
    prevValue = current;
    let scheduler: (fn: () => void) => void;
    if (options.scheduler) {
      scheduler = options.scheduler;
    } else if (options.flush === 'post') {
      scheduler = queueMicrotask;
    } else {
      scheduler = (fn) => fn();
    }
    untracked(() =>
      scheduler(() => {
        // if ((current === false || current === true) && oldValue === undefined) {
        //   console.warn('watch effect scheduler . ');
        //   console.warn(
        //     'watch effect scheduler . current, oldValue',
        //     current,
        //     oldValue
        //   );
        // }
        try {
          effectFn(current!, oldValue);
        } catch (error) {
          onError?.(error);
        } finally {
          if (once) {
            if (immediate && version > 1) dispose();
            else if (!immediate && version > 0) dispose();
          }
        }
      })
    );
  });

  return dispose;
}

export function untracked<T>(callback: () => T): T {
  const currentSub = setCurrentSub(undefined);
  try {
    return callback();
  } finally {
    setCurrentSub(currentSub);
  }
}
