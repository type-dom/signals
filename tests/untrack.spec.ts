import { expect, test } from 'vitest';
import { computed, effect, effectScope, setActiveSub, signal } from '../src';

test('should pause tracking in computed', () => {
  const src = signal(0);

  let computedTriggerTimes = 0;
  const c = computed(() => {
    computedTriggerTimes++;
    const currentSub = setActiveSub(undefined);
    const value = src.get();
    setActiveSub(currentSub);
    return value;
  });

  expect(c.get()).toBe(0);
  expect(computedTriggerTimes).toBe(1);

  src.set(1);
  src.set(2);
  src.set(3);
  expect(c.get()).toBe(0);
  expect(computedTriggerTimes).toBe(1);
});

test('should pause tracking in effect', () => {
  const src = signal(0);
  const is = signal(0);

  let effectTriggerTimes = 0;
  effect(() => {
    effectTriggerTimes++;
    if (is.get()) {
      const currentSub = setActiveSub(undefined);
      src.get();
      setActiveSub(currentSub);
    }
  });

  expect(effectTriggerTimes).toBe(1);

  is.set(1);
  expect(effectTriggerTimes).toBe(2);

  src.set(1);
  src.set(2)
  src.set(3);
  expect(effectTriggerTimes).toBe(2);

  is.set(2);
  expect(effectTriggerTimes).toBe(3);

  src.set(4);
  src.set(5);
  src.set(6);
  expect(effectTriggerTimes).toBe(3);

  is.set(0);
  expect(effectTriggerTimes).toBe(4);

  src.set(7);
  src.set(8);
  src.set(9);
  expect(effectTriggerTimes).toBe(4);
});

test('should pause tracking in effect scope', () => {
  const src = signal(0);

  let effectTriggerTimes = 0;
  effectScope(() => {
    effect(() => {
      effectTriggerTimes++;
      const currentSub = setActiveSub(undefined);
      src.get();
      setActiveSub(currentSub);
    });
  });

  expect(effectTriggerTimes).toBe(1);

  src.set(1);
  src.set(2);
  src.set(3);
  expect(effectTriggerTimes).toBe(1);
});
