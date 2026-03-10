# 角色事件优先级系统实施计划

> 基于 `d:\GameDesign\Notes\角色事件优先级系统设计.md` 设计文档

---

## 一、实施阶段概览

```
阶段1: 类型系统与数据结构 (Day 1)
    ├── 定义需求类型 (NeedType)
    ├── 定义任务类型 (TaskType)  
    ├── 定义优先级枚举 (Priority)
    └── 定义核心接口 (Character, Task, Need)

阶段2: 需求系统 (Day 2)
    ├── NeedManager 类
    ├── 需求衰减逻辑
    └── 需求阈值检测

阶段3: 效用评估器 (Day 3)
    ├── UtilityEvaluator 类
    ├── 效用计算公式实现
    └── 距离/技能/需求系数

阶段4: 任务调度器 (Day 4)
    ├── TaskScheduler 类
    ├── 优先级队列
    ├── 任务中断机制
    └── 任务预留机制

阶段5: 行为执行器 (Day 5)
    ├── ActionExecutor 类
    ├── 任务分解为行为
    └── 行为执行状态机

阶段6: 系统集成 (Day 6)
    ├── 与现有 DecisionMaker 整合
    ├── 与 CharacterManager 整合
    └── 与 Game 主循环整合
```

---

## 二、文件结构规划

```
src/
├── types/
│   └── priority.types.ts        # 新增: 优先级系统类型定义
│
├── domain/
│   ├── character/
│   │   ├── CharacterManager.ts  # 修改: 集成需求系统
│   │   └── NeedManager.ts       # 新增: 需求管理器
│   │
│   ├── ai/
│   │   ├── DecisionMaker.ts     # 修改: 使用新调度器
│   │   ├── TaskScheduler.ts     # 新增: 任务调度器
│   │   ├── UtilityEvaluator.ts  # 新增: 效用评估器
│   │   └── ActionExecutor.ts    # 新增: 行为执行器
│   │
│   └── task/
│       ├── TaskManager.ts       # 新增: 任务管理器
│       └── TaskFactory.ts       # 新增: 任务工厂
│
└── config/
    └── priority-config.json     # 新增: 优先级配置
```

---

## 三、技术需求清单

### 3.1 类型定义需求

| 类型 | 描述 | 优先级 |
|------|------|--------|
| `NeedType` | 需求类型枚举 (饥饿、休息等) | P0 |
| `Priority` | 优先级枚举 (1-4级) | P0 |
| `TaskType` | 任务类型枚举 | P0 |
| `TaskStatus` | 任务状态枚举 | P0 |
| `Need` | 需求数据接口 | P0 |
| `Task` | 任务数据接口 | P0 |
| `WorkPriority` | 工作优先级设置接口 | P1 |
| `CharacterTrait` | 角色特质接口 | P2 |

### 3.2 核心类需求

| 类名 | 职责 | 方法数 | 优先级 |
|------|------|--------|--------|
| `NeedManager` | 管理角色需求 | 5 | P0 |
| `UtilityEvaluator` | 计算任务效用值 | 4 | P0 |
| `TaskScheduler` | 任务调度与中断 | 6 | P0 |
| `ActionExecutor` | 执行具体行为 | 5 | P0 |
| `TaskManager` | 管理全局任务 | 8 | P1 |
| `TaskFactory` | 创建任务实例 | 4 | P1 |

### 3.3 配置文件需求

| 配置 | 描述 | 优先级 |
|------|------|--------|
| `TASK_BASE_UTILITY` | 任务类型基础效用值 | P0 |
| `NEED_WEIGHTS` | 需求权重配置 | P0 |
| `DEFAULT_WORK_PRIORITIES` | 默认工作优先级 | P1 |
| `URGENCY_MULTIPLIER` | 紧急任务乘数 | P1 |

---

## 四、实施详细步骤

### 阶段1: 类型系统 (预计 2 小时)

**步骤 1.1**: 创建 `src/types/priority.types.ts`

```typescript
// 需要定义的核心类型
export enum Priority { URGENT = 1, HIGH = 2, NORMAL = 3, LOW = 4 }
export enum NeedType { HUNGER, REST, COMFORT, JOY, SAFETY, SOCIAL }
export enum TaskType { FIREFIGHT, PATIENT, RESCUE, EAT, SLEEP, ... }
export enum TaskStatus { PENDING, RESERVED, IN_PROGRESS, ... }
```

**步骤 1.2**: 定义接口

```typescript
export interface Need { type: NeedType; currentValue: number; ... }
export interface Task { id: string; type: TaskType; priority: Priority; ... }
export interface WorkPriority { taskType: TaskType; priority: number; }
```

**验收标准**:
- [ ] 所有枚举定义完整
- [ ] 接口字段与设计文档一致
- [ ] TypeScript 编译通过

---

### 阶段2: 需求系统 (预计 3 小时)

**步骤 2.1**: 创建 `NeedManager` 类

```typescript
export class NeedManager {
  private needs: Map<NeedType, Need>;
  
  update(deltaTime: number): void;
  getNeed(type: NeedType): Need | undefined;
  getCriticalNeeds(): Need[];
  satisfyNeed(type: NeedType, amount: number): void;
}
```

**步骤 2.2**: 实现需求衰减

```typescript
// 每帧更新需求值
update(deltaTime: number): void {
  for (const need of this.needs.values()) {
    need.currentValue = Math.max(0, need.currentValue - need.decayRate * deltaTime);
  }
}
```

**步骤 2.3**: 集成到 `CharacterManager`

```typescript
// 在 Character 数据中添加 needs 字段
// 在 CharacterManager.update() 中调用 needManager.update()
```

**验收标准**:
- [ ] 需求值随时间衰减
- [ ] 临界需求检测正确
- [ ] 与角色系统集成

---

### 阶段3: 效用评估器 (预计 3 小时)

**步骤 3.1**: 创建 `UtilityEvaluator` 类

```typescript
export class UtilityEvaluator {
  calculate(task: Task, character: Character): number;
  
  private calculateNeedMultiplier(task: Task, character: Character): number;
  private calculateDistanceFactor(task: Task, character: Character): number;
  private calculateSkillFactor(task: Task, character: Character): number;
}
```

**步骤 3.2**: 实现效用计算公式

```typescript
calculate(task: Task, character: Character): number {
  let utility = TASK_BASE_UTILITY[task.type];
  utility *= this.calculateNeedMultiplier(task, character);
  utility *= this.calculateDistanceFactor(task, character);
  if (task.isUrgent) utility *= URGENCY_MULTIPLIER;
  utility *= this.calculateSkillFactor(task, character);
  return utility;
}
```

**验收标准**:
- [ ] 效用值计算正确
- [ ] 需求影响效用值
- [ ] 距离影响效用值

---

### 阶段4: 任务调度器 (预计 4 小时)

**步骤 4.1**: 创建 `TaskScheduler` 类

```typescript
export class TaskScheduler {
  private queue: PriorityQueue;
  private evaluator: UtilityEvaluator;
  
  update(deltaTime: number): void;
  findAndAssignTask(): void;
  shouldInterruptCurrentTask(): boolean;
  interruptCurrentTask(): void;
}
```

**步骤 4.2**: 实现优先级队列

```typescript
// 按优先级 + 效用值排序
scoredTasks.sort((a, b) => {
  if (a.task.priority !== b.task.priority) {
    return a.task.priority - b.task.priority;
  }
  return b.utility - a.utility;
});
```

**步骤 4.3**: 实现中断机制

```typescript
shouldInterruptCurrentTask(): boolean {
  // 检查是否有更高优先级任务
  // 检查是否有临界需求
}
```

**验收标准**:
- [ ] 任务按优先级排序
- [ ] 高优先级任务可中断低优先级
- [ ] 临界需求触发中断

---

### 阶段5: 行为执行器 (预计 3 小时)

**步骤 5.1**: 创建 `ActionExecutor` 类

```typescript
export class ActionExecutor {
  private actionQueue: Action[];
  private currentAction: Action | null;
  
  execute(task: Task): void;
  update(deltaTime: number): void;
  private decomposeTaskToActions(task: Task): Action[];
}
```

**步骤 5.2**: 实现任务分解

```typescript
decomposeTaskToActions(task: Task): Action[] {
  const actions: Action[] = [];
  actions.push(new MoveToAction(task.target.position));
  
  switch (task.type) {
    case TaskType.EAT:
      actions.push(new PickupAction(task.target));
      actions.push(new EatAction());
      break;
    // ...
  }
  return actions;
}
```

**验收标准**:
- [ ] 任务正确分解为行为序列
- [ ] 行为按顺序执行
- [ ] 行为失败处理

---

### 阶段6: 系统集成 (预计 4 小时)

**步骤 6.1**: 修改 `Game.ts`

```typescript
// 添加 TaskManager 实例
// 在 update() 中调用 taskScheduler.update()
```

**步骤 6.2**: 修改 `DecisionMaker.ts`

```typescript
// 使用新的 TaskScheduler 替代原有逻辑
// 保留原有规则，但使用效用评估
```

**步骤 6.3**: 更新 UI

```typescript
// 显示角色当前需求
// 显示任务优先级
// 显示效用值
```

**验收标准**:
- [ ] 角色按优先级执行任务
- [ ] 紧急任务正确中断
- [ ] UI 显示正确

---

## 五、测试计划

### 5.1 单元测试

| 测试项 | 测试内容 | 优先级 |
|--------|----------|--------|
| `NeedManager.test.ts` | 需求衰减、临界检测 | P0 |
| `UtilityEvaluator.test.ts` | 效用计算正确性 | P0 |
| `TaskScheduler.test.ts` | 任务排序、中断逻辑 | P0 |

### 5.2 集成测试

| 测试场景 | 预期行为 |
|----------|----------|
| 角色饥饿时自动寻找食物 | 饥饿需求低于阈值 → 生成进食任务 → 执行 |
| 火灾时中断当前工作 | 检测到火灾 → 中断建造任务 → 执行灭火 |
| 多个角色竞争同一任务 | 任务预留机制生效 → 只有一个角色执行 |

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 性能问题 (大量任务计算) | 中 | 使用缓存、限制计算频率 |
| 任务死锁 | 高 | 添加超时机制、任务失败处理 |
| 状态同步问题 | 中 | 使用事件驱动更新 |

---

## 七、里程碑

| 里程碑 | 完成标准 | 预计时间 |
|--------|----------|----------|
| M1: 类型系统完成 | 类型定义编译通过 | Day 1 |
| M2: 需求系统完成 | 需求衰减正常运行 | Day 2 |
| M3: 调度器完成 | 任务按优先级执行 | Day 4 |
| M4: 系统集成完成 | 所有功能正常运行 | Day 6 |

---

*创建时间: 2026年3月9日*
*预计完成: 2026年3月15日*
