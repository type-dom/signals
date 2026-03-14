# TypeDOM Signals - 完整 API 指南

> ⚡ **TypeDOM 响应式系统核心**  
> 📍 @type-dom/signals 库的 API 完全参考  
> ✅ 基于实际源码验证

---

## 📖 概述

`@type-dom/signals` 是 TypeDOM 框架的响应式系统，提供细粒度的状态管理能力。

### 核心特性

- ✅ **自动依赖追踪** - 无需手动指定依赖
- ✅ **精确更新** - 只更新受影响的组件
- ✅ **批量更新** - 合并多次变更提升性能
- ✅ **作用域管理** - 自动清理防止内存泄漏

---

## 🔧 基础 Signals API

### signal<T>(value: T): Signal<T>

创建响应式信号。

```typescript
import { signal } from '@type-dom/signals';

const count = signal(0);
const name = signal('TypeDOM');
const items = signal<Item[]>([]);
```

**API:**
```typescript
export class Signal<T = unknown> {
  get(): T;                              // 读取值（建立依赖）
  set(value: T): void;                   // 设置值（触发更新）
}
```

**示例:**
```typescript
const count = signal(0);

console.log(count.get());        // 0
count.set(5);
console.log(count.get());        // 5
```

---

### computed<T>(fn: () => T): Computed<T>

创建计算属性，自动追踪依赖并缓存结果。

```typescript
import { signal, computed } from '@type-dom/signals';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => {
  return `${firstName.get()} ${lastName.get()}`;
});

console.log(fullName.get());     // "John Doe"

firstName.set('Jane');
console.log(fullName.get());     // "Jane Doe" - 自动重新计算
```

**特性:**
- ✅ 自动追踪依赖
- ✅ 缓存计算结果
- ✅ 只在依赖变化时重新计算
- ✅ 支持可选 setter（可编辑的 computed）

---

### effect(fn: () => void): () => void

创建副作用函数，自动追踪依赖并在变化时重新执行。

```typescript
import { signal, effect } from '@type-dom/signals';

const count = signal(0);

const stop = effect(() => {
  console.log('Count:', count.get());
});

// 输出："Count: 0"

count.set(1);
// 输出："Count: 1" - 自动重新执行

stop();  // 停止监听
count.set(2);
// 不再输出 - 已停止监听
```

**返回值:** 清理函数，用于停止监听

---

### trigger(fn: Signal | (() => void))

触发信号或函数的执行。

```typescript
import { signal, trigger } from '@type-dom/signals';

const count = signal(0);

// 触发信号
trigger(count);

// 触发函数
trigger(() => {
  console.log('Triggered!');
});
```

---

## 🎛️ 批量更新 API

### startBatch()

开始批量更新。

```typescript
import { startBatch, endBatch, signal } from '@type-dom/signals';

const a = signal(0);
const b = signal(0);

startBatch();
a.set(1);
b.set(2);
endBatch();  // 此时才触发更新
```

---

### endBatch()

结束批量更新并执行 flush。

```typescript
import { startBatch, endBatch } from '@type-dom/signals';

startBatch();
// ... 多次更新
endBatch();  // 执行所有待处理的更新
```

---

### getBatchDepth()

获取当前批量更新的嵌套深度。

```typescript
import { getBatchDepth, startBatch, endBatch } from '@type-dom/signals';

console.log(getBatchDepth());  // 0

startBatch();
console.log(getBatchDepth());  // 1

startBatch();
console.log(getBatchDepth());  // 2

endBatch();
console.log(getBatchDepth());  // 1

endBatch();
console.log(getBatchDepth());  // 0
```

---

## 🎯 Effect Scope API

### effectScope(fn: () => void): () => void

创建作用域，自动管理其中的副作用。

```typescript
import { effectScope, effect } from '@type-dom/signals';

const scope = effectScope(() => {
  effect(() => {
    // 在这个作用域中的所有 effect 都会被管理
  });
  
  effect(() => {
    // ...
  });
});

// 清理所有副作用
scope();
```

---

### getCurrentScope(): ReactiveNode | undefined

获取当前活跃的作用域。

```typescript
import { getCurrentScope, effectScope } from '@type-dom/signals';

const scope = effectScope(() => {
  const current = getCurrentScope();
  console.log(current);  // 当前作用域节点
});
```

---

### setCurrentScope(scope: ReactiveNode | undefined)

设置当前作用域。

```typescript
import { setCurrentScope, getCurrentScope } from '@type-dom/signals';

const prevScope = getCurrentScope();
const newScope = createScope();
setCurrentScope(newScope);

// ... 操作

setCurrentScope(prevScope);  // 恢复
```

---

## 🔍 工具函数

### isSignal(value: any): boolean

判断是否为 signal。

```typescript
import { signal, isSignal } from '@type-dom/signals';

const s = signal(0);
console.log(isSignal(s));           // true
console.log(isSignal(123));         // false
```

---

### isComputed(value: any): boolean

判断是否为 computed。

```typescript
import { signal, computed, isComputed } from '@type-dom/signals';

const c = computed(() => 42);
console.log(isComputed(c));         // true
console.log(isComputed(signal(0))); // false
```

---

### isEffect(fn: () => void): boolean

判断是否为 effect。

```typescript
import { effect, isEffect } from '@type-dom/signals';

const e = effect(() => {});
console.log(isEffect(e));           // true
console.log(isEffect(() => {}));    // false
```

---

### isEffectScope(fn: () => void): boolean

判断是否为 effect scope。

```typescript
import { effectScope, isEffectScope } from '@type-dom/signals';

const scope = effectScope(() => {});
console.log(isEffectScope(scope));  // true
```

---

## 📊 常量定义

### ReactiveFlags

响应式标志枚举。

```typescript
enum ReactiveFlags {
  None = 0,           // 000000
  Mutable = 1,        // 000001
  Watching = 2,       // 000010
  RecursedCheck = 4,  // 000100
  Recursed = 8,       // 001000
  Dirty = 16,         // 010000
  Pending = 32,       // 100000
}
```

---

## 🎯 类型定义

### 核心类型

```typescript
// Signal 和 Computed 都是类
export class Signal<T = unknown> {
  get(): T;
  set(value: T): void;
}

export class Computed<T> extends Signal<T> {
  // 自动追踪依赖，缓存计算结果
  // 可选的 setter（用于可编辑的 computed）
  set(value: T): void;
}

// Effect 是函数
interface Effect {
  (fn: () => void): () => void;
}

// Effect Scope 相关
interface EffectScope {
  (): void;  // 停止作用域
}

// 底层类型
// ReactiveNode - 响应式节点接口
interface ReactiveNode {
  deps?: Link;
  depsTail?: Link;
  subs?: Link;
  subsTail?: Link;
  flags: ReactiveFlags;
}

// Link - 依赖链接
interface Link {
  version: number;
  dep: ReactiveNode;
  sub: ReactiveNode;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}

// EffectNode - 副作用节点
interface EffectNode extends ReactiveNode {
  fn(): void;
}

// ComputedNode - 计算节点
interface ComputedNode<T = any, S = T> extends ReactiveNode {
  value: T | undefined;
  getter: (previousValue?: S) => T;
  setter?: (newValue: S) => void;
}
```

---

## 💡 最佳实践

### 1. 选择合适的 API

```typescript
// 基础状态 → signal
const count = signal(0);

// 派生状态 → computed
const double = computed(() => count.get() * 2);

// 副作用 → effect
effect(() => {
  console.log('Count:', count.get());
});

// 批量更新 → startBatch/endBatch
startBatch();
a.set(1);
b.set(2);
endBatch();
```

### 2. 及时清理资源

```typescript
import { effectScope } from '@type-dom/signals';

effectScope(() => {
  const timer = setInterval(() => {}, 1000);
  
  // 在 effectScope 返回的清理函数中处理
});
```

### 3. 避免常见陷阱

```typescript
// ❌ 直接修改数组
const arr = signal([1, 2, 3]);
arr.get().push(4);  // 不会触发更新

// ✅ 创建新数组
arr.set([...arr.get(), 4]);  // 触发更新

// ❌ 在 effect 中使用 async/await
effect(async () => {
  const data = await fetchData();  // 不会追踪依赖
});

// ✅ 正确处理
const data = signal(null);
effect(() => {
  fetchData().then(d => data.set(d));
});
```

---

## 📚 相关文档

### Signals 库文档
- [AI-README.md](./AI-README.md) - Signals AI文档总索引
- [ARCHITECTURE-GUIDE.md](./ARCHITECTURE-GUIDE.md) - 架构详解
- [CODING-STANDARDS.md](./CODING-STANDARDS.md) - 编码规范
- [TESTING-GUIDE.md](./TESTING-GUIDE.md) - 测试指南
- [PERFORMANCE-GUIDE.md](./PERFORMANCE-GUIDE.md) - 性能优化
- [TROUBLESHOOTING-GUIDE.md](./TROUBLESHOOTING-GUIDE.md) - 故障排查

### 相关库文档
- [Hooks 文档](../../hooks/AI-DOCS/AI-README.md)
- [Utils 文档](../../utils/AI-DOCS/AI-README.md)
- [Framework 文档](../../framework/AI-DOCS/AI-README.md)

### 全局规则
- [GLOBAL-004: CSS Class Management](../../../.lingma/rules/15-global-css-class-rule.md)

---

**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License
