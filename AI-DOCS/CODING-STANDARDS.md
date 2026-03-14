# TypeDOM Signals - 编码规范

> 📋 **Signals 响应式系统编码标准**  
> ✅ Class + Reactive Pattern 最佳实践

---

## 📖 概述

本文档定义了 `@type-dom/signals` 库的编码规范，确保代码质量、一致性和可维护性。

### 适用范围

- ✅ Signal/Computed/Effect 实现代码
- ✅ 响应式系统核心逻辑
- ✅ 测试用例编写
- ✅ 性能优化代码

---

## 🎯 核心原则

### 1. Push-Pull 模型优先

```typescript
// ✅ 推荐：遵循 Push-Pull 模式
function propagate(link: Link): void {
  // Push 阶段：标记依赖为 dirty/pending
  sub.flags = flags | ReactiveFlags.Pending;
  
  // Pull 阶段：惰性求值时检查并更新
  if (checkDirty(deps, node)) {
    update(node);
  }
}

// ❌ 不推荐：递归调用导致栈溢出
function propagateRecursive(link: Link): void {
  propagate(link.nextSub); // 递归深度过大
}
```

### 2. 性能约束遵守

```typescript
// ✅ 推荐：避免使用 Array/Set/Map
interface ReactiveNode {
  deps?: Link;      // 使用 Link 链表
  depsTail?: Link;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;
}

// ❌ 不推荐：使用复杂数据结构
interface BadNode {
  deps: Map<string, any>;  // 性能开销大
  subs: Set<any>;
}
```

### 3. 类属性限制 (< 10 个)

```typescript
// ✅ 推荐：精简的类定义 (7 个属性)
export class Signal<T = unknown> implements SignalNode<T> {
  pendingValue: T | undefined;      // 1
  currentValue: T | undefined;      // 2
  subs?: Link;                      // 3
  subsTail?: Link;                  // 4
  flags: ReactiveFlags;             // 5
  
  constructor(initialValue?: T) {   // 方法不计入
    // ...
  }
  
  get() { /* ... */ }               // 方法不计入
  set(value: T): void { /* ... */ } // 方法不计入
}

// ❌ 不推荐：过多的类属性
class TooManyProperties {
  prop1: any; prop2: any; prop3: any;
  prop4: any; prop5: any; prop6: any;
  prop7: any; prop8: any; prop9: any;
  prop10: any; prop11: any; // 超出 V8 快速属性优化范围
}
```

---

## 📝 TypeScript 类型定义规范

### 接口命名规范

```typescript
// ✅ 推荐：使用 Node 后缀表示节点类型
interface ReactiveNode {
  deps?: Link;
  flags: ReactiveFlags;
}

interface SignalNode<T = any> extends ReactiveNode {
  currentValue?: T;
  pendingValue?: T;
}

interface ComputedNode<T = any, S = T> extends ReactiveNode {
  value: T | undefined;
  getter: (previousValue?: S) => T;
  setter?: (newValue: S) => void;
}

interface EffectNode extends ReactiveNode {
  fn(): void;
}

// ✅ 推荐：使用 Link 表示连接关系
interface Link {
  version: number;
  dep: ReactiveNode;
  sub: ReactiveNode;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}
```

### 枚举定义规范

```typescript
// ✅ 推荐：使用 const enum 优化性能
export const enum ReactiveFlags {
  None = 0,           // 000000
  Mutable = 1,        // 000001
  Watching = 2,       // 000010
  RecursedCheck = 4,  // 000100
  Recursed = 8,       // 001000
  Dirty = 16,         // 010000
  Pending = 32,       // 100000
}

// 使用位运算组合标志
const flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty; // 17
```

### 泛型使用规范

```typescript
// ✅ 推荐：明确的泛型约束
export function signal<T>(): Signal<T>;
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T>(initialValue?: T): Signal<T> {
  return new Signal<T>(initialValue);
}

// ✅ 推荐：计算属性的泛型支持
export function computed<T>(
  getter: (previousValue?: T) => T,
  setter?: (newValue: T) => void
): Computed<T> {
  return new Computed(getter, setter);
}

// ❌ 不推荐：缺少泛型导致类型推断失败
export function computed(getter: () => any) {
  return new Computed(getter); // 丢失类型信息
}
```

---

## 🔧 实现规范

### Signal 实现规范

```typescript
// ✅ 推荐：完整的 Signal 实现
export class Signal<T = unknown> implements SignalNode<T> {
  pendingValue: T | undefined;
  currentValue: T | undefined;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;

  constructor(initialValue?: T) {
    if (arguments.length) {
      this.pendingValue = initialValue;
      this.currentValue = initialValue;
    }
    this.flags = ReactiveFlags.Mutable;
  }

  get() {
    // 1. 检查是否需要更新
    if (this.flags & ReactiveFlags.Dirty) {
      if (updateSignal(this)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    }
    
    // 2. 建立依赖关系
    let sub = activeSub;
    while (sub !== undefined) {
      if (sub.flags & (ReactiveFlags.Mutable | ReactiveFlags.Watching)) {
        link(this, sub, cycle);
        break;
      }
      sub = sub.subs?.sub;
    }
    
    return this.currentValue as T;
  }

  set(value: T): void {
    // 3. 只在值变化时触发更新
    if (this.pendingValue !== (this.pendingValue = value)) {
      this.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
      const subs = this.subs;
      if (subs !== undefined) {
        propagate(subs);
        if (!batchDepth) {
          flush();
        }
      }
    }
  }
}
```

### Computed 实现规范

```typescript
// ✅ 推荐：支持缓存和可选 setter 的 Computed
export class Computed<T> implements ComputedNode<T> {
  value: T | undefined;
  subs?: Link;
  subsTail?: Link;
  deps?: Link;
  depsTail?: Link;
  flags: ReactiveFlags;
  getter: (previousValue?: any) => T;
  setter?: (newValue: any) => void;

  constructor(
    getter: (cachedValue?: any) => T,
    setter?: (newValue: any) => void
  ) {
    this.flags = ReactiveFlags.None;
    this.getter = getter;
    if (setter) {
      this.setter = setter;
    }
  }

  get() {
    const flags = this.flags;
    
    // 1. 检查是否需要重新计算
    if (
      flags & ReactiveFlags.Dirty
      || (
        flags & ReactiveFlags.Pending
        && checkDirty(this.deps!, this)
      )
    ) {
      if (updateComputed(this)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    } else if (!flags) {
      // 2. 首次访问，建立依赖
      this.flags = ReactiveFlags.Mutable | ReactiveFlags.RecursedCheck;
      const prevSub = setActiveSub(this);
      try {
        this.value = this.getter();
      } finally {
        activeSub = prevSub;
        this.flags &= ~ReactiveFlags.RecursedCheck;
      }
    }
    
    // 3. 被其他 effect 追踪
    const sub = activeSub;
    if (sub !== undefined) {
      link(this, sub, cycle);
    }
    
    return this.value as T;
  }

  set(value: any) {
    // 4. 可选的 setter（只读 computed 不需要）
    if (this.setter) {
      this.setter(value);
      trigger(this);
    }
  }
}
```

### Effect 实现规范

```typescript
// ✅ 推荐：自动追踪依赖的 effect
export function effect(fn: () => void): () => void {
  const e: EffectNode = {
    fn,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: ReactiveFlags.Watching | ReactiveFlags.RecursedCheck,
  };
  
  const prevSub = setActiveSub(e);
  if (prevSub !== undefined) {
    link(e, prevSub, 0); // 嵌套 effect 需要链接到父级
  }
  
  try {
    e.fn(); // 执行函数，自动追踪依赖
  } finally {
    activeSub = prevSub;
    e.flags &= ~ReactiveFlags.RecursedCheck;
  }
  
  return effectOper.bind(e); // 返回停止函数
}

// 清理函数
function effectOper(this: EffectNode): void {
  effectScopeOper.call(this);
}
```

### Effect Scope 实现规范

```typescript
// ✅ 推荐：管理副作用生命周期的 effectScope
export function effectScope(fn: () => void): () => void {
  const e: ReactiveNode = {
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    flags: ReactiveFlags.None,
  };
  
  const prevSub = setActiveSub(e);
  if (prevSub !== undefined) {
    link(e, prevSub, 0);
  }
  
  try {
    fn(); // 在作用域内执行
  } finally {
    activeSub = prevSub;
  }
  
  return effectScopeOper.bind(e); // 返回停止函数
}

// 清理作用域
function effectScopeOper(this: ReactiveNode): void {
  this.depsTail = undefined;
  this.flags = ReactiveFlags.None;
  purgeDeps(this); // 清理所有依赖
  
  const sub = this.subs;
  if (sub !== undefined) {
    unlink(sub); // 取消订阅
  }
}
```

---

## 🚀 性能优化规范

### 1. 避免递归调用

```typescript
// ✅ 推荐：使用栈结构替代递归
function propagate(link: Link): void {
  let next = link.nextSub;
  let stack: Stack<Link | undefined> | undefined;

  top: do {
    const sub = link.sub;
    // ... 处理逻辑
    
    if (flags & ReactiveFlags.Mutable) {
      const subSubs = sub.subs;
      if (subSubs !== undefined) {
        const nextSub = (link = subSubs).nextSub;
        if (nextSub !== undefined) {
          stack = { value: next, prev: stack }; // 压栈
          next = nextSub;
          continue;
        }
      }
    }
    
    if ((link = next!) !== undefined) {
      next = link.nextSub;
      continue;
    }
    
    while (stack !== undefined) {
      link = stack.value!;
      stack = stack.prev; // 出栈
      if (link !== undefined) {
        next = link.nextSub;
        continue top;
      }
    }
    
    break;
  } while (true);
}

// ❌ 不推荐：递归实现可能导致栈溢出
function propagateRecursive(link: Link): void {
  const sub = link.sub;
  if (sub.flags & ReactiveFlags.Mutable) {
    propagateRecursive(sub.subs!); // 递归深度不可控
  }
}
```

### 2. 惰性求值优化

```typescript
// ✅ 推荐：computed 默认惰性求值
const count = signal(0);
const double = computed(() => {
  console.log('Computing...'); // 只在首次 get() 或依赖变化时执行
  return count.get() * 2;
});

// 不调用 get() 不会执行计算
// console.log(double.get()); // 才会触发

// ❌ 不推荐：立即执行的计算
const eagerDouble = count.get() * 2; // 立即计算，无法缓存
```

### 3. 批量更新优化

```typescript
// ✅ 推荐：使用 batch 合并多次更新
export function startBatch() {
  ++batchDepth;
}

export function endBatch() {
  if (!--batchDepth) {
    flush(); // 批量结束后统一刷新
  }
}

// 使用示例
startBatch();
count.set(1);
count.set(2);
count.set(3); // 只触发一次通知
endBatch();

// ❌ 不推荐：单独更新触发多次通知
count.set(1); // 触发通知
count.set(2); // 触发通知
count.set(3); // 触发通知
```

### 4. 依赖清理优化

```typescript
// ✅ 推荐：及时清理不再需要的依赖
function purgeDeps(sub: ReactiveNode) {
  const depsTail = sub.depsTail;
  let dep = depsTail !== undefined ? depsTail.nextDep : sub.deps;
  
  while (dep !== undefined) {
    dep = unlink(dep, sub); // 逐个清理
  }
}

// 在 effect 停止时调用
effectScopeOper() {
  this.flags = ReactiveFlags.None;
  purgeDeps(this); // 清理所有依赖
}
```

---

## 🧪 测试规范

### 单元测试编写规范

```typescript
// ✅ 推荐：完整的测试用例结构
import { test, expect } from 'vitest';
import { signal, computed, effect } from '../src';

describe('signal', () => {
  test('should create signal with initial value', () => {
    const count = signal(0);
    expect(count.get()).toBe(0);
  });

  test('should trigger effect when value changes', () => {
    const count = signal(0);
    let effectCount = 0;
    
    effect(() => {
      effectCount++;
      count.get();
    });
    
    expect(effectCount).toBe(1);
    
    count.set(1);
    expect(effectCount).toBe(2);
  });

  test('should not trigger if value is same', () => {
    const count = signal(0);
    let effectCount = 0;
    
    effect(() => {
      effectCount++;
      count.get();
    });
    
    count.set(0); // 相同值，不应触发
    expect(effectCount).toBe(1);
  });
});

describe('computed', () => {
  test('should cache computed value', () => {
    let computeCount = 0;
    const count = signal(0);
    const double = computed(() => {
      computeCount++;
      return count.get() * 2;
    });
    
    double.get();
    expect(computeCount).toBe(1);
    
    double.get(); // 从缓存读取
    expect(computeCount).toBe(1);
    
    count.set(1);
    double.get(); // 重新计算
    expect(computeCount).toBe(2);
  });

  test('should propagate through chained computations', () => {
    const src = signal(0);
    const c1 = computed(() => src.get() % 2);
    const c2 = computed(() => c1.get());
    const c3 = computed(() => c2.get());
    
    c3.get();
    src.set(1);
    expect(c3.get()).toBe(1);
  });
});
```

### 性能测试规范

```typescript
// ✅ 推荐：性能基准测试
import { test, expect } from 'vitest';
import { signal, computed } from '../src';

test('performance: should create 1000 signals quickly', () => {
  const start = performance.now();
  
  const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
  
  const end = performance.now();
  const duration = end - start;
  
  expect(duration).toBeLessThan(10); // 应在 10ms 内完成
  expect(signals.length).toBe(1000);
});

test('performance: should handle 1000 computations efficiently', () => {
  const src = signal(0);
  
  const start = performance.now();
  
  const computations = Array.from({ length: 1000 }, () =>
    computed(() => src.get() % 2)
  );
  
  const end = performance.now();
  const duration = end - start;
  
  expect(duration).toBeLessThan(20); // 应在 20ms 内完成
  expect(computations.length).toBe(1000);
});
```

### 边界测试规范

```typescript
// ✅ 推荐：测试边界情况
test('should handle null and undefined values', () => {
  const nullSignal = signal(null);
  expect(nullSignal.get()).toBe(null);
  
  const undefinedSignal = signal(undefined);
  expect(undefinedSignal.get()).toBe(undefined);
  
  nullSignal.set(undefined);
  expect(nullSignal.get()).toBe(undefined);
});

test('should handle object and array references', () => {
  const objSignal = signal({ count: 0 });
  const obj = objSignal.get();
  
  obj.count++; // 直接修改内部值
  objSignal.set(obj); // 同一引用，需要手动 notify
  
  const arrSignal = signal([1, 2, 3]);
  arrSignal.get().push(4); // 直接修改数组
  trigger(arrSignal); // 手动触发通知
});

test('should prevent circular dependencies', () => {
  // 循环依赖会导致无限循环，应该避免
  // const a = computed(() => b.get());
  // const b = computed(() => a.get()); // ❌ 错误
  
  // ✅ 正确：单向数据流
  const base = signal(0);
  const derived = computed(() => base.get() * 2);
});
```

---

## 📊 代码质量指标

### 复杂度要求

| 指标 | 目标值 | 说明 |
|------|-------|------|
| 圈复杂度 | ≤ 10 | 单个函数圈复杂度不超过 10 |
| 函数行数 | ≤ 50 | 单个函数不超过 50 行 |
| 类属性数 | ≤ 10 | 单个类的属性不超过 10 个 |
| 文件行数 | ≤ 500 | 单个源文件不超过 500 行 |
| 测试覆盖率 | ≥ 90% | 单元测试覆盖率不低于 90% |

### 性能要求

| 场景 | 目标值 | 测量方式 |
|------|-------|----------|
| signal 创建 | < 3ms/1000 个 | `createSignals` 基准测试 |
| computed 创建 | < 20ms/1000 个 | `createComputations` 基准测试 |
| cellx1000 | < 15ms | `cellx1000` 基准测试 |
| molBench | < 700ms | `molBench` 基准测试 |

---

## 🔍 Code Review 检查清单

### 架构检查

- [ ] 是否遵循 Push-Pull 模型？
- [ ] 是否正确实现依赖追踪？
- [ ] 是否避免了递归调用？
- [ ] 是否使用了 Link 链表而非 Array/Map？

### 类型检查

- [ ] 是否有完整的 TypeScript 类型定义？
- [ ] 泛型使用是否正确？
- [ ] 返回值类型是否明确？
- [ ] 是否使用了 const enum 优化？

### 性能检查

- [ ] 类属性是否 ≤ 10 个？
- [ ] 是否避免了不必要的计算？
- [ ] 是否正确实现缓存机制？
- [ ] 是否支持批量更新？

### 测试检查

- [ ] 是否有完整的单元测试？
- [ ] 测试覆盖率是否 ≥ 90%？
- [ ] 是否覆盖了边界情况？
- [ ] 是否有性能基准测试？

---

## 📚 相关文档

- [`AI-README.md`](./AI-README.md) - Signals AI文档总索引
- [`SIGNALS-API-GUIDE.md`](./SIGNALS-API-GUIDE.md) - 完整 API 参考
- [`PERFORMANCE-GUIDE.md`](./PERFORMANCE-GUIDE.md) - 性能优化指南
- [`TROUBLESHOOTING-GUIDE.md`](./TROUBLESHOOTING-GUIDE.md) - 问题排查指南

---

**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License
