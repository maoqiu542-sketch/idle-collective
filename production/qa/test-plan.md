# V1 测试计划

## 目标

验证 `Idle Collective` 当前 V1 主循环是否达到“可试玩 Demo”标准，并尽早发现会阻碍试玩的功能异常、文案回归和状态同步问题。

## 范围

### 自动化检查

- TypeScript 类型检查
- Vitest 单元测试与契约测试
- 前端与 Electron 构建
- Windows 桌面包打包

### 手动冒烟

- 启动游戏并进入主界面
- 核对资源栏、底部策略面板、引导、招募、科技、Boss、存档
- 验证一轮基础闭环：
  - 观察自动执行
  - 建造基础建筑
  - 切换全局策略
  - 等待或触发 Boss
  - 存档并读档

## 优先级

### P0

- 乱码或不可读提示
- 无法启动、构建或打包
- 招募、科技、Boss、存档中任一主链路断裂
- 建筑无法放置、升级或提供核心效果

### P1

- 全局策略与手动优先级互锁失效
- 研究点产出中断
- 建筑地图表现与实际占地不一致
- 建筑说明与真实效果不一致

### P2

- 数值反馈不够明显
- 次级界面文案不统一
- 建筑分工反馈不够直观

## 执行步骤

1. 运行 `npm run typecheck`
2. 运行 `npm run test:run`
3. 运行 `npm run build`
4. 运行 `npm run package`
5. 启动 [Idle Collective.exe](/D:/GameDesign/Projects/idle-collective/release/win-unpacked/Idle%20Collective.exe)
6. 按 [试玩说明](/D:/GameDesign/Projects/idle-collective/docs/试玩说明.md) 执行手动冒烟

## 当前自动化覆盖重点

- 招募刷新与品质
- Boss 刷新与掉落
- 存档版本校验
- 宜居度与发展度公式
- 全局策略与手动优先级互锁
- 研究人员自动分配
- 建造、完工、升级与产出倍率

## 输出

- 自动化命令结果
- 手动冒烟记录
- 已知问题清单
