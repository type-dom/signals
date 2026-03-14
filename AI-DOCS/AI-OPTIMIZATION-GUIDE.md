# TypeDOM Signals - AI 优化指南

> 🧠 **响应式编程概念完全指南**  
> 💡 深入理解 Signals 的心智模型

---

## 📖 概述

### 本文档目标

帮助开发者（和 AI 助手）深入理解 `@type-dom/signals` 的响应式编程范式，建立正确的心智模型。

### 适用对象

- ✅ 初次接触 Signals 的开发者
- ✅ 从 Vue/React 迁移的开发者
- ✅ AI 助手理解响应式概念
- ✅ 需要深入原理的高级用户

---

## 🎯 核心概念解析

### 1. 什么是 Signal？

**定义**: Signal 是一个包含值的容器，这个值可以随时间变化，并且能通知订阅者。

**心智模型**:
```
Signal 就像一个"智能变量"：
- 普通变量：let count = 0;
- Signal 变量：const count = signal(0);

区别：
- 普通变量变化时，没人知道
- Signal 变化时，所有订阅者都会收到通知
```

**关键特性**:
```typescript
const count = signal(0);

// 读取值（建立依赖）
const value = count.get();

// 设置值（触发通知）
count.set(1);

// 更新值（基于旧值）
count.update(v => v + 1);
```

**与 Vue Reactivity 对比**:
```typescript
// Vue: ref
const count = ref(0);
count.value = 1;

// Signals: signal
const count = signal(0);
count.set(1);

// 本质区别：
// Vue: 使用 Proxy 自动追踪
// Signals: 显式 get/set，更清晰的控制
```

---

### 2. 什么是 Computed？

**定义**: Computed 是一个基于其他 Signals 计算得出的 Signal，具有缓存机制。

**心智模型**:
```
Computed 就像"智能公式"：
- 普通公式：const double = count * 2; // 只计算一次
- Computed: const double = computed(() => count.get() * 2); // 自动更新

特点：
- 惰性求值：不调用 get() 不计算
- 自动缓存：依赖不变不重新计算
- 依赖追踪：自动知道依赖谁
```

**缓存机制**:
```typescript
const count = signal(0);
let computeCount = 0;

const double = computed(() => {
  computeCount++;
  return count.get() * 2;
});

double.get();        // computeCount = 1 (首次计算)
double.get();        // computeCount = 1 (使用缓存)
count.set(1);        // 标记为 dirty，但不立即计算
double.get();        // computeCount = 2 (重新计算)
```

**与 Vue Computed 对比**:
```typescript
// Vue
const double = computed(() => count.value * 2);

// Signals
const double = computed(() => count.get() * 2);

// 几乎一样！但 Signals 更透明
```

---

### 3. 什么是 Effect？

**定义**: Effect 是一个会自动重新执行的函数，当它依赖的 Signals 变化时。

**心智模型**:
```
Effect 就像"自动执行的观察者"：
- 普通函数：需要你手动调用
- Effect: 依赖变化时自动执行

工作流程：
1. 首次执行：记录依赖
2. 依赖变化：自动重新执行
3. 停止监听：调用返回的清理函数
```

**执行时机**:
```typescript
const count = signal(0);

const stop = effect(() => {
  console.log('Count:', count.get());
});
// 立即执行一次 → "Count: 0"

count.set(1);
// 自动重新执行 → "Count: 1"

stop();
// 停止监听

count.set(2);
// 不再执行
```

**与 Vue WatchEffect 对比**:
```typescript
// Vue
watchEffect(() => {
  console.log(count.value);
});

// Signals
effect(() => {
  console.log(count.get());
});

// 几乎一样！
```

---

### 4. Push-Pull 模型详解

**Push 阶段**（推送）:
```
当 signal.set() 被调用时：
1. 标记所有依赖为 "Pending"
2. 沿着依赖链向下传播标记
3. 将 effect 加入执行队列

特点：
- 不立即重新计算
- 只是标记"可能需要更新"
- 避免重复计算
```

**Pull 阶段**（拉取）:
```
当需要获取值时（如 effect 执行）：
1. 检查是否 Dirty
2. 如果是，重新计算
3. 如果不是，使用缓存

特点：
- 惰性求值
- 只在需要时计算
- 利用缓存
```

**完整流程示例**:
```typescript
const a = signal(0);
const b = computed(() => a.get() + 1);
const c = computed(() => b.get() + 1);

effect(() => {
  console.log(c.get());
});
// 输出：2

// Push 阶段
a.set(1);
// a.flags = Dirty
// b.flags = Pending
// c.flags = Pending
// effect 加入队列

// Pull 阶段（flush 执行时）
// effect 执行 → 读取 c
// c 检查：Pending → checkDirty(b)
// b 检查：Pending → checkDirty(a)
// a 已更新 → b 重新计算 → c 重新计算
// 输出：3
```

---

## 🔄 依赖追踪机制

### 如何自动追踪依赖？

**秘密在于 `get()` 方法**:

```typescript
// 简化的 Signal.get() 实现
get() {
  // 如果有活跃的 effect（activeSub）
  if (activeSub !== undefined) {
    // 建立依赖关系
    link(this, activeSub);
  }
  return this.currentValue;
}

// Effect 执行时
effect(() => {
  activeSub = thisEffect;  // 设置当前 effect
  count.get();             // get() 发现 activeSub，建立链接
  activeSub = undefined;   // 清除
});
```

**可视化依赖建立**:
```
初始状态:
count: signal(0)
effect: () => { count.get() }

执行 effect:
1. activeSub = effect
2. 执行 count.get()
3. get() 发现 activeSub
4. 创建 Link: count ←→ effect
5. activeSub = undefined

结果:
count.subs → [effect]
effect.deps → [count]
```

---

## ⚡ 批量更新原理

### 为什么需要 Batch？

**问题场景**:
```typescript
const a = signal(0);
const b = signal(0);

effect(() => {
  console.log(a.get() + b.get());
});
// 输出：0

// 不使用 batch
a.set(1);  // effect 执行 → 输出 1
b.set(2);  // effect 执行 → 输出 3
// 执行了 2 次！

// 使用 batch
batch(() => {
  a.set(1);
  b.set(2);
});
// effect 只执行 1 次 → 输出 3
```

**Batch 内部机制**:
```typescript
let batchDepth = 0;
let queue = [];

function startBatch() {
  batchDepth++;  // 进入批量模式
}

function endBatch() {
  batchDepth--;
  if (batchDepth === 0) {
    flush();  // 批量结束后统一执行
  }
}

function batch(fn) {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
}
```

---

## 🎯 作用域管理

### 为什么需要 EffectScope？

**问题场景**:
```typescript
// 组件 A
effect(() => { /* ... */ });

// 组件 B
effect(() => { /* ... */ });

// 组件销毁时，如何清理？
// 需要保存每个 effect 的 stop 函数，很麻烦！
```

**EffectScope 解决方案**:
```typescript
const scope = effectScope(() => {
  // 在这个作用域内创建的所有 effect
  effect(() => { /* ... */ });
  effect(() => { /* ... */ });
  effect(() => { /* ... */ });
});

// 一个调用，清理所有
scope();
```

**内部机制**:
```typescript
function effectScope(fn) {
  const scopeNode = { deps: [], subs: [] };
  
  // 设置当前作用域
  const prevScope = setCurrentScope(scopeNode);
  
  try {
    fn();  // 在此作用域内执行
  } finally {
    setCurrentScope(prevScope);
  }
  
  // 返回清理函数
  return () => {
    // 清理此作用域内的所有 effect
    scopeNode.subs.forEach(sub => sub.stop());
  };
}
```

---

## 🚀 性能优化策略

### 1. 减少不必要的 Computed

```typescript
// ❌ 不推荐：过度使用 computed
const a = signal(0);
const b = computed(() => a.get());
const c = computed(() => b.get());
const d = computed(() => c.get());
const e = computed(() => d.get());

// ✅ 推荐：简化结构
const a = signal(0);
const result = computed(() => {
  // 直接基于 a 计算
  return a.get() * 2 + 1;
});
```

### 2. 精确追踪依赖

```typescript
// ❌ 不推荐：追踪整个对象
const store = signal({ a: 1, b: 2, c: 3 });
effect(() => {
  const all = store.get();  // 追踪整个对象
  console.log(all.a);
});

// ✅ 推荐：精确追踪
const a = signal(1);
effect(() => {
  console.log(a.get());  // 只追踪 a
});
```

### 3. 利用惰性求值

```typescript
const expensive = computed(() => {
  // 昂贵计算
  return heavyComputation();
});

// 不调用 get()，不会执行
// console.log(expensive.get()); // 才会触发
```

---

## 🎓 学习路径

### 初学者路径

```
第 1 步：理解 Signal
  ↓
  创建一个 signal，尝试 set/get
  
第 2 步：理解 Computed
  ↓
  基于 signal 创建 computed，观察自动更新
  
第 3 步：理解 Effect
  ↓
  创建 effect，观察自动执行
  
第 4 步：理解依赖追踪
  ↓
  修改依赖，观察传播过程
  
第 5 步：实践项目
  ↓
  用 signals 实现计数器、待办列表等
```

### 进阶路径

```
第 1 步：深入 Push-Pull 模型
  ↓
  阅读 ARCHITECTURE-GUIDE.md
  
第 2 步：性能优化
  ↓
  阅读 PERFORMANCE-GUIDE.md
  
第 3 步：最佳实践
  ↓
  阅读 CODING-STANDARDS.md
  
第 4 步：问题排查
  ↓
  阅读 TROUBLESHOOTING-GUIDE.md
  
第 5 步：源码阅读
  ↓
  阅读 src/index.ts 实现
```

---

## 📊 与其他框架对比

### vs Vue Reactivity

| 特性 | Vue | @type-dom/signals | 说明 |
|------|-----|-------------------|------|
| 基础 API | ref/reactive | signal | 类似 |
| 计算属性 | computed | computed | 几乎一样 |
| 副作用 | watchEffect | effect | 几乎一样 |
| 依赖追踪 | Proxy | 显式 get() | Signals 更透明 |
| 批量更新 | nextTick | batch | 类似 |
| 作用域 | effectScope | effectScope | 一样 |

### vs SolidJS Signals

| 特性 | SolidJS | @type-dom/signals | 说明 |
|------|---------|-------------------|------|
| 基础 API | createSignal | signal | 类似 |
| 计算属性 | createMemo | computed | 类似 |
| 副作用 | createEffect | effect | 类似 |
| 更新机制 | Fine-grained | Push-Pull | 不同实现 |

---

## 💡 常见误区

### 误区 1: 把 Signal 当普通变量

```typescript
// ❌ 错误
const count = signal(0);
count.get() + 1;  // 只是读取，没有响应式

// ✅ 正确
effect(() => {
  console.log(count.get());  // 在 effect 中读取，建立依赖
});
```

### 误区 2: 直接修改对象

```typescript
// ❌ 错误
const state = signal({ count: 0 });
state.get().count++;  // 不会触发更新

// ✅ 正确
state.update(s => ({ ...s, count: s.count + 1 }));
```

### 误区 3: Effect 中异步

```typescript
// ❌ 错误
effect(async () => {
  const data = await fetch();  // 不会追踪依赖
});

// ✅ 正确
const data = signal(null);
effect(() => {
  fetch().then(d => data.set(d));  // 在外部处理
});
```

---

## 🎯 总结

### 核心要点

1. **Signal** = 智能变量，变化时通知订阅者
2. **Computed** = 智能公式，自动更新且缓存
3. **Effect** = 自动观察者，依赖变化时执行
4. **Push-Pull** = 先标记后计算，避免重复
5. **Batch** = 合并多次更新，一次通知

### 最佳实践

1. ✅ 选择合适的 API（signal/computed/effect）
2. ✅ 精确追踪依赖
3. ✅ 及时清理资源
4. ✅ 使用批量更新
5. ✅ 避免常见误区

---

## 📚 相关文档

- [`AI-README.md`](./AI-README.md) - 总索引
- [`SIGNALS-API-GUIDE.md`](./SIGNALS-API-GUIDE.md) - API 参考
- [`ARCHITECTURE-GUIDE.md`](./ARCHITECTURE-GUIDE.md) - 架构详解
- [`PERFORMANCE-GUIDE.md`](./PERFORMANCE-GUIDE.md) - 性能优化
- [`TROUBLESHOOTING-GUIDE.md`](./TROUBLESHOOTING-GUIDE.md) - 问题排查

---

**版本**: v1.0  
**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License
