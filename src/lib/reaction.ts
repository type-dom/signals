import { effect } from '../effect';
import { computed } from '../computed';
import { pauseTracking, resumeTracking } from '../untrack';

export type WatchCallback<T> = (newValue: T, oldValue?: T) => void;
export type WatchStopHandle = () => void;

export interface WatchOptions<T = unknown, F extends boolean = boolean> {
  immediate?: F;
  equals?: F extends true
    ? (a: T, b: T | undefined) => boolean
    : (a: T, b: T) => boolean;
  onError?: (error: unknown) => void;
  scheduler?: (fn: () => void) => void;
  once?: boolean;
  deep?: boolean; // add by me
  flush?: 'pre' | 'post' | 'sync'; // post = after DOM update
}

export function reaction<T>(
  dataFn: () => T,
  effectFn: WatchCallback<T>,
  options: WatchOptions<T> = {}
): () => void {
  const {
    // scheduler = (fn) => fn(),
    // Object.is 是一个更严格的比较方法，适合需要精确判断值是否完全相等的场景。
    equals = Object.is,
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
    const current = tracked.get();
    if (!immediate && version === 0) {
      prevValue = current;
    }
    version++;
    // console.error('watch current  preValue is ', current, prevValue);
    if (equals(current!, prevValue!)) return;
    const oldValue = prevValue;
    prevValue = current;
    let scheduler: (fn: () => void) => void;
    if (options.flush === 'post') {
      scheduler = queueMicrotask;
    } else {
      scheduler = (fn) => fn();
    }
    untracked(() =>
      scheduler(() => {
        if ((current === false || current === true)&& oldValue === undefined) {
          console.warn('watch effect scheduler . ');
          console.warn('watch effect scheduler . current, oldValue', current, oldValue);
        }
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

function untracked<T>(callback: () => T): T {
  try {
    pauseTracking();
    return callback();
  } finally {
    resumeTracking();
  }
}
