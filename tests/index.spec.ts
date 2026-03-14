import { signal, computed, effect } from '../src';

test('watch 监听', () => {
  console.error('test signals . ');
  // const src = signal(0);
  // const c1 = computed(() => src.get() * 2);
  // const c2 = computed(() => c1.get());
  // const c3 = computed(() => c2.get());
  //
  // c3.get();
  // src.set(1); // c1 -> dirty, c2 -> toCheckDirty, c3 -> toCheckDirty
  // c2.get(); // c1 -> none, c2 -> none
  // src.set(3); // c1 -> dirty, c2 -> toCheckDirty
  //
  // const src1 = signal(0);
  // const src2 = signal(0);
  // const order: string[] = [];
  // console.warn('then effect . ');
  // effect(() => {
  //   order.push('a');
  //   pauseTracking();
  //   const isOne = src2.get() === 1;
  //   resumeTracking();
  //   if (isOne) {
  //     src1.get();
  //   }
  //   src2.get();
  //   src1.get();
  // });
  // console.warn('after effect . ');
  // effect(() => {
  //   console.warn('effect . ');
  //   order.push('b');
  //   src1.get();
  // });
  // src2.set(1); // src1.subs: a -> b -> a
  //
  // order.length = 0;
  // src1.set(src1.get() + 1);

  const map = new Map<number, number>();
  const a = signal(map);

  map.set(0, 0);
  a.get()?.set(1, 1);
  a.get();
  a.set(a.get());
  // b.set(1);
  a.set(new Map(a.get()));
});

// 测试信号基础行为
describe('Signal', () => {
  it('should return the initial value', () => {
    const s = signal(10);
    expect(s.get()).toBe(10);
  });

  it('should update the value when set', () => {
    const s = signal(10);
    s.set(20);
    expect(s.get()).toBe(20);
  });

  // 测试计算属性
  describe('Computed', () => {
    it('should compute the correct value', () => {
      const a = signal(1);
      const b = signal(2);
      const sum = computed(() => a.get() + b.get());

      expect(sum.get()).toBe(3);
      a.set(3);
      expect(sum.get()).toBe(5);
    });

    it('should be惰性求值', () => {
      const a = signal(1);
      let calls = 0;
      const c = computed(() => {
        calls++;
        return a.get() * 2;
      });

      expect(c.get()).toBe(2);
      expect(calls).toBe(1);
      c.get(); // 再次调用
      expect(calls).toBe(1); // 应该没有变化
    });
  });

  // 测试效应（effect）
  describe('Effect', () => {
    it('should track dependencies and recompute', () => {
      const a = signal(1);
      const b = signal(2);
      let result = 0;

      effect(() => {
        result = a.get() * b.get();
      });

      expect(result).toBe(2);
      a.set(3);
      expect(result).toBe(6);
      b.set(4);
      expect(result).toBe(12);
    });

    it('should stop tracking dependencies when stopped', () => {
      const a = signal(1);
      const b = signal(2);
      let result = 0;
      let stopped = false;

      const stop = effect(() => {
        if (!stopped) {
          result = a.get() * b.get();
        }
      });

      a.set(3);
      expect(result).toBe(6);
      stopped = true;
      stop(); // 停止效应  a.set(4);
      expect(result).toBe(6); // 应该没有变化
    });
  });

  // 测试依赖追踪
  describe('Dependency Tracking', () => {
    it('should track dependencies correctly', () => {
      const a = signal(1);
      const b = signal(2);
      const c = computed(() => a.get() + b.get());
      let result = 0;

      effect(() => {
        result = c.get() * 2;
      });

      a.set(3);
      expect(result).toBe(10); // (3+2)*2=10
      b.set(4);
      expect(result).toBe(14); // (3+4)*2=14
    });

    it('should propagate changes through dependencies', () => {
      const src = signal(0);
      const c1 = computed(() => src.get() % 2);
      const c2 = computed(() => c1.get() * 3);
      const c3 = computed(() => c2.get() + 5);

      expect(c3.get()).toBe(5); // (0%2)*3+5=5
      src.set(1);
      expect(c3.get()).toBe(8); // (1%2)*3+5=8
      src.set(3);
      expect(c3.get()).toBe(8); // (3%2)*3+5=8
    });
  });
});
