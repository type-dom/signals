import { describe, expect, it } from 'vitest';
import { signal, computed, effect, startBatch, endBatch, effectScope } from '../src';

describe('Best Practices - API Selection', () => {
  it('should use signal for basic state', () => {
    const count = signal(0);
    expect(count.get()).toBe(0);

    count.set(5);
    expect(count.get()).toBe(5);
  });

  it('should use computed for derived state', () => {
    const count = signal(0);
    const double = computed(() => count.get() * 2);

    expect(double.get()).toBe(0);

    count.set(5);
    expect(double.get()).toBe(10);
  });

  it('should use effect for side effects', () => {
    const count = signal(0);
    let logged = '';

    effect(() => {
      logged = `Count: ${count.get()}`;
    });

    expect(logged).toBe('Count: 0');

    count.set(5);
    expect(logged).toBe('Count: 5');
  });

  it('should use batch for multiple updates', () => {
    const a = signal(0);
    const b = signal(0);
    let executions = 0;

    effect(() => {
      a.get();
      b.get();
      executions++;
    });

    expect(executions).toBe(1);

    // Batch updates to minimize re-executions
    startBatch();
    a.set(1);
    b.set(2);
    endBatch();

    expect(executions).toBe(2); // Only one re-execution
  });
});

describe('Common Pitfalls', () => {
  it('should not trigger update by mutating array directly', () => {
    const arr = signal([1, 2, 3]);
    let executions = 0;

    effect(() => {
      arr.get();
      executions++;
    });

    expect(executions).toBe(1);

    // This won't trigger update because reference doesn't change
    arr.get().push(4);
    expect(executions).toBe(1);
  });

  it('should create new array to trigger update', () => {
    const arr = signal([1, 2, 3]);
    let executions = 0;

    effect(() => {
      arr.get();
      executions++;
    });

    expect(executions).toBe(1);

    // Create new array to trigger update
    arr.set([...arr.get(), 4]);
    expect(executions).toBe(2);
  });

  it('should handle async/await properly in effect', async () => {
    const data = signal<string | null>(null);
    let executions = 0;

    // Correct way: don't use async/await directly in effect
    effect(() => {
      executions++;
      // Simulate async operation
      Promise.resolve('async data').then(d => data.set(d));
    });

    // Initial execution
    expect(executions).toBe(1);
    expect(data.get()).toBeNull();

    // Wait for async operation to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(data.get()).toBe('async data');
        expect(executions).toBe(1); // Should not re-execute due to async
        resolve();
      }, 10);
    });
  });
});

describe('Signal Behavior with Different Types', () => {
  it('should handle primitive types correctly', () => {
    const num = signal(42);
    const str = signal('hello');
    const bool = signal(true);
    const nil = signal(null);
    const undef = signal(undefined);

    expect(num.get()).toBe(42);
    expect(str.get()).toBe('hello');
    expect(bool.get()).toBe(true);
    expect(nil.get()).toBeNull();
    expect(undef.get()).toBeUndefined();
  });

  it('should handle object references', () => {
    const obj = signal({ name: 'TypeDOM', version: '3.0.0' });
    let executions = 0;

    effect(() => {
      obj.get();
      executions++;
    });

    expect(executions).toBe(1);

    // Mutating object won't trigger update
    obj.get().name = 'Changed';
    expect(executions).toBe(1);

    // Setting new object will trigger update
    obj.set({ name: 'New', version: '4.0.0' });
    expect(executions).toBe(2);
  });

  it('should handle array references', () => {
    const arr = signal<number[]>([1, 2, 3]);
    let executions = 0;

    effect(() => {
      arr.get();
      executions++;
    });

    expect(executions).toBe(1);

    // Same reference - according to current implementation, this WILL trigger
    // because set() calls trigger() for arrays and objects
    arr.set(arr.get());
    expect(executions).toBe(2);  // Will trigger because trigger() is called

    // New reference will also trigger
    arr.set([1, 2, 3, 4]);
    expect(executions).toBe(3);
  });

  it('should detect same value for primitives', () => {
    const num = signal(0);
    let executions = 0;

    effect(() => {
      num.get();
      executions++;
    });

    expect(executions).toBe(1);

    // Setting same value should not trigger
    num.set(0);
    expect(executions).toBe(1);
  });
});

describe('Computed with Setter', () => {
  it('should support editable computed properties', () => {
    const firstName = signal('John');
    const lastName = signal('Doe');

    const fullName = computed(
      () => `${firstName.get()} ${lastName.get()}`,
      (newValue: string) => {
        const [first, last] = newValue.split(' ');
        firstName.set(first);
        lastName.set(last || '');
      }
    );

    expect(fullName.get()).toBe('John Doe');

    // Use setter
    fullName.set('Jane Smith');
    expect(firstName.get()).toBe('Jane');
    expect(lastName.get()).toBe('Smith');
    expect(fullName.get()).toBe('Jane Smith');
  });
});

describe('Effect Scope Nesting', () => {
  it('should handle nested effect scopes', () => {
    const count = signal(0);
    let outerExecutions = 0;
    let innerExecutions = 0;

    const stopOuter = effectScope(() => {
      effect(() => {
        outerExecutions++;
        count.get();
      });

      const stopInner = effectScope(() => {
        effect(() => {
          innerExecutions++;
          count.get();
        });
      });

      // Stop inner scope
      stopInner();
    });

    expect(outerExecutions).toBe(1);
    expect(innerExecutions).toBe(1);

    count.set(1);
    expect(outerExecutions).toBe(2);
    expect(innerExecutions).toBe(1); // Inner stopped

    stopOuter();
    count.set(2);
    expect(outerExecutions).toBe(2);
  });
});
