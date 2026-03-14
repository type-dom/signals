import { describe, expect, it } from 'vitest';
import { computed, effect, signal, trigger, startBatch, endBatch } from '../src';

describe('trigger 基础功能', () => {
  it('should not throw when triggering with no dependencies', () => {
    expect(() => trigger(() => {})).not.toThrow();
  });

  it('should trigger single signal', () => {
    const count = signal(0);
    let executions = 0;

    effect(() => {
      executions++;
      count.get();
    });

    expect(executions).toBe(1);
    trigger(count);
    expect(executions).toBe(2);
  });

  it('should accept signal instance directly', () => {
    const value = signal(0);
    let calls = 0;

    effect(() => {
      calls++;
      value.get();
    });

    expect(calls).toBe(1);
    trigger(value);
    expect(calls).toBe(2);
  });

  it('should accept function', () => {
    const a = signal(0);
    const b = signal(0);
    let calls = 0;

    effect(() => {
      calls++;
      a.get();
      b.get();
    });

    expect(calls).toBe(1);

    trigger(() => {
      a.get();
      b.get();
    });

    expect(calls).toBe(2);
  });

  it('should trigger with signal getter', () => {
    const value = signal(0);
    const doubled = computed(() => value.get() * 2);

    expect(doubled.get()).toBe(0);
    trigger(value);
    expect(doubled.get()).toBe(0);  // 值没变，但会重新计算
  });
});

describe('trigger 引用类型 - Array', () => {
  it('should trigger array mutation', () => {
    const arr = signal<number[]>([]);
    const length = computed(() => arr.get().length);

    expect(length.get()).toBe(0);
    arr.get().push(1);
    trigger(arr);
    expect(length.get()).toBe(1);
  });

  it('should trigger multiple array mutations', () => {
    const arr = signal<number[]>([1, 2, 3]);
    const sum = computed(() => arr.get().reduce((a, b) => a + b, 0));

    expect(sum.get()).toBe(6);
    arr.get().push(4, 5);
    trigger(arr);
    expect(sum.get()).toBe(15);
  });

  it('should trigger array pop', () => {
    const arr = signal<number[]>([1, 2, 3]);
    const last = computed(() => arr.get()[arr.get().length - 1]);

    expect(last.get()).toBe(3);
    arr.get().pop();
    trigger(arr);
    expect(last.get()).toBe(2);
  });

  it('should trigger array shift', () => {
    const arr = signal<number[]>([1, 2, 3]);
    const first = computed(() => arr.get()[0]);

    expect(first.get()).toBe(1);
    arr.get().shift();
    trigger(arr);
    expect(first.get()).toBe(2);
  });

  it('should trigger array splice', () => {
    const arr = signal<number[]>([1, 2, 3, 4, 5]);
    const length = computed(() => arr.get().length);

    expect(length.get()).toBe(5);
    arr.get().splice(2, 2);
    trigger(arr);
    expect(length.get()).toBe(3);
  });

  it('should trigger array sort', () => {
    const arr = signal<number[]>([3, 1, 2]);
    const sorted = computed(() => [...arr.get()].sort((a, b) => a - b));

    expect(sorted.get()).toEqual([1, 2, 3]);
    arr.get().reverse();
    trigger(arr);
    expect(sorted.get()).toEqual([1, 2, 3]);  // 排序结果不变
  });
});

describe('trigger 引用类型 - Object', () => {
  it('should trigger object property change', () => {
    const user = signal({ name: 'John', age: 30 });
    const name = computed(() => user.get().name);

    expect(name.get()).toBe('John');
    user.get().name = 'Jane';
    trigger(user);
    expect(name.get()).toBe('Jane');
  });

  it('should trigger nested object change', () => {
    const data = signal({ user: { name: 'John' } });
    const userName = computed(() => data.get().user.name);

    expect(userName.get()).toBe('John');
    data.get().user.name = 'Jane';
    trigger(data);
    expect(userName.get()).toBe('Jane');
  });

  it('should trigger object delete property', () => {
    const obj = signal<{ a?: number; b?: number }>({ a: 1, b: 2 });
    const hasA = computed(() => 'a' in obj.get());

    expect(hasA.get()).toBe(true);
    delete obj.get().a;
    trigger(obj);
    expect(hasA.get()).toBe(false);
  });

  it('should trigger object with multiple properties', () => {
    const state = signal({ x: 0, y: 0, z: 0 });
    const magnitude = computed(() => {
      const { x, y, z } = state.get();
      return Math.sqrt(x * x + y * y + z * z);
    });

    expect(magnitude.get()).toBe(0);
    state.get().x = 3;
    state.get().y = 4;
    trigger(state);
    expect(magnitude.get()).toBe(5);
  });
});

describe('trigger 引用类型 - Map/Set', () => {
  it('should trigger Map mutation', () => {
    const map = signal(new Map<string, number>());
    const size = computed(() => map.get().size);

    expect(size.get()).toBe(0);
    map.get().set('key', 1);
    trigger(map);
    expect(size.get()).toBe(1);
  });

  it('should trigger Map delete', () => {
    const map = signal(new Map<string, number>([['key', 1]]));
    const hasKey = computed(() => map.get().has('key'));

    expect(hasKey.get()).toBe(true);
    map.get().delete('key');
    trigger(map);
    expect(hasKey.get()).toBe(false);
  });

  it('should trigger Map clear', () => {
    const map = signal(new Map<string, number>([['a', 1], ['b', 2]]));
    const size = computed(() => map.get().size);

    expect(size.get()).toBe(2);
    map.get().clear();
    trigger(map);
    expect(size.get()).toBe(0);
  });

  it('should trigger Set mutation', () => {
    const set = signal(new Set<number>());
    const hasOne = computed(() => set.get().has(1));

    expect(hasOne.get()).toBe(false);
    set.get().add(1);
    trigger(set);
    expect(hasOne.get()).toBe(true);
  });

  it('should trigger Set delete', () => {
    const set = signal(new Set<number>([1, 2, 3]));
    const size = computed(() => set.get().size);

    expect(size.get()).toBe(3);
    set.get().delete(2);
    trigger(set);
    expect(size.get()).toBe(2);
  });
});

describe('trigger 复杂场景', () => {
  it('should trigger multiple signals at once', () => {
    const a = signal([1, 2, 3]);
    const b = signal([4, 5, 6]);
    const total = computed(() => a.get().length + b.get().length);

    expect(total.get()).toBe(6);

    trigger(() => {
      a.get().push(7);
      b.get().push(8);
    });

    expect(total.get()).toBe(8);
  });

  it('should trigger nested computed', () => {
    const src = signal({ value: 0 });
    const step1 = computed(() => src.get().value);
    const step2 = computed(() => step1.get() * 2);
    const step3 = computed(() => step2.get() + 10);

    expect(step3.get()).toBe(10);

    src.get().value = 5;
    trigger(src);

    expect(step3.get()).toBe(20);  // (5 * 2) + 10
  });

  it('should trigger effect chain', () => {
    const data = signal({ items: [] as number[] });
    let effectCalls = 0;

    effect(() => {
      effectCalls++;
      data.get().items.length;
    });

    expect(effectCalls).toBe(1);

    data.get().items.push(1);
    trigger(data);

    expect(effectCalls).toBe(2);
  });

  it('should handle circular dependencies', () => {
    const a = signal<{ ref?: any }>({});
    const b = signal<{ ref?: any }>({});

    let calls = 0;
    effect(() => {
      calls++;
      a.get().ref?.();
      b.get().ref?.();
    });

    expect(calls).toBe(1);

    trigger(() => {
      a.get().ref = () => {};
      b.get().ref = () => {};
    });

    expect(calls).toBe(2);
  });

  it('should work with computed that has setter', () => {
    const value = signal(10);
    const doubled = computed(
      () => value.get() * 2,
      (newValue: number) => value.set(newValue / 2)
    );

    expect(doubled.get()).toBe(20);
    doubled.set(30);
    expect(value.get()).toBe(15);

    // Trigger should still work
    trigger(value);
    expect(doubled.get()).toBe(30);
  });
});

describe('trigger 边界条件', () => {
  it('should work inside batch', () => {
    const arr = signal<number[]>([]);
    const length = computed(() => arr.get().length);

    startBatch();
    arr.get().push(1);
    trigger(arr);
    expect(length.get()).toBe(1);  // 不会立即刷新
    endBatch();
  });

  it('should not trigger if no subscribers', () => {
    const signal1 = signal({ value: 0 });
    signal1.get().value = 1;
    expect(() => trigger(signal1)).not.toThrow();
  });

  it('should handle null values', () => {
    const nullable = signal<object | null>(null);
    const check = computed(() => nullable.get() !== null);

    expect(check.get()).toBe(false);

    nullable.set({});
    trigger(nullable);
    expect(check.get()).toBe(true);
  });

  it('should handle undefined values', () => {
    const maybe = signal<number | undefined>(undefined);
    const hasValue = computed(() => maybe.get() !== undefined);

    expect(hasValue.get()).toBe(false);

    maybe.set(42);
    trigger(maybe);
    expect(hasValue.get()).toBe(true);
  });

  it('should work with readonly signals', () => {
    const readonly = signal(Object.freeze({ value: 0 }));
    let calls = 0;

    effect(() => {
      calls++;
      readonly.get().value;
    });

    expect(calls).toBe(1);
    trigger(readonly);
    expect(calls).toBe(2);
  });

  it('should handle empty function', () => {
    expect(() => trigger(() => {})).not.toThrow();
  });
});

describe('trigger 性能', () => {
  it('should only trigger once per call', () => {
    const src = signal<number[]>([]);
    const a = computed(() => src.get().length);
    const b = computed(() => src.get().length);
    const c = computed(() => a.get() + b.get());

    let calls = 0;
    effect(() => {
      calls++;
      c.get();
    });

    expect(calls).toBe(1);

    src.get().push(1);
    trigger(src);

    expect(calls).toBe(2);  // 应该只触发一次
  });

  it('should handle deep dependency chains', () => {
    const base = signal({ value: 0 });
    const d1 = computed(() => base.get().value);
    const d2 = computed(() => d1.get() * 2);
    const d3 = computed(() => d2.get() + 1);
    const d4 = computed(() => d3.get() * 3);

    let calls = 0;
    effect(() => {
      calls++;
      d4.get();
    });

    expect(calls).toBe(1);

    base.get().value = 10;
    trigger(base);

    expect(calls).toBe(2);
    expect(d4.get()).toBe(63);  // ((10 * 2) + 1) * 3
  });

  it('should handle diamond dependency', () => {
    const src = signal(0);
    const top = computed(() => src.get() * 2);
    const bottom = computed(() => src.get() + 1);
    const result = computed(() => top.get() + bottom.get());

    let calls = 0;
    effect(() => {
      calls++;
      result.get();
    });

    expect(calls).toBe(1);
    expect(result.get()).toBe(1);  // (0*2) + (0+1)

    src.set(5);
    trigger(src);

    expect(calls).toBe(2);
    expect(result.get()).toBe(16);  // (5*2) + (5+1)
  });
});

describe('trigger 与实际应用', () => {
  it('should integrate with external library mutation', () => {
    const data = signal<number[]>([1, 2, 3]);
    const sum = computed(() => data.get().reduce((a, b) => a + b, 0));

    expect(sum.get()).toBe(6);

    // 模拟第三方库修改数组
    const externalLib = {
      mutate: (arr: number[]) => {
        arr.push(4, 5);
      }
    };

    externalLib.mutate(data.get());
    trigger(data);

    expect(sum.get()).toBe(15);
  });

  it('should handle form state mutation', () => {
    const formState = signal({
      fields: { name: '', email: '' },
      errors: {} as Record<string, string>
    });

    const isValid = computed(() => {
      const { fields } = formState.get();
      return fields.name.length > 0 && fields.email.includes('@');
    });

    expect(isValid.get()).toBe(false);

    formState.get().fields.name = 'John';
    formState.get().fields.email = 'john@example.com';
    trigger(formState);

    expect(isValid.get()).toBe(true);
  });

  it('should handle cache invalidation', () => {
    const cache = signal(new Map<string, any>());
    const cacheSize = computed(() => cache.get().size);

    expect(cacheSize.get()).toBe(0);

    // 添加缓存
    cache.get().set('user:1', { id: 1, name: 'John' });
    trigger(cache);
    expect(cacheSize.get()).toBe(1);

    // 清除缓存
    cache.get().clear();
    trigger(cache);
    expect(cacheSize.get()).toBe(0);
  });
});
