# TypeDOM Signals - 快速参考卡片

> ⚡ **Signals API 速查表**  
> 📇 一页纸掌握所有核心 API

---

## 🎯 核心 API 速览

### 基础 Signals

| API | 用途 | 示例 |
|-----|------|------|
| `signal<T>(value)` | 创建响应式信号 | `const count = signal(0)` |
| `computed<T>(fn)` | 创建计算属性 | `const double = computed(() => count.get() * 2)` |
| `effect(fn)` | 创建副作用 | `effect(() => console.log(count.get()))` |
| `watch(src, cb)` | 监听变化 | `watch(count, (v) => console.log(v))` |

### Effect Scope

| API | 用途 | 示例 |
|-----|------|------|
| `effectScope(fn)` | 创建作用域 | `const scope = effectScope(() => { ... })` |
| `scope()` | 停止作用域 | `scope()` |

### 批量更新

| API | 用途 | 示例 |
|-----|------|------|
| `startBatch()` | 开始批量 | `startBatch()` |
| `endBatch()` | 结束批量 | `endBatch()` |
| `batch(fn)` | 批量执行 | `batch(() => { a.set(1); b.set(2); })` |

### 工具函数

| API | 用途 | 示例 |
|-----|------|------|
| `isSignal(x)` | 判断 signal | `isSignal(count)` → true |
| `isComputed(x)` | 判断 computed | `isComputed(double)` → true |
| `isEffect(fn)` | 判断 effect | `isEffect(effectFn)` → true |
| `getActiveSub()` | 获取活跃订阅者 | `const sub = getActiveSub()` |
| `getCurrentScope()` | 获取当前作用域 | `const scope = getCurrentScope()` |

---

## 💻 常用模式速查

### 1. 基础状态管理

```typescript
import { signal, computed, effect } from '@type-dom/signals';

// 创建状态
const count = signal(0);

// 读取/设置
count.get();   // 0
count.set(5);

// 更新
count.update(v => v + 1);

// 派生状态
const double = computed(() => count.get() * 2);

// 响应式副作用
effect(() => {
  console.log('Count:', count.get());
});
```

### 2. 计算属性链

```typescript
const src = signal(0);
const c1 = computed(() => src.get() % 2);
const c2 = computed(() => c1.get());
const c3 = computed(() => c2.get());

c3.get(); // 自动追踪整个依赖链
```

### 3. 批量更新优化

```typescript
import { batch } from '@type-dom/signals';

// 多次更新，一次通知
batch(() => {
  a.set(1);
  b.set(2);
  c.set(3);
}); // 只触发 1 次 effect
```

### 4. 作用域管理

```typescript
import { effectScope } from '@type-dom/signals';

const scope = effectScope(() => {
  effect(() => { /* ... */ });
  effect(() => { /* ... */ });
});

// 清理所有副作用
scope();
```

### 5. 条件依赖

```typescript
const flag = signal(true);
const a = signal(1);
const b = signal(2);

const result = computed(() => {
  return flag.get() ? a.get() : b.get();
});

// 动态切换依赖
flag.set(false); // 依赖从 a 切换到 b
```

---

## 🚀 性能优化速查

### DO ✅

```typescript
// ✅ 使用 computed 缓存
const double = computed(() => count.get() * 2);

// ✅ 精确追踪依赖
effect(() => specificProp.get());

// ✅ 批量更新
batch(() => {
  a.set(1);
  b.set(2);
});

// ✅ 及时清理
const scope = effectScope(() => { /* ... */ });
scope.stop();
```

### DON'T ❌

```typescript
// ❌ 直接修改对象
state.get().count++;

// ✅ 正确：创建新对象
state.update(s => ({ ...s, count: s.count + 1 }));

// ❌ effect 中异步
effect(async () => await fetch());

// ✅ 正确：在外部处理
effect(() => {
  fetch().then(d => data.set(d));
});

// ❌ 循环依赖
const a = computed(() => b.get());
const b = computed(() => a.get());
```

---

## 🔍 常见问题速查

### Q1: Effect 不执行？

**检查**:
- [ ] 是否在 effect 中读取了 signal？
- [ ] effect 是否被 stop() 了？
- [ ] 作用域是否已清理？

**解决**:
```typescript
// 确保读取 signal
effect(() => {
  count.get(); // ← 必须读取
});
```

### Q2: Computed 不更新？

**检查**:
- [ ] 依赖的 signal 是否真的变化？
- [ ] 是否调用了 get()？
- [ ] 值相同不会触发更新

**解决**:
```typescript
const c = computed(() => count.get());
c.get(); // ← 必须调用 get()
```

### Q3: 无限循环？

**原因**: Effect 中修改自身依赖

**解决**:
```typescript
// ❌ 错误
effect(() => {
  count.set(count.get() + 1); // 无限循环！
});

// ✅ 正确：移除修改
effect(() => {
  console.log(count.get());
});
```

---

## 📊 性能基准参考

| 场景 | 目标值 | 说明 |
|------|-------|------|
| createSignals | < 3ms/1000 个 | 信号创建速度 |
| cellx1000 | < 15ms | 1000 个单元格计算 |
| molBench | < 700ms | 复杂场景基准 |
| updateSignals | < 900ms | 更新传播速度 |

---

## 🎨 BEM 命名速查 (如果使用)

```typescript
import { useNamespace } from '@type-dom/hooks';

setup() {
  const ns = useNamespace('button');
  
  ns.b()      // 'td-button'
  ns.m('primary')  // 'td-button--primary'
  ns.e('icon')     // 'td-button__icon'
  ns.em('icon', 'large') // 'td-button__icon--large'
}
```

---

## 🧪 测试命令速查

```bash
# 运行测试
nx test signals

# 生成覆盖率
nx test signals --coverage

# 查看报告
open coverage/index.html

# 运行特定测试
nx test signals --testFile=computed.spec.ts
```

---

## 📚 完整文档索引

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| [`AI-README.md`](./AI-README.md) | 总索引 | 5 分钟 |
| [`SIGNALS-API-GUIDE.md`](./SIGNALS-API-GUIDE.md) | 完整 API | 30 分钟 |
| [`ARCHITECTURE-GUIDE.md`](./ARCHITECTURE-GUIDE.md) | 架构详解 | 25 分钟 |
| [`CODING-STANDARDS.md`](./CODING-STANDARDS.md) | 编码规范 | 20 分钟 |
| [`TESTING-GUIDE.md`](./TESTING-GUIDE.md) | 测试指南 | 20 分钟 |
| [`PERFORMANCE-GUIDE.md`](./PERFORMANCE-GUIDE.md) | 性能优化 | 20 分钟 |
| [`TROUBLESHOOTING-GUIDE.md`](./TROUBLESHOOTING-GUIDE.md) | 问题排查 | 15 分钟 |

---

## 🔗 快速链接

### 项目资源
- [源码](../src/index.ts)
- [测试用例](../tests/)
- [README](../README.md)

### 相关库文档
- [Framework 文档](../../framework/AI-DOCS/AI-README.md)
- [Hooks 文档](../../hooks/AI-DOCS/AI-README.md)
- [UI 组件文档](../../ui/AI-DOCS/AI-README.md)

---

**版本**: v1.0  
**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License
