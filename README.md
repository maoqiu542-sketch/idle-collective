# Idle Collective

Idle Collective 是一个轻量自治聚落挂机规划游戏。玩家负责阶段目标和优先级，角色自动执行具体工作，围绕资源、招募、科技、Boss 和升级回流形成主循环。

## 从哪里开始看

- 项目文档入口：[docs/README.md](./docs/README.md)
- 当前权威策划版本：[docs/v1/README.md](./docs/v1/README.md)
- Sprint 1 计划：[production/sprints/sprint-1.md](./production/sprints/sprint-1.md)
- V1 Demo 里程碑：[production/milestones/v1-demo.md](./production/milestones/v1-demo.md)
- Demo QA 清单：[production/qa/demo-checklist.md](./production/qa/demo-checklist.md)
- 外部试玩说明：[docs/试玩说明.md](./docs/试玩说明.md)

## 本地开发

```powershell
npm install
npm run dev
```

如果需要同时启动 Electron 桌面窗口：

```powershell
npm run dev:electron
```

## 构建与试玩

```powershell
npm run package
& ".\release\win-unpacked\Idle Collective.exe"
```

## 常用命令

- `npm run dev`：启动 Vite 开发服务
- `npm run dev:electron`：启动 Electron 与前端联调
- `npm run build`：构建前端和 Electron 主进程
- `npm run package`：生成 Windows 桌面试玩包
- `npm run test:run`：运行自动化测试
- `npm run typecheck`：执行 TypeScript 类型检查
- `npm run lint`：运行 ESLint
- `npm run sync:config`：同步配置文件

## 说明

- `docs/v1/` 是当前唯一有效的产品与系统设计入口。
- `production/` 用于维护 Sprint、里程碑、QA 和过程记录。
- `dist/`、`release/`、压缩包和便携版目录属于构建产物，不作为开发基线维护对象。
