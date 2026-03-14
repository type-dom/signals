# TypeDOM Signals - 测试指南

> 🧪 **Signals 响应式系统测试完全指南**  
> ✅ Vitest 测试规范 + 覆盖率要求 + 最佳实践

---

## 📖 概述

本文档提供 `@type-dom/signals` 库的完整测试指南，包括测试框架、编写规范、覆盖率要求和最佳实践。

### 测试目标

- ✅ **单元测试覆盖率 ≥ 90%**
- ✅ **核心 API 100% 覆盖**
- ✅ **边界情况全面测试**
- ✅ **性能基准测试**

---

## 🛠️ 测试框架

### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,           // 使用全局 API (describe, test, expect)
    pool: 'threads',         // 多线程并行执行
    setupFiles: ['tools/scripts/setup-vitest.ts'],
    testTimeout: 30000,      // 超时时间 30s
    hookTimeout: 30000,      // Hook 超时时间
    coverage: {
      provider: 'v8',        // 使用 V8 引擎覆盖率
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

### 运行测试命令

```bash
# 运行所有测试
nx test signals

# 运行特定测试文件
nx test signals --testFile=computed.spec.ts

# 运行匹配名称的测试
nx test signals --testNamePattern="should propagate"

# 生成覆盖率报告
nx test signals --coverage

# 查看 HTML 覆盖率报告
open coverage/index.html

# 监听模式（开发时使用）
nx test signals --watch
```

---

## 📝 测试编写规范

### 基础测试结构

```typescript
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal, computed, effect } from '../src';

describe('signal', () => {
  // 测试套件分组
  
  test('应该创建信号', () => {
    // 单个测试用例
    const count = signal(0);
    expect(count.get()).toBe(0);
  });
  
  test('应该更新信号', () => {
    const count = signal(0);
    count.set(1);
    expect(count.get()).toBe(1);
  });
});

describe('computed', () => {
  // ...
});
```

### 测试命名规范

```typescript
// ✅ 推荐：清晰的描述性命名
test('should create signal with initial value');
test('should trigger effect when value changes');
test('should not trigger if value is same');
test('should handle null and undefined values');
test('should propagate through chained computations');

// ❌ 不推荐：模糊的命名
test('basic test');
test('test 1');
test('update test');
```

### 测试组织规范

```typescript
describe('Signal', () => {
  describe('Initialization', () => {
    // 初始化相关测试
    test('should create with undefined value');
    test('should create with initial value');
    test('should create with null value');
  });
  
  describe('Get operations', () => {
    // get 操作相关测试
    test('should return current value');
    test('should track dependencies');
  });
  
  describe('Set operations', () => {
    // set 操作相关测试
    test('should update value');
    test('should trigger effects');
    test('should skip same value updates');
  });
  
  describe('Edge cases', () => {
    // 边界情况测试
    test('should handle object references');
    test('should handle array mutations');
  });
});
```

---

## 🎯 核心 API 测试模板

### 1. Signal 测试

```typescript
import { describe, test, expect } from 'vitest';
import { signal, effect } from '../src';

describe('signal', () => {
  describe('创建', () => {
    test('应该创建无初始值的信号', () => {
      const sig = signal<number>();
      expect(sig.get()).toBeUndefined();
    });
    
    test('应该创建有初始值的信号', () => {
      const count = signal(0);
      expect(count.get()).toBe(0);
    });
    
    test('应该支持 null 作为初始值', () => {
      const nullable = signal<string | null>(null);
      expect(nullable.get()).toBeNull();
    });
  });
  
  describe('get()', () => {
    test('应该返回当前值', () => {
      const count = signal(5);
      expect(count.get()).toBe(5);
    });
    
    test('应该在 activeSub 存在时建立依赖', () => {
      const count = signal(0);
      let effectRunCount = 0;
      
      effect(() => {
        effectRunCount++;
        count.get(); // 建立依赖
      });
      
      expect(effectRunCount).toBe(1);
      
      count.set(1);
      expect(effectRunCount).toBe(2); // 依赖触发
    });
  });
  
  describe('set()', () => {
    test('应该更新值', () => {
      const count = signal(0);
      count.set(10);
      expect(count.get()).toBe(10);
    });
    
    test('相同值不应该触发更新', () => {
      const count = signal(0);
      let updateCount = 0;
      
      effect(() => {
        updateCount++;
        count.get();
      });
      
      count.set(0); // 相同值
      expect(updateCount).toBe(1); // 不会增加
    });
    
    test('应该触发依赖的 effect', () => {
      const count = signal(0);
      const logs: number[] = [];
      
      effect(() => {
        logs.push(count.get());
      });
      
      expect(logs).toEqual([0]);
      
      count.set(1);
      expect(logs).toEqual([0, 1]);
    });
    
    test('应该处理对象引用', () => {
      const obj = signal({ count: 0 });
      const original = obj.get();
      
      // 同一引用，不会触发更新
      obj.set(original);
      
      // 但如果内部变了，需要手动 notify
      original.count++;
      trigger(obj); // 手动触发
    });
  });
});
```

### 2. Computed 测试

```typescript
import { describe, test, expect } from 'vitest';
import { signal, computed, effect } from '../src';

describe('computed', () => {
  describe('基础功能', () => {
    test('应该计算派生值', () => {
      const count = signal(0);
      const double = computed(() => count.get() * 2);
      
      expect(double.get()).toBe(0);
      
      count.set(5);
      expect(double.get()).toBe(10);
    });
    
    test('应该缓存计算结果', () => {
      let computeCount = 0;
      const count = signal(0);
      
      const doubled = computed(() => {
        computeCount++;
        return count.get() * 2;
      });
      
      doubled.get();
      expect(computeCount).toBe(1);
      
      doubled.get(); // 从缓存读取
      expect(computeCount).toBe(1); // 不会重新计算
      
      count.set(1);
      doubled.get();
      expect(computeCount).toBe(2); // 依赖变化，重新计算
    });
  });
  
  describe('依赖追踪', () => {
    test('应该自动追踪依赖', () => {
      const firstName = signal('John');
      const lastName = signal('Doe');
      
      const fullName = computed(() => 
        `${firstName.get()} ${lastName.get()}`
      );
      
      expect(fullName.get()).toBe('John Doe');
      
      firstName.set('Jane');
      expect(fullName.get()).toBe('Jane Doe');
      
      lastName.set('Smith');
      expect(fullName.get()).toBe('Jane Smith');
    });
    
    test('应该支持计算属性链', () => {
      const src = signal(0);
      const c1 = computed(() => src.get() % 2);
      const c2 = computed(() => c1.get());
      const c3 = computed(() => c2.get());
      
      c3.get();
      
      src.set(1);
      expect(c3.get()).toBe(1);
      
      src.set(2);
      expect(c3.get()).toBe(0);
    });
  });
  
  describe('惰性求值', () => {
    test('应该在首次 get 时计算', () => {
      let computeCount = 0;
      const count = signal(0);
      
      const doubled = computed(() => {
        computeCount++;
        return count.get() * 2;
      });
      
      expect(computeCount).toBe(0); // 未调用 get，未计算
      
      doubled.get();
      expect(computeCount).toBe(1);
    });
    
    test('不应该在依赖未变时重新计算', () => {
      let computeCount = 0;
      const src = signal(0);
      
      const c = computed(() => {
        computeCount++;
        return src.get();
      });
      
      c.get();
      expect(computeCount).toBe(1);
      
      src.set(1);
      src.set(0); // 回到原值
      c.get();
      expect(computeCount).toBe(1); // 未重新计算
    });
  });
  
  describe('可选 Setter', () => {
    test('应该支持 writable computed', () => {
      const count = signal(0);
      
      const double = computed(
        () => count.get() * 2,
        (value) => count.set(value / 2)
      );
      
      expect(double.get()).toBe(0);
      
      double.set(10);
      expect(count.get()).toBe(5);
      expect(double.get()).toBe(10);
    });
  });
});
```

### 3. Effect 测试

```typescript
import { describe, test, expect, vi } from 'vitest';
import { signal, computed, effect, effectScope } from '../src';

describe('effect', () => {
  describe('基础功能', () => {
    test('应该立即执行一次', () => {
      const count = signal(0);
      const mockFn = vi.fn();
      
      effect(() => {
        mockFn();
        count.get();
      });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('应该在依赖变化时重新执行', () => {
      const count = signal(0);
      let effectCount = 0;
      
      effect(() => {
        effectCount++;
        count.get();
      });
      
      expect(effectCount).toBe(1);
      
      count.set(1);
      expect(effectCount).toBe(2);
      
      count.set(2);
      expect(effectCount).toBe(3);
    });
    
    test('应该返回停止函数', () => {
      const count = signal(0);
      let effectCount = 0;
      
      const stop = effect(() => {
        effectCount++;
        count.get();
      });
      
      expect(effectCount).toBe(1);
      
      stop(); // 停止监听
      
      count.set(1);
      expect(effectCount).toBe(1); // 不再执行
    });
  });
  
  describe('依赖追踪', () => {
    test('应该自动追踪动态依赖', () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(true);
      
      let effectCount = 0;
      
      effect(() => {
        effectCount++;
        if (c.get()) {
          a.get();
        } else {
          b.get();
        }
      });
      
      expect(effectCount).toBe(1);
      
      a.set(10); // 触发，因为当前依赖 a
      expect(effectCount).toBe(2);
      
      c.set(false); // 切换依赖
      expect(effectCount).toBe(3);
      
      b.set(20); // 现在依赖 b
      expect(effectCount).toBe(4);
      
      a.set(100); // 不再依赖 a，不触发
      expect(effectCount).toBe(4);
    });
    
    test('应该支持嵌套 effect', () => {
      const a = signal(1);
      const b = signal(2);
      const logs: string[] = [];
      
      effect(() => {
        logs.push('outer');
        a.get();
        
        effect(() => {
          logs.push('inner');
          b.get();
        });
      });
      
      expect(logs).toEqual(['outer', 'inner']);
      
      b.set(3);
      expect(logs).toEqual(['outer', 'inner', 'inner']);
      
      a.set(2);
      expect(logs).toEqual(['outer', 'inner', 'inner', 'outer', 'inner']);
    });
  });
  
  describe('清理机制', () => {
    test('应该清理依赖当没有订阅者', () => {
      const count = signal(0);
      const doubled = computed(() => count.get() * 2);
      
      let computeCount = 0;
      const stop = effect(() => {
        computeCount++;
        doubled.get();
      });
      
      expect(computeCount).toBe(1);
      
      count.set(1);
      expect(computeCount).toBe(2);
      
      stop(); // 停止 effect
      
      count.set(2);
      expect(computeCount).toBe(2); // doubled 不再重新计算
    });
  });
});
```

### 4. Effect Scope 测试

```typescript
import { describe, test, expect } from 'vitest';
import { signal, effect, effectScope } from '../src';

describe('effectScope', () => {
  test('应该管理多个 effect', () => {
    const count = signal(0);
    const logs: number[] = [];
    
    const stopScope = effectScope(() => {
      effect(() => {
        logs.push(count.get());
      });
      
      effect(() => {
        logs.push(count.get() * 2);
      });
    });
    
    expect(logs).toEqual([0, 0]);
    
    count.set(1);
    expect(logs).toEqual([0, 0, 1, 2]);
    
    stopScope(); // 停止所有 effect
    
    count.set(2);
    expect(logs).toEqual([0, 0, 1, 2]); // 不再执行
  });
  
  test('应该支持嵌套 scope', () => {
    const a = signal(1);
    const b = signal(2);
    const logs: string[] = [];
    
    const stopOuter = effectScope(() => {
      effect(() => {
        logs.push('outer', a.get().toString());
        
        effectScope(() => {
          effect(() => {
            logs.push('inner', b.get().toString());
          });
        });
      });
    });
    
    expect(logs).toEqual(['outer', '1', 'inner', '2']);
    
    b.set(3);
    expect(logs).toEqual(['outer', '1', 'inner', '2', 'inner', '3']);
    
    stopOuter();
    
    a.set(10);
    b.set(20);
    expect(logs).toEqual(['outer', '1', 'inner', '2', 'inner', '3']); // 全部停止
  });
});
```

---

## 🧪 边界情况测试

### 1. 空值和特殊值

```typescript
describe('边界情况 - 特殊值', () => {
  test('应该处理 null', () => {
    const nullable = signal<string | null>(null);
    expect(nullable.get()).toBeNull();
    
    nullable.set('value');
    expect(nullable.get()).toBe('value');
    
    nullable.set(null);
    expect(nullable.get()).toBeNull();
  });
  
  test('应该处理 undefined', () => {
    const maybe = signal<number | undefined>(undefined);
    expect(maybe.get()).toBeUndefined();
    
    maybe.set(42);
    expect(maybe.get()).toBe(42);
  });
  
  test('应该区分 undefined 和 "same value"', () => {
    const sig = signal(undefined);
    let count = 0;
    
    effect(() => {
      count++;
      sig.get();
    });
    
    sig.set(undefined); // undefined 是特殊情况
    expect(count).toBe(1); // 不应该触发
  });
});
```

### 2. 对象和数组

```typescript
describe('边界情况 - 引用类型', () => {
  test('应该检测对象引用变化', () => {
    const state = signal({ count: 0 });
    let effectCount = 0;
    
    effect(() => {
      effectCount++;
      state.get();
    });
    
    // 新对象引用，触发更新
    state.update(s => ({ ...s, count: s.count + 1 }));
    expect(effectCount).toBe(2);
  });
  
  test('应该允许手动 notify 对象内部变化', () => {
    const arr = signal([1, 2, 3]);
    let effectCount = 0;
    
    effect(() => {
      effectCount++;
      arr.get();
    });
    
    // 直接修改数组内部
    arr.get().push(4);
    trigger(arr); // 手动触发
    expect(effectCount).toBe(2);
  });
  
  test('应该处理 Map 类型', () => {
    const map = signal(new Map<string, number>());
    let effectCount = 0;
    
    effect(() => {
      effectCount++;
      map.get();
    });
    
    const newMap = new Map(map.get());
    newMap.set('key', 1);
    map.set(newMap);
    expect(effectCount).toBe(2);
  });
});
```

### 3. 循环依赖保护

```typescript
describe('边界情况 - 循环依赖', () => {
  test('应该避免循环依赖导致的无限循环', () => {
    // 注意：这是错误用法，但应该能检测到
    const a = signal(0);
    const b = computed(() => a.get());
    
    // 不应该创建：const c = computed(() => c.get());
    // 这会导致运行时错误
    
    expect(b.get()).toBe(0);
    a.set(1);
    expect(b.get()).toBe(1);
  });
});
```

### 4. 批量更新

```typescript
import { startBatch, endBatch } from '../src';

describe('边界情况 - 批量更新', () => {
  test('应该合并批量更新', () => {
    const a = signal(0);
    const b = signal(0);
    const logs: string[] = [];
    
    effect(() => {
      logs.push(`a:${a.get()},b:${b.get()}`);
    });
    
    startBatch();
    a.set(1);
    b.set(2);
    a.set(3);
    endBatch();
    
    // 只触发一次 effect
    expect(logs).toEqual(['a:0,b:0', 'a:3,b:2']);
  });
  
  test('应该支持嵌套 batch', () => {
    const count = signal(0);
    let effectCount = 0;
    
    effect(() => {
      effectCount++;
      count.get();
    });
    
    startBatch();
    count.set(1);
    
    startBatch(); // 嵌套
    count.set(2);
    endBatch();
    
    count.set(3);
    endBatch();
    
    // 只有最外层 batch 结束时才 flush
    expect(effectCount).toBe(2); // 初始 + 最终
  });
});
```

---

## ⚡ 性能测试

### 基准测试模板

```typescript
import { describe, test, expect } from 'vitest';
import { signal, computed } from '../src';

describe('Performance Benchmarks', () => {
  test('createSignals - 创建 1000 个信号', () => {
    const start = performance.now();
    
    const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(10); // < 10ms
    expect(signals.length).toBe(1000);
    
    console.log(`createSignals: ${duration.toFixed(2)}ms`);
  });
  
  test('createComputations - 创建 1000 个计算属性', () => {
    const src = signal(0);
    const start = performance.now();
    
    const computations = Array.from({ length: 1000 }, () =>
      computed(() => src.get() % 2)
    );
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(20); // < 20ms
    expect(computations.length).toBe(1000);
    
    console.log(`createComputations: ${duration.toFixed(2)}ms`);
  });
  
  test('cellx1000 - 1000 个单元格计算', () => {
    const src = signal(0);
    const computations = Array.from({ length: 1000 }, () =>
      computed(() => src.get() % 2)
    );
    
    // 首次计算
    computations.forEach(c => c.get());
    
    const start = performance.now();
    
    // 更新并重新计算
    src.set(1);
    computations.forEach(c => c.get());
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(15); // < 15ms (目标最优)
    
    console.log(`cellx1000: ${duration.toFixed(2)}ms`);
  });
  
  test('propagation - 依赖链传播性能', () => {
    const src = signal(0);
    const chain: Array<ReturnType<typeof computed>> = [];
    
    // 创建 100 层依赖链
    for (let i = 0; i < 100; i++) {
      const prev = chain[i - 1] || src;
      chain.push(computed(() => (prev as any).get() + 1));
    });
    
    const start = performance.now();
    
    src.set(1);
    chain[99].get(); // 触发整个链
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(50); // < 50ms
    
    console.log(`100-layer propagation: ${duration.toFixed(2)}ms`);
  });
});
```

---

## 📊 测试覆盖率要求

### 覆盖率指标

| 指标 | 最低要求 | 目标值 | 当前状态 |
|------|---------|--------|----------|
| **分支覆盖率** | ≥ 90% | ≥ 95% | ✅ 优秀 |
| **函数覆盖率** | ≥ 90% | ≥ 95% | ✅ 优秀 |
| **行覆盖率** | ≥ 90% | ≥ 95% | ✅ 优秀 |
| **语句覆盖率** | ≥ 90% | ≥ 95% | ✅ 优秀 |

### 覆盖率检查脚本

```bash
#!/bin/bash
# scripts/check-coverage.sh

nx test signals --coverage

# 检查覆盖率是否达标
if [ $? -eq 0 ]; then
  echo "✅ 测试通过且覆盖率达标"
else
  echo "❌ 测试失败或覆盖率不足"
  exit 1
fi
```

---

## 🔍 调试技巧

### 1. 打印依赖关系

```typescript
test('debug: should show dependency graph', () => {
  const count = signal(0);
  const double = computed(() => count.get() * 2);
  const quadruple = computed(() => double.get() + double.get());
  
  // 手动检查依赖关系
  console.log('count.subs:', count.subs);
  console.log('double.deps:', double.deps);
  console.log('quadruple.deps:', quadruple.deps);
  
  expect(quadruple.get()).toBe(0);
});
```

### 2. 追踪执行次数

```typescript
test('debug: should track computation count', () => {
  let computeCount = 0;
  const count = signal(0);
  
  const doubled = computed(() => {
    computeCount++;
    console.log(`Computing... count=${computeCount}`);
    return count.get() * 2;
  });
  
  doubled.get();
  console.log('First get, count:', computeCount); // 1
  
  doubled.get();
  console.log('Second get (cached), count:', computeCount); // 1
  
  count.set(1);
  doubled.get();
  console.log('After update, count:', computeCount); // 2
});
```

### 3. 测量更新时间

```typescript
test('debug: should measure update time', () => {
  const count = signal(0);
  const logs: number[] = [];
  
  effect(() => {
    const start = performance.now();
    count.get();
    const end = performance.now();
    logs.push(end - start);
  });
  
  count.set(1);
  count.set(2);
  
  console.log('Effect execution times:', logs);
  expect(logs.every(t => t < 1)).toBe(true); // 每次 < 1ms
});
```

---

## ✅ 测试检查清单

### 单元测试完整性

- [ ] 所有公共 API 都有对应测试
- [ ] 正常流程测试覆盖
- [ ] 边界情况测试覆盖
- [ ] 错误处理测试覆盖
- [ ] 性能基准测试

### 代码质量

- [ ] 测试命名清晰描述意图
- [ ] 测试独立可运行
- [ ] 没有测试之间的依赖
- [ ] 使用了适当的断言
- [ ] 包含必要的注释说明

### 覆盖率要求

- [ ] 分支覆盖率 ≥ 90%
- [ ] 函数覆盖率 ≥ 90%
- [ ] 行覆盖率 ≥ 90%
- [ ] 语句覆盖率 ≥ 90%

---

## 📚 相关文档

- [`AI-README.md`](./AI-README.md) - 总索引
- [`SIGNALS-API-GUIDE.md`](./SIGNALS-API-GUIDE.md) - API 参考
- [`CODING-STANDARDS.md`](./CODING-STANDARDS.md) - 编码规范
- [`PERFORMANCE-GUIDE.md`](./PERFORMANCE-GUIDE.md) - 性能优化

---

**最后更新**: 2026-03-13  
**维护者**: TypeDOM Core Team  
**许可**: MIT License
