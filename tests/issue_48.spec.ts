import { test } from 'vitest';
import { computed, effect, setActiveSub, signal } from '../src';

test('#48', () => {
  const source = signal(0);
  let disposeInner: () => void;

  reaction(
    () => source.get(),
    (val) => {
      if (val === 1) {
        disposeInner = reaction(
          () => source.get(),
          () => { }
        );
      } else if (val === 2) {
        disposeInner!();
      }
    }
  );

  source.set(1);
  source.set(2);
  source.set(3);
});

interface ReactionOptions<T = unknown, F extends boolean = boolean> {
  fireImmediately?: F;
  equals?: F extends true
    ? (a: T, b: T | undefined) => boolean
    : (a: T, b: T) => boolean;
  onError?: (error: unknown) => void;
  scheduler?: (fn: () => void) => void;
  once?: boolean;
}

function reaction<T>(
  dataFn: () => T,
  effectFn: (newValue: T, oldValue: T | undefined) => void,
  options: ReactionOptions<T> = {}
): () => void {
  const {
    scheduler = (fn) => fn(),
    equals = Object.is,
    onError,
    once = false,
    fireImmediately = false,
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
    // first evaluation: if not fireImmediately, just record the current value and skip
    if (version === 0) {
      if (!fireImmediately) {
        prevValue = current;
        version++;
        return;
      }
      // if fireImmediately is true, fall through to trigger effect with prevValue possibly undefined
    }

    version++;

    // if values are equal (using provided equals), no need to trigger the effect
    if (equals(current, prevValue as any)) return;

    const oldValue = prevValue;

    untracked(() =>
      scheduler(() => {
        try {
          effectFn(current, oldValue);
        } catch (error) {
          onError?.(error);
        } finally {
          // After the scheduled effect runs, re-evaluate the tracked value (untracked)
          // so that synchronous updates performed by the effect are reflected in prevValue.
          try {
            prevValue = untracked(() => tracked.get());
          } catch (e) {
            // ignore
          }
          if (once) {
            // dispose after the callback has run once
            dispose();
          }
        }
      })
    );
  });

  return dispose;
}

function untracked<T>(callback: () => T): T {
  const currentSub = setActiveSub();
  try {
    return callback();
  } finally {
    setActiveSub(currentSub);
  }
}

test('watch with immediate reset and sync flush', () => {
  const value = signal(false)

  reaction(() => value.get(), () => {
    value.set(false)
  })

  value.set(true)
  expect(value.get()).toBe(false)
  value.set(true)
  expect(value.get()).toBe(false) // error true , should be false
})
