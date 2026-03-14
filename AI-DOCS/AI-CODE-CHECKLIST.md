# TypeDOM Signals - AI 代码检查清单

> ✅ **代码质量自检清单**  
> 📋 确保每次提交都符合最佳实践

---

## 📖 使用说明

### 适用场景

- ✅ 提交代码前自检
- ✅ Code Review 准备
- ✅ 重构后验证
- ✅ 学习最佳实践

### 使用方法

1. **开发完成后**：逐项检查本清单
2. **发现问题**：立即修复
3. **全部通过**：提交代码
4. **定期回顾**：更新清单内容

---

## 🏗️ 架构检查清单

### Class + Reactive Pattern

- [ ] 是否使用 `signal/computed/effect` 进行状态管理？
- [ ] 是否避免了直接修改对象/数组内部值？
- [ ] 是否正确使用了 `effectScope` 管理生命周期？
- [ ] 是否避免了在 effect 中执行异步操作？

```typescript
// ✅ 正确示例
const count = signal(0);
const double = computed(() => count.get() * 2);

effect(() => {
  console.log(count.get());
});

// ❌ 错误示例
let count = 0; // 不是响应式
this.count = 0; // Vue 思维，不适用
```

### Push-Pull 模型遵守

- [ ] 是否理解并遵循了 Push-Pull 更新机制？
- [ ] 是否避免了不必要的计算属性？
- [ ] 是否精确追踪了需要的依赖？
- [ ] 是否避免了过长的计算链？

```typescript
// ✅ 推荐：精确追踪
effect(() => specificProp.get());

// ❌ 不推荐：追踪整个对象
effect(() => store.getAll());
```

---

## 🔤 命名规范检查清单

### 变量命名

- [ ] Signal 变量名是否清晰表达含义？
- [ ] Computed 变量名是否体现派生关系？
- [ ] Effect 函数名是否体现副作用目的？

```typescript
// ✅ 推荐
const count = signal(0);
const doubleCount = computed(() => count.get() * 2);
const logEffect = effect(() => console.log(count.get()));

// ❌ 不推荐
const s = signal(0); // 含义不明
const c = computed(() => s.get() * 2); // 含义不明
```

### 类型定义

- [ ] 是否使用了 TypeScript 类型注解？
- [ ] 泛型参数是否正确指定？
- [ ] 返回值类型是否明确？

```typescript
// ✅ 推荐
const count: Signal<number> = signal(0);
const double = computed<number>(() => count.get() * 2);

// ❌ 不推荐（丢失类型信息）
const count = signal(); // undefined 类型
const double = computed(() => count.get()); // any 类型
```

---

## 💻 代码质量检查清单

### 函数设计

- [ ] 单个函数是否 < 50 行？
- [ ] 函数职责是否单一？
- [ ] 参数是否 ≤ 3 个？
- [ ] 是否有完整的 JSDoc 注释？

```typescript
/**
 * 创建计数器信号
 * @param initialValue - 初始值
 * @returns 包含 count 和 increment 的对象
 */
function createCounter(initialValue: number = 0) {
  const count = signal(initialValue);
  const increment = () => count.update(v => v + 1);
  return { count, increment };
}
```

### 类设计

- [ ] 类的属性是否 ≤ 10 个？（V8 优化要求）
- [ ] 方法职责是否清晰？
- [ ] 是否正确使用了继承？

```typescript
// ✅ 推荐：精简的类（7 个属性）
export class Signal<T = unknown> {
  pendingValue: T | undefined;      // 1
  currentValue: T | undefined;      // 2
  subs?: Link;                      // 3
  subsTail?: Link;                  // 4
  flags: ReactiveFlags;             // 5
  
  constructor(initialValue?: T) { /* ... */ }
  get() { /* ... */ }
  set(value: T): void { /* ... */ }
}

// ❌ 不推荐：过多的属性
class TooManyProperties {
  prop1: any; prop2: any; prop3: any;
  prop4: any; prop5: any; prop6: any;
  prop7: any; prop8: any; prop9: any;
  prop10: any; prop11: any; // 超出 V8 优化范围
}
```

### 依赖管理

- [ ] 是否及时清理了不再需要的 effect？
- [ ] 是否正确使用了 `effectScope`？
- [ ] 是否避免了循环依赖？

```typescript
// ✅ 推荐：及时清理
const scope = effectScope(() => {
  effect(() => { /* ... */ });
});

// 组件卸载时
scope(); // 清理所有副作用

// ❌ 错误：循环依赖
const a = computed(() => b.get());
const b = computed(() => a.get()); // 无限循环！
```

---

## 🧪 测试检查清单

### 单元测试覆盖

- [ ] 是否为公共 API 编写了测试？
- [ ] 测试覆盖率是否 ≥ 90%？
- [ ] 是否覆盖了正常流程？
- [ ] 是否覆盖了边界情况？
- [ ] 是否覆盖了错误处理？

```typescript
describe('signal', () => {
  test('应该创建信号', () => {
    const count = signal(0);
    expect(count.get()).toBe(0);
  });
  
  test('应该触发 effect', () => {
    const count = signal(0);
    let calls = 0;
    
    effect(() => {
      calls++;
      count.get();
    });
    
    expect(calls).toBe(1);
    
    count.set(1);
    expect(calls).toBe(2);
  });
  
  test('相同值不应该触发更新', () => {
    const count = signal(0);
    let calls = 0;
    
    effect(() => {
      calls++;
      count.get();
    });
    
    count.set(0); // 相同值
    expect(calls).toBe(1); // 不会增加
  });
});
```

### 性能测试

- [ ] 是否编写了性能基准测试？
- [ ] 性能是否达标？
  - createSignals < 3ms/1000 个
  - cellx1000 < 15ms
  - molBench < 700ms

```typescript
test('performance: create 1000 signals', () => {
  const start = performance.now();
  
  const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
  
  const end = performance.now();
  expect(end - start).toBeLessThan(10); // < 10ms
});
```

---

## ⚡ 性能优化检查清单

### 计算优化

- [ ] 是否使用了 `computed` 缓存计算结果？
- [ ] 是否避免了重复计算？
- [ ] 是否利用了惰性求值？

```typescript
// ✅ 推荐：使用 computed 缓存
const double = computed(() => count.get() * 2);
double.get(); // 计算一次
double.get(); // 使用缓存

// ❌ 不推荐：重复计算
const getDouble = () => count.get() * 2; // 每次都计算
```

### 批量更新

- [ ] 多次更新是否使用了 `batch`？
- [ ] 是否避免了频繁的单独更新？

```typescript
// ✅ 推荐：批量更新
batch(() => {
  a.set(1);
  b.set(2);
  c.set(3);
}); // 只触发 1 次通知

// ❌ 不推荐：多次单独更新
a.set(1); // 触发通知
b.set(2); // 触发通知
c.set(3); // 触发通知
```

### 依赖追踪优化

- [ ] 是否精确追踪了需要的属性？
- [ ] 是否避免了追踪整个大对象？

```typescript
// ✅ 推荐：精确追踪
const count = signal(0);
effect(() => count.get());

// ❌ 不推荐：追踪整个对象
const state = signal({ count: 0 });
effect(() => state.get()); // 追踪整个对象
```

---

## 🛡️ 类型安全检查清单

### TypeScript 类型

- [ ] 是否启用了严格模式？
- [ ] 是否避免了 `any` 类型？
- [ ] 是否正确使用了泛型？
- [ ] 联合类型是否明确？

```typescript
// ✅ 推荐：明确的类型
const nullable: Signal<string | null> = signal(null);
const maybe: Signal<number | undefined> = signal(undefined);

// ❌ 不推荐：使用 any
const bad: Signal<any> = signal(null); // 丢失类型安全
```

### 空值处理

- [ ] 是否正确处理了 `null` 和 `undefined`？
- [ ] 是否使用了可选链？
- [ ] 是否正确使用了类型守卫？

```typescript
// ✅ 推荐：安全的空值处理
const value = signal<string | null>(null);
if (value.get() !== null) {
  console.log(value.get().length);
}

// ❌ 不推荐：可能的空指针
const value = signal<string | null>(null);
console.log(value.get().length); // 可能崩溃！
```

---

## 🔒 最佳实践检查清单

### 响应式模式

- [ ] 基础状态 → 使用 `signal`
- [ ] 派生状态 → 使用 `computed`
- [ ] 副作用 → 使用 `effect`
- [ ] 精细控制 → 使用 `watch`

```typescript
// ✅ 推荐：选择合适的 API
const count = signal(0);                    // 基础状态
const double = computed(() => count.get() * 2);  // 派生状态
effect(() => console.log(count.get()));     // 副作用
```

### 资源管理

- [ ] 定时器是否清理？
- [ ] 事件监听器是否移除？
- [ ] Effect 作用域是否停止？

```typescript
// ✅ 推荐：完整清理
const scope = effectScope(() => {
  const timer = setInterval(() => {}, 1000);
  
  // onScopeDispose(() => {
  //   clearInterval(timer);
  // });
});

scope.stop(); // 清理所有
```

### 错误处理

- [ ] 是否捕获了可能的异常？
- [ ] 是否提供了友好的错误信息？
- [ ] 是否记录了错误日志？

```typescript
// ✅ 推荐：错误处理
try {
  effect(() => {
    const data = riskyOperation();
    if (!data) throw new Error('Data is required');
  });
} catch (error) {
  console.error('Effect failed:', error);
}
```

---

## 📝 文档检查清单

### 代码注释

- [ ] 是否有完整的 JSDoc 注释？
- [ ] 复杂逻辑是否有说明注释？
- [ ] 公共 API 是否有使用示例？

```typescript
/**
 * 创建计算属性
 * @param getter - 计算函数，接收上一个计算结果作为参数
 * @param setter - 可选的设置函数，使 computed 可写
 * @returns Computed 实例
 * 
 * @example
 * ```typescript
 * const count = signal(0);
 * const double = computed(() => count.get() * 2);
 * ```
 */
export function computed<T>(
  getter: (previousValue?: T) => T,
  setter?: (newValue: T) => void
): Computed<T> {
  // ...
}
```

### 更新日志

- [ ] 是否更新了文档的更新日期？
- [ ] 重大变更是否记录了版本号？
- [ ] 破坏性变更是否有迁移指南？

---

## ✅ 提交前最终检查

### Git 提交规范

- [ ] 提交信息是否符合 Conventional Commits 格式？
- [ ] 是否只提交了相关更改？
- [ ] 是否通过了所有测试？

```bash
# ✅ 推荐：规范的提交信息
git commit -m "feat: add batch update optimization"
git commit -m "fix: resolve circular dependency issue"
git commit -m "docs: update API documentation"
```

### CI/CD 检查

- [ ] 本地测试是否通过？
- [ ] 代码检查是否通过？
- [ ] 构建是否成功？

```bash
# 运行所有检查
nx test signals              # 测试
nx lint signals              # 代码检查
nx build signals             # 构建
```

---

## 🎯 快速评分表

### 自评标准

| 等级 | 标准 | 行动 |
|------|------|------|
| ⭐⭐⭐⭐⭐ | 100% 通过 | 可以直接提交 |
| ⭐⭐⭐⭐ | ≥90% 通过 | 修复问题后提交 |
| ⭐⭐⭐ | ≥80% 通过 | 需要改进 |
| ⭐⭐ | <80% 通过 | 需要重构 |
| ⭐ | <60% 通过 | 重新设计 |

### 检查完成确认

- [ ] 我已逐项检查以上清单
- [ ] 所有必选项都已通过
- [ ] 发现的问题已修复
- [ ] 代码质量符合要求
- [ ] 可以提交代码

---

## 📚 相关文档

- [`AI-README.md`](./AI-README.md) - 总索引
- [`CODING-STANDARDS.md`](./CODING-STANDARDS.md) - 编码规范
- [`TESTING-GUIDE.md`](./TESTING-GUIDE.md) - 测试指南
- [`PERFORMANCE-GUIDE.md`](./PERFORMANCE-GUIDE.md) - 性能优化

---

**版本**: v1.0  
**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License
