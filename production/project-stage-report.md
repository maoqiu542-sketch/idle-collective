# Idle Collective 项目阶段诊断报告

**生成日期**：2026-04-17  
**阶段判定**：Production  
**分析范围**：策划视角 / Game Studio `/project-stage-detect designer` 风格  

---

## Executive Summary

`Idle Collective` 当前已经不是概念期或纯技术搭建期，而是处在 **Production** 阶段：项目已有可运行源码、V1 权威策划入口、Sprint / Milestone / QA / Review 等生产资料，并已围绕“轻量自治聚落挂机规划”建立核心系统闭环。

主要问题不在于“是否有内容”，而在于 **Game Studio 标准工作流与项目现有文档结构尚未完全对齐**。当前 `docs/v1` 承担了实际权威策划入口，但标准路径 `design/gdd` 仍为空；`.claude/docs/technical-preferences.md` 也仍显示引擎未配置，和实际技术栈 `React + Vite + TypeScript + Electron` 不一致。下一阶段应优先做文档归档、反向文档化、试玩验收与 Gate 检查，而不是继续扩展新系统。

**当前焦点**：V1 Demo 验收收口、Trade MVP 稳定化、策划文档体系对齐。  
**主要阻塞**：标准 GDD 入口缺失、技术偏好元数据未同步、30-45 分钟完整试玩验收尚未闭环。  
**到下一阶段的建议**：先完成策划体系整理和试玩问题单，再运行 `/gate-check` 判断是否进入 Polish。

---

## Completeness Overview

### 设计文档

- **状态**：约 70% 完整，内容较多但结构未完全标准化。
- **已确认事实**：
  - `docs/v1` 下有 11 份策划 / 系统文档。
  - `docs/v1/系统总表/SYSTEMS_INDEX.md` 已列出 V1 系统范围、依赖关系、实现顺序和风险系统。
  - `design/gdd` 文档数为 0。
  - 标准入口 `design/gdd/game-concept.md` 不存在。
- **关键缺口**：
  - `docs/v1` 是事实上的权威策划入口，但没有映射到 Game Studio 标准 `design/gdd` 结构。
  - `game-concept.md`、`game-pillars.md`、`systems-index.md` 等标准策划入口缺失，影响后续 skills 识别项目状态。
  - 已实现系统和策划文档之间存在“实现先行、文档后补”的风险，需要反向文档化。

### 源码与系统实现

- **状态**：Production 级 active development。
- **已确认事实**：
  - `src` 下约 104 个 TS / TSX / JS 源码文件。
  - `src/domain` 已包含 `ai`、`building`、`character`、`combat`、`equipment`、`intervention`、`inventory`、`map`、`resource`、`save`、`settlement`、`shop`、`technology` 等系统目录。
  - 当前实现覆盖 AI 调度、建筑、角色、资源、招募、科技、Boss、贸易、存档等核心链路。
- **关键缺口**：
  - 从策划视角看，代码系统数量已经超过标准 GDD 入口可解释范围。
  - 需要把已实现系统按 V1 主循环重新归档，避免后续新增功能绕开系统总表。

### 技术与架构元数据

- **状态**：实际已配置，Game Studio 元数据未同步。
- **已确认事实**：
  - `.claude/docs/technical-preferences.md` 仍显示 Engine、Language、Rendering、Testing 为 `[TO BE CONFIGURED]`。
  - 实际项目技术栈为 `React + Vite + TypeScript + Electron`，测试框架为 Vitest。
- **关键缺口**：
  - Game Studio workflow 可能误判项目仍处于 Technical Setup。
  - 后续 agent / skill 可能基于错误引擎假设给出不匹配建议。

### 生产管理

- **状态**：较完整。
- **已确认事实**：
  - `production` 下有 14 份生产管理文档。
  - 已有 `v1-demo.md` 里程碑。
  - 已有 Sprint 1、Sprint 2、Sprint 3。
  - 已有 QA、测试计划、功能完成度报告、Trade MVP 评审和 Source / Sink 对表。
  - 不存在 `production/stage.txt` 阶段覆盖文件。
- **关键缺口**：
  - 生产资料已经能支撑当前阶段推进，但缺少统一的阶段诊断报告作为 `/start` 后续入口。
  - Sprint 3 已明确“验收收口”，但需要把可玩性、文案一致性、试玩问题单和 Gate 检查连起来。

### 测试与验收

- **状态**：自动化基础较好，人工试玩闭环不足。
- **已确认事实**：
  - `src/tests` 下有 20 个测试文件。
  - `production/qa/feature-completeness-report.md` 记录当前总体完成度约 72%。
  - 已明确需要一次完整 30-45 分钟人工试玩验收。
- **关键缺口**：
  - 自动化测试能保护系统逻辑，但不能替代玩法可读性、节奏和反馈验证。
  - Demo checklist 与人工试玩问题单应成为进入 Polish 前的硬门槛。

### 原型

- **状态**：无独立 `prototypes` 目录。
- **判断**：
  - 当前项目不是“原型目录 + 主项目”的结构，而是直接在主工程中推进可玩 Demo。
  - 这本身不是问题，但需要通过文档说明当前原型已经合并进主工程，避免 Game Studio workflow 误判“没有原型”。

---

## Stage Classification

**阶段判定：Production**

判定依据：

- 已有 10 个以上源码文件，且 `src` 中存在多个独立系统域。
- 已有 V1 Demo 里程碑、多个 Sprint、QA 和评审文档。
- 已实现资源、建筑、招募、科技、Boss、存档、贸易等主循环相关系统。
- 当前工作重点是 V1 Demo 验收收口，而不是概念探索或技术选型。

为什么不是 Technical Setup：

- 虽然 `.claude/docs/technical-preferences.md` 仍未配置，但这是元数据未同步，不代表项目实际没有技术栈。
- 项目已经存在可构建、可测试、可部署的 Web / Electron 工程。

进入 Polish 前的最低要求：

- 完成 30-45 分钟人工试玩，并形成问题单。
- 完成标准 GDD 入口与 `docs/v1` 的映射。
- 同步 Game Studio 技术偏好文件。
- 对已实现核心系统完成至少一轮反向文档化。
- 用 `/gate-check` 明确 Production -> Polish 的通过条件。

---

## Gaps Identified

### Critical Gaps

1. **Game Studio 标准策划入口缺失**
   - **问题**：`design/gdd/game-concept.md` 不存在，`design/gdd` 文档数为 0。
   - **影响**：`/start`、`/project-stage-detect`、`/map-systems` 等 workflow 难以从标准路径识别项目概念、支柱和系统拆解。
   - **澄清问题**：`docs/v1` 是否继续作为权威策划源，`design/gdd` 只做索引映射，还是要把 `docs/v1` 逐步迁移为标准 GDD 结构？
   - **建议动作**：先建立最小标准入口：`game-concept.md`、`game-pillars.md`、`systems-index.md`，内容引用并对齐 `docs/v1`，不要立即大规模搬迁。

2. **技术偏好元数据与实际项目不一致**
   - **问题**：`.claude/docs/technical-preferences.md` 仍显示 Engine 未配置。
   - **影响**：后续 agent 可能按“未选引擎”处理，给出 Phaser、Three.js 或其他不适配建议。
   - **澄清问题**：是否将本项目在 Game Studio 语义下定义为“React/Vite 浏览器游戏 + Electron 桌面壳”，而非传统游戏引擎项目？
   - **建议动作**：运行 `/setup-engine` 或手动同步技术偏好，明确 Engine / Language / Rendering / Testing。

3. **完整人工试玩尚未成为阶段门槛**
   - **问题**：生产文档多次提到需要 30-45 分钟人工试玩，但尚未看到已闭环的试玩结果作为 Gate 输入。
   - **影响**：系统完成度无法直接转化为“玩家能否理解主循环”的结论。
   - **澄清问题**：试玩验收是否由 QA / Producer 负责，还是由策划先做一次内部走查？
   - **建议动作**：把 30-45 分钟试玩问题单列为进入 Polish 前的 P0 产物，并同步更新 Demo checklist。

### Important Gaps

4. **已实现系统需要反向文档化**
   - **问题**：代码域已经覆盖多个系统，但标准 GDD 文档没有逐一承接。
   - **影响**：后续新增或调参容易依赖代码记忆，削弱策划可维护性。
   - **澄清问题**：反向文档优先服务“简历展示 / 对外说明”，还是优先服务“继续开发 / 团队协作”？
   - **建议动作**：优先反向文档化 AI 调度、建筑 / 贸易、招募、科技、Boss、存档六类系统。

5. **`docs/v1` 与系统总表需要保持权威口径**
   - **问题**：系统总表已经包含 Trade，但部分早期口径可能仍保留“核心建筑 9 类”等旧边界。
   - **影响**：版本范围、简历表述和后续开发容易出现口径冲突。
   - **澄清问题**：Trade MVP 是否已正式并入 V1 基线，还是仍是候选强化系统？
   - **建议动作**：在阶段报告后追加一次 `/design-review` 或 `/scope-check`，专门处理 V1 口径一致性。

6. **试玩反馈与策划文档之间缺少固定回流格式**
   - **问题**：已有 QA 文档和 issue list，但试玩反馈如何回写到 GDD / Sprint / Demo checklist 还不够固定。
   - **影响**：同一问题可能在 QA、Sprint、Review 多处散落，降低收口效率。
   - **澄清问题**：后续试玩问题是否统一进入 `production/qa`，再由 Sprint 文档引用？
   - **建议动作**：固定试玩记录模板，包含问题、触发路径、严重级、系统归属、是否影响 Gate。

### Nice-to-Have Gaps

7. **缺少专门面向外部展示的策划摘要**
   - **问题**：项目文档偏研发内部，缺少一份“面向简历 / 作品集 / 试玩者”的策划摘要。
   - **影响**：对外展示时，亮点需要重新提炼。
   - **澄清问题**：作品集展示是否需要同时覆盖玩法、系统图、AI 工作流和试玩链接？
   - **建议动作**：在 Gate 检查后补一份 `production/showcase-brief.md` 或作品集页文案。

---

## Recommended Next Steps

### Immediate Priority

1. **同步 Game Studio 技术偏好**
   - 建议 skill：`/setup-engine`
   - 目标：把项目识别为 `React + Vite + TypeScript + Electron`，测试框架为 Vitest。
   - 估计工作量：S

2. **建立标准 `design/gdd` 入口**
   - 建议 skill：`/map-systems` 或手动建立最小映射文档。
   - 目标：补 `game-concept.md`、`game-pillars.md`、`systems-index.md`，并明确 `docs/v1` 是当前权威来源。
   - 估计工作量：M

3. **执行 30-45 分钟人工试玩**
   - 建议 skill：`/playtest-report`
   - 目标：形成问题单，更新 Demo checklist，判断主循环是否无需开发者讲解即可理解。
   - 估计工作量：M

### Short-Term

4. **反向文档化核心系统**
   - 建议 skill：`/reverse-document design src/domain/ai`，之后按系统推进。
   - 优先级：AI 调度、建筑 / 贸易、招募、科技、Boss、存档。
   - 估计工作量：M-L

5. **进行范围与口径检查**
   - 建议 skill：`/scope-check` 或 `/design-review`
   - 目标：确认 Trade MVP、核心建筑数量、V1 不做内容和 Sprint 3 收口口径一致。
   - 估计工作量：S-M

### Medium-Term

6. **运行 `/gate-check`**
   - 目标：判断是否满足 Production -> Polish。
   - 前置：试玩问题单、Demo checklist、核心 GDD 入口、技术偏好同步完成。
   - 估计工作量：S

7. **生成下一轮 Sprint 计划**
   - 建议 skill：`/sprint-plan`
   - 目标：如果未进入 Polish，则围绕阻塞问题排 Sprint；如果进入 Polish，则围绕展示、可读性、稳定性排 Sprint。
   - 估计工作量：S-M

---

## Role-Specific Recommendations

### For Designer

- **重点关注**：主循环可读性、系统口径一致性、GDD 标准入口、试玩反馈回流。
- **当前阻塞**：
  - 标准 GDD 入口缺失。
  - 已实现系统没有完全反向文档化。
  - 完整试玩验收没有形成 Gate 输入。
- **下一步任务**：
  1. 建立 `design/gdd` 最小入口并指向 `docs/v1`。
  2. 反向文档化 AI 调度、建筑 / 贸易、招募、科技、Boss、存档。
  3. 完成一次 30-45 分钟试玩，并按系统归属整理问题单。
  4. 运行 `/gate-check` 判断是否进入 Polish。

---

## Follow-Up Skills

- `/setup-engine`：同步真实技术栈，避免 Game Studio 元数据误判。
- `/map-systems`：把当前 V1 系统总表映射到标准 GDD 结构。
- `/reverse-document design src/domain/ai`：从已实现 AI 调度反向生成系统设计文档。
- `/playtest-report`：生成 30-45 分钟试玩记录和问题归类。
- `/scope-check`：检查 Trade MVP 与 V1 范围口径是否一致。
- `/gate-check`：判断 Production -> Polish 是否可通过。
- `/sprint-plan`：根据 Gate 结果生成下一轮 Sprint。

---

## Appendix: File Counts

```text
design/
  gdd/                 0 markdown files
  game-concept.md      missing

docs/
  docs/v1/             11 markdown files

src/
  source files         about 104 TS/TSX/JS/JSX files
  domain systems       ai, building, character, combat, equipment,
                       intervention, inventory, map, resource, save,
                       settlement, shop, technology

production/
  markdown files       14
  stage.txt            missing
  sprints              sprint-1, sprint-2, sprint-3
  milestone            v1-demo
  QA / reviews         present

tests/
  src/tests            20 test files
```

---

**结论**：项目已处于 Production 阶段，下一步不应优先扩内容，而应先完成 Game Studio 元数据对齐、标准 GDD 入口、核心系统反向文档化和人工试玩 Gate。这样才能把现有可玩 Demo 转化为可验收、可展示、可继续协作的 V1。
