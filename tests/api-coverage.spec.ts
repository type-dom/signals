import { describe, expect, it } from 'vitest';
import { 
  signal, 
  computed, 
  effect, 
  trigger,
  startBatch,
  endBatch,
  getBatchDepth,
  effectScope,
  getCurrentScope,
  setCurrentScope,
  isSignal,
  isComputed,
  isEffect,
  isEffectScope
} from '../src';

describe('Signal API', () => {
  describe('signal()', () => {
    it('should create a signal with initial value', () => {
      const count = signal(0);
      expect(count.get()).toBe(0);
    });

    it('should create a signal without initial value (undefined)', () => {
      const name = signal<string>();
      expect(name.get()).toBeUndefined();
    });

    it('should update value with set()', () => {
      const count = signal(0);
      count.set(5);
      expect(count.get()).toBe(5);
    });

    it('should handle array references with trigger', () => {
      const arr = signal([1, 2, 3]);
      const original = arr.get();
      original.push(4);
      // Value changed but reference didn't, so use trigger
      trigger(arr);
      expect(arr.get().length).toBe(4);
    });
  });
});

describe('Computed API', () => {
  describe('computed()', () => {
    it('should compute value from getter', () => {
      const firstName = signal('John');
      const lastName = signal('Doe');
      const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);
      
      expect(fullName.get()).toBe('John Doe');
    });

    it('should recompute when dependencies change', () => {
      const firstName = signal('John');
      const fullName = computed(() => firstName.get());
      
      firstName.set('Jane');
      expect(fullName.get()).toBe('Jane');
    });

    it('should support optional setter for editable computed', () => {
      const value = signal(10);
      const doubled = computed(
        () => value.get() * 2,
        (newValue: number) => value.set(newValue / 2)
      );

      expect(doubled.get()).toBe(20);
      doubled.set(30);
      expect(value.get()).toBe(15);
    });
  });
});

describe('Effect API', () => {
  describe('effect()', () => {
    it('should execute immediately and track dependencies', () => {
      const count = signal(0);
      let result = 0;

      effect(() => {
        result = count.get() * 2;
      });

      expect(result).toBe(0);
      count.set(5);
      expect(result).toBe(10);
    });

    it('should return cleanup function', () => {
      const count = signal(0);
      let executions = 0;

      const stop = effect(() => {
        executions++;
        count.get();
      });

      expect(executions).toBe(1);
      count.set(1);
      expect(executions).toBe(2);

      stop();
      count.set(2);
      expect(executions).toBe(2); // Should not execute after stop
    });
  });
});

describe('Trigger API', () => {
  describe('trigger()', () => {
    it('should trigger a signal', () => {
      const count = signal(0);
      const doubled = computed(() => count.get() * 2);
      
      doubled.get();
      count.get(); // Modify without changing reference
      trigger(count);
      
      expect(doubled.get()).toBe(0);
    });

    it('should trigger a function', () => {
      let executed = false;
      trigger(() => {
        executed = true;
      });
      expect(executed).toBe(true);
    });
  });
});

describe('Batch Update API', () => {
  describe('startBatch() / endBatch()', () => {
    it('should batch multiple updates', () => {
      const a = signal(0);
      const b = signal(0);
      let executions = 0;

      effect(() => {
        a.get();
        b.get();
        executions++;
      });

      expect(executions).toBe(1);

      startBatch();
      a.set(1);
      b.set(2);
      endBatch();

      expect(executions).toBe(2); // Only one execution after batch
    });

    it('should handle nested batches', () => {
      expect(getBatchDepth()).toBe(0);

      startBatch();
      expect(getBatchDepth()).toBe(1);

      startBatch();
      expect(getBatchDepth()).toBe(2);

      endBatch();
      expect(getBatchDepth()).toBe(1);

      endBatch();
      expect(getBatchDepth()).toBe(0);
    });
  });

  describe('getBatchDepth()', () => {
    it('should return current batch depth', () => {
      const initialDepth = getBatchDepth();
      
      startBatch();
      expect(getBatchDepth()).toBe(initialDepth + 1);
      
      endBatch();
      expect(getBatchDepth()).toBe(initialDepth);
    });
  });
});

describe('Effect Scope API', () => {
  describe('effectScope()', () => {
    it('should manage effects in scope', () => {
      const count = signal(0);
      let outerExecutions = 0;
      let innerExecutions = 0;

      const stopScope = effectScope(() => {
        effect(() => {
          outerExecutions++;
          count.get();
        });

        effect(() => {
          innerExecutions++;
          count.get();
        });
      });

      expect(outerExecutions).toBe(1);
      expect(innerExecutions).toBe(1);

      count.set(1);
      expect(outerExecutions).toBe(2);
      expect(innerExecutions).toBe(2);

      stopScope();
      count.set(2);
      expect(outerExecutions).toBe(2); // Should not execute
      expect(innerExecutions).toBe(2);
    });

    it('should return cleanup function', () => {
      const scope = effectScope(() => {});
      expect(typeof scope).toBe('function');
    });
  });

  describe('getCurrentScope() / setCurrentScope()', () => {
    it('should get current scope', () => {
      let scopeInCallback: any;

      effectScope(() => {
        scopeInCallback = getCurrentScope();
      });

      expect(scopeInCallback).toBeDefined();
    });

    it('should set and restore scope', () => {
      const initialScope = getCurrentScope();
      
      effectScope(() => {
        const newScope = getCurrentScope();
        expect(newScope).toBeDefined();
        
        // Set to undefined temporarily
        setCurrentScope(undefined);
        expect(getCurrentScope()).toBeUndefined();
        
        // Restore
        setCurrentScope(newScope);
        expect(getCurrentScope()).toBe(newScope);
      });

      expect(getCurrentScope()).toBe(initialScope);
    });
  });
});

describe('Type Guard APIs', () => {
  describe('isSignal()', () => {
    it('should identify signals', () => {
      const s = signal(0);
      expect(isSignal(s)).toBe(true);
    });

    it('should reject non-signals', () => {
      expect(isSignal(123)).toBe(false);
      expect(isSignal('string')).toBe(false);
      expect(isSignal({})).toBe(false);
      expect(isSignal(null)).toBe(false);
    });
  });

  describe('isComputed()', () => {
    it('should identify computed', () => {
      const c = computed(() => 42);
      expect(isComputed(c)).toBe(true);
    });

    it('should reject non-computed', () => {
      expect(isComputed(signal(0))).toBe(false);
      expect(isComputed(123)).toBe(false);
    });
  });

  describe('isEffect()', () => {
    it('should identify effect', () => {
      const stop = effect(() => {});
      expect(isEffect(stop)).toBe(true);
    });

    it('should reject non-effect', () => {
      expect(isEffect(() => {})).toBe(false);
      expect(isEffect(function regularFn() {})).toBe(false);
    });
  });

  describe('isEffectScope()', () => {
    it('should identify effect scope', () => {
      const stop = effectScope(() => {});
      expect(isEffectScope(stop)).toBe(true);
    });

    it('should reject non-effect-scope', () => {
      expect(isEffectScope(() => {})).toBe(false);
      expect(isEffectScope(effect(() => {}))).toBe(false);
    });
  });
});
