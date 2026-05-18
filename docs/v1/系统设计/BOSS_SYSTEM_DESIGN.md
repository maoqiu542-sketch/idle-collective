# Idle Collective V1 Boss系统设计文档

> **Status**: Draft  
> **Author**: Codex  
> **Last Updated**: 2026-03-28  
> **Implements Pillar**: Boss 是阶段门槛，不抢主循环

## Overview

V1 的 Boss 系统不是独立副本玩法，而是聚落成长的阶段门槛系统。Boss 按固定周期刷新，难度由聚落发展度驱动。玩家挑战 Boss 的核心目的，是获取 `核心零件`，用于建筑升级和科技突破，而不是追求高频刷装。

## Player Fantasy

玩家应感受到：

- “这是我聚落扩张路上的阶段障碍。”
- “我不是为了刷奖励而打 Boss，而是为了突破下一层发展。”
- “当聚落变强后，Boss 也会变强，迫使我重新规划。”

## Detailed Design

### Core Rules

1. Boss 采用定时刷新机制。
2. 每次刷新时，从当前聚落发展度对应的 Boss 难度池中抽取目标。
3. 玩家未挑战时，Boss 保留在入口中。
4. 击败 Boss 的主要奖励为：
   - 核心零件
   - 少量金币
   - 低频辅助装备
5. Boss 难度随聚落发展度提升而上升。
6. Boss 不按固定阶段脚本出现，而按聚落当前状态动态抽取。
7. Boss 是建筑升级与科技突破的重要材料来源。

### Spawn Rules

- 刷新周期：每 30 分钟
- 刷新池由聚落发展度决定
- 玩家未挑战时，Boss 保留，不强制过期

### Difficulty Tiers

#### 发展度 0-29：低阶 Boss

- 对应生存期与初期扩张
- 奖励少量核心零件

#### 发展度 30-69：中阶 Boss

- 对应研究成型与中期扩张
- 奖励中量核心零件

#### 发展度 70-100：高阶 Boss

- 对应 V1 终局推进
- 奖励较多核心零件

### Fight Preparation Logic

Boss 战前的准备主要依赖：

- 战斗属性
- 装备
- 恢复状态
- 备战 Boss 全局策略

Boss 前准备不受 `聚落宜居度` 直接影响。

### Rewards

Boss 奖励优先级：

1. 核心零件
2. 金币
3. 装备

### States and Transitions

| State | Entry Condition | Exit Condition | Behavior |
|-------|----------------|----------------|----------|
| 待刷新 | 刷新计时中 | 计时结束 | 等待生成 |
| 可挑战 | Boss 生成完成 | 玩家进入战斗 | 入口常驻显示 |
| 战斗中 | 玩家发起挑战 | 胜利/失败 | 进入战斗流程 |
| 已击败 | Boss 被击败 | 下次刷新 | 发放奖励并结束 |

### Interactions with Other Systems

| System | Input to Boss | Output from Boss | Responsibility |
|--------|---------------|-----------------|----------------|
| 聚落发展度 | 提供难度池选择依据 | 无 | 决定 Boss 强度 |
| 战斗属性系统 | 提供角色战力 | 胜负判定 | 决定战斗表现 |
| 装备系统 | 提供战斗加成 | 装备掉落 | 辅助战斗成长 |
| 建筑/科技系统 | 提供核心零件消耗入口 | 获得突破材料 | Boss 为成长线供材 |

## Formulas

### Boss 难度池选择

```text
boss_tier =
  1, if development < 30
  2, if 30 <= development < 70
  3, if development >= 70
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| development | int | 0-100 | 聚落发展度 | 当前聚落阶段 |

### Boss 属性缩放

```text
boss_hp = base_hp * (1 + development / 100)
boss_atk = base_atk * (1 + development / 150)
boss_def = base_def * (1 + development / 180)
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| base_hp | int | 200-3000 | Boss 配置 | 基础生命值 |
| base_atk | int | 10-120 | Boss 配置 | 基础攻击 |
| base_def | int | 5-80 | Boss 配置 | 基础防御 |
| development | int | 0-100 | 聚落发展度 | 当前聚落发展度 |

### 核心零件掉落

```text
core_parts_drop = floor(base_drop * (1 + boss_tier * 0.4))
```

| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| base_drop | int | 2-8 | Boss 配置 | 基础掉落量 |
| boss_tier | int | 1-3 | 难度池 | 当前 Boss 难度层 |

## Edge Cases

| Scenario | Expected Behavior | Rationale |
|----------|------------------|-----------|
| 玩家一直不打 Boss | Boss 保留，不强制失败 | 挂机游戏需要宽容 |
| Boss 刷新时聚落发展度变化 | 新 Boss 按最新发展度池计算 | 保持系统一致 |
| 玩家战败 | 保留 Boss，角色进入恢复状态 | 失败制造准备压力，而不是破坏性惩罚 |
| 玩家过强 | Boss 难度随发展度提升 | 避免前期设计被快速跳过 |
| 玩家过弱 | 低阶 Boss 仍提供少量核心零件 | 允许缓慢推进，不让进度断死 |

## Dependencies

| System | Direction | Nature of Dependency |
|--------|-----------|---------------------|
| 核心设计 | This depends on 核心设计 | Boss 是主循环门槛 |
| 聚落发展度 | This depends on 发展度 | 发展度决定难度池 |
| 装备系统 | Boss depends on 装备 | 装备是辅助成长 |
| 科技系统 | 科技 depends on Boss | 核心零件用于突破 |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|-----------|--------------|------------|-------------------|-------------------|
| 刷新周期 | 30 分钟 | 20-40 分钟 | 提高阶段压力 | 提高挂机宽容度 |
| 低阶 Boss 基础零件掉落 | 3 | 2-5 | 加速首个突破 | 减慢前期成长 |
| 中阶 Boss 基础零件掉落 | 5 | 4-7 | 加快中期推进 | 增加卡点感 |
| 高阶 Boss 基础零件掉落 | 8 | 6-10 | 加快 V1 终局节奏 | 延长终局磨损 |

## Acceptance Criteria

- [ ] Boss 以定时方式刷新
- [ ] Boss 难度由聚落发展度决定，而非固定关卡脚本
- [ ] 核心零件是 Boss 的第一奖励
- [ ] 装备掉落为辅助，不会抢走主循环地位
- [ ] 玩家战败后仍可继续准备与再挑战
- [ ] 玩家能清楚感知“聚落变强后 Boss 也在变强”
