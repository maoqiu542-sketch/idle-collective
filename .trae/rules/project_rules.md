# Idle Collective 项目规则

## 开发环境

- **框架**: Electron + React + TypeScript
- **状态管理**: Zustand
- **构建工具**: Vite
- **路径别名**: `@app-types/*` 指向 `src/types/*`

## 常用命令

| 命令 | 功能 |
|------|------|
| `npm run dev` | 开发模式启动 |
| `npm run build` | 构建生产版本 |
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:build` | 构建 Electron 应用 |

## 代码规范

### TypeScript
- 启用严格模式
- 优先使用类型推断，避免冗余类型标注
- 公共 API 必须有类型定义

### React 组件
- 使用函数式组件 + Hooks
- 组件文件使用 `.tsx` 扩展名
- 样式文件与组件同目录，使用 `.css` 扩展名

### 目录结构

```
src/
├── core/           # 核心系统（Game, EventBus, ServiceContainer）
├── data/           # 数据层（ConfigManager, TextManager）
├── domain/         # 领域层（各游戏系统）
│   ├── ai/
│   ├── building/
│   ├── character/
│   ├── combat/
│   ├── equipment/
│   ├── intervention/
│   ├── map/
│   ├── resource/
│   ├── save/
│   ├── settlement/
│   ├── shop/
│   └── technology/
├── net/            # 网络层（联机客户端）
├── types/          # 类型定义（25+ .types.ts 文件）
├── ui/             # UI 层
│   ├── components/ # 组件（按功能子目录组织）
│   │   ├── boss/
│   │   ├── building/
│   │   ├── character/
│   │   ├── combat/
│   │   ├── panel/
│   │   ├── shop/
│   │   └── ...
│   ├── online/     # 联机路由
│   └── stores/     # Zustand stores
├── tests/          # Vitest 单元测试
└── utils/          # 工具函数

public/                     # Vite 静态资源根目录
├── textures/               # （贴图资源）全部图像类文件
│   ├── manifests/          #   资产清单 JSON（game-assets-manifest.json / staged-game-assets-manifest.json）
│   ├── boss_portrait/      #   Boss 头像（5个 Boss × 3 尺寸）
│   ├── building_map/       #   建筑地图贴图（12种建筑 × 3 尺寸）
│   ├── character_portrait/ #   角色头像（8种职业 × 3 尺寸）
│   ├── resource_node/      #   地图资源节点（5种资源 × 多变体 × 3 尺寸）
│   ├── terrain/            #   地形贴图（6种地形 × 多变体 × 3 尺寸）
│   └── ui_icon_fallback/   #   UI 通用回退图标（16种 × 3 尺寸）
│
├── data/                   # （数值资源）全部数值配置文件
│   ├── source/             #   数据源
│   │   ├── csv/            #     CSV 数据表（11个文件）
│   │   ├── boss-config.json / building-config.json / ...
│   │   └── README.md
│   ├── assets-manifest.json
│   ├── game-config.json
│   ├── boss-config.json / building-config.json / ...
│   └── ...
│
└── text/                   # （文本资源）全部显示文本
    ├── ui.json             #   UI 标签、按钮、面板标题
    ├── game.json           #   资源名、职业名、状态名、装备名等
    ├── guide.json          #   新手引导步骤文本
    └── milestones.json     #   发展阶段里程碑描述

art-pipeline/               # 美术管线（与资源生产相关）
├── specs/                  #   管线规范（runtime-mapping.json, asset-catalog.json 等）
├── incoming/               #   AI 生成的原始输入素材
├── review/                 #   审核请求与报告
└── workflows/              #   工作流定义

scripts/art-pipeline/       # 美术管线脚本（在 shared.js 中集中管理路径）
scripts/sync-config.js      # CSV → JSON 同步脚本

config/                     # ❌ 已废弃，迁移至 public/data/source/
  └── csv/
```

## 资源管理

项目资源按类型分为三大目录，全部位于 `public/` 下，遵循严格的分类和加载约定。

### 贴图资源（public/textures/）

#### 目录组织
- 所有图像文件（.png）统一存放于 `public/textures/`，按子目录分类：
  - `terrain/` / `building_map/` / `character_portrait/` / `boss_portrait/` / `resource_node/` / `ui_icon_fallback/`
- 每种资源的子目录以 `{类型}_{标识符}` 命名（例如 `terrain_grass`、`building_farm`）。
- 每个资源拥有三个尺寸副本，命名格式为 `{asset_id}__{size}.png`，其中 size ∈ `32 | 64 | 128`。
- Manifest 清单文件存放在 `public/textures/manifests/`。

#### 加载机制
- **禁止在代码中硬编码图片路径**。所有图片通过 artAssets 层的间接查找访问。
- `artAssets.ts`（位于 `src/data/assets/artAssets.ts`）在编译时通过 Vite JSON import 加载 manifest 和 runtime-mapping。
- 查找链路：`UI 组件调用 get*AssetPath(key, size)` → manifest.mapping 匹配 assetId → manifest.assets 获取文件路径。
- 对外暴露的访问函数（均在 `artAssets.ts` 中定义）：

| 函数 | 用途 | 默认尺寸 |
|------|------|:--------:|
| `getTerrainAssetPath(terrain, size, coords)` | 地形纹理 | 32 |
| `getResourceNodeAssetPath(resource, size)` | 地图资源节点 | 32 |
| `getResourceUiAssetPath(resource, size)` | 资源 UI 图标 | 32 |
| `getBuildingAssetPath(type, size)` | 建筑图标 | 64 |
| `getProfessionAssetPath(profession, size)` | 职业图标 | 64 |
| `getCharacterPortraitAssetPath(profession, size, options?)` | 角色头像 | 64 |
| `getBossAssetPath(bossId, size, options?)` | Boss 头像 | 64 |
| `getUiIconAssetPath(iconId, size)` | 通用 UI 图标 | 32 |
| `toBackgroundImage(assetPath)` | 路径 → CSS background-image | — |

#### 资产清单（Manifest）
- 两个 manifest 文件对应不同生命周期阶段：
  - `game-assets-manifest.json`（live）— 正式发布的资产
  - `staged-game-assets-manifest.json`（staged）— 待审核/待发布的资产
- Manifest 内部 file 路径使用相对于 `index.html` 的格式，例如 `"textures/terrain/terrain_grass/terrain_grass__32.png"`。

#### 尺寸规范
- 每种贴图资源必须按三个固定尺寸输出：32px、64px、128px。
- 管线脚本中的 `SIZES` 常量统一管理，避免手动指定。

#### 管线脚本路径约定
- 所有 art-pipeline 脚本通过 `scripts/art-pipeline/shared.js` 中的 `paths` 对象获取路径，不直接硬编码目录名。
- 关键路径常量已在 `shared.js` 中集中定义（`publicAssetsDir`、`stagedAssetsDir`、`manifestsDir` 等）。
- 修改资源目录结构时，只需更新 `shared.js` 中的路径常量，并确保其他脚本通过 `require('./shared')` 引用。

> **注意**：`public/textures/` 由美术管线的 Node.js 脚本自动生成和更新。手动创建或修改该目录下的文件时，需同步更新对应的 manifest 文件。

---

### 数值资源（public/data/）

#### 目录组织
- 运行时配置文件：`public/data/*.json`（例如 `game-config.json`、`boss-config.json`、`equipment-config.json` 等）。
- 数据源文件（CSV）：`public/data/source/csv/`（如 `game_settings.csv`、`bosses.csv` 等）。
- 中间 JSON 生成产物：`public/data/source/*.json`（由 `sync-config.js` 从 CSV 生成）。
- 根目录 `config/` **已废弃**，内容已迁移至 `public/data/source/`。

#### 加载机制
- 运行时通过 `ConfigManager`（`src/data/config/ConfigManager.ts`）异步加载配置。
- 加载使用 `BrowserConfigSource.loadJson()` 基于 `fetch()` 的机制，路径相对于 `index.html`。
- 加载路径示例：`data/game-config.json`、`data/boss-config.json`。
- 每个配置加载失败时自动回退至代码内的默认值（避免因配置文件缺失导致运行时崩溃）。

#### 数据修改流程
```
修改 CSV 文件                     → 运行               → 重启开发服务器
public/data/source/csv/xxx.csv     node scripts/sync-config.js  刷新生效
                                   ↓
                           输出 JSON 至 public/data/xxx.json
```

- **策划/数值同学仅需编辑 CSV 文件**，JSON 由脚本自动生成。
- 运行 `node scripts/sync-config.js` 后，所有输出覆盖至 `public/data/`。
- 如需手动修改运行时配置，直接编辑 `public/data/*.json` 即可，但需注意与 CSV 源保持同步。

#### 文件清单
运行时配置 JSON（9个）：`game-config.json`、`boss-config.json`、`building-config.json`、`character-config.json`、`equipment-config.json`、`production-building-config.json`、`tech-config.json`、`terrain-config.json`、`six-dimension-config.json`。  
CSV 数据源（11个）：`game_settings.csv`、`bosses.csv`、`buildings.csv`、`professions.csv`、`talents.csv`、`exp_table.csv`、`terrains.csv`、`resources.csv`、`production_buildings.csv`、`equipments.csv`、`six_dimensions.csv`。

---

### 文本资源（public/text/）

#### 目录组织
- 所有游戏显示文本集中在 `public/text/` 下，按主题拆分为独立 JSON 文件：

| 文件 | 内容 | 使用场景 |
|------|------|---------|
| `ui.json` | UI 标签、按钮、面板标题、提示文字（约 130 条） | App、ShopPanel、BottomPanel 等 UI 组件 |
| `game.json` | 资源名、职业名、角色状态、装备品质、建筑描述等（约 90 条） | Game.ts、各领域层、UI 组件 |
| `guide.json` | 新手引导 6 步标题和提示 | GuidePanel、guideProgress.ts |
| `milestones.json` | 6 个发展阶段的名称和描述 | DevelopmentMilestone.tsx |

#### 加载机制
- 编译时通过 Vite JSON import 由 `TextManager`（`src/utils/TextManager.ts`）自动加载。
- 使用方式：`textManager.get(category, key, ...args)`
  - `category`：文本分类，如 `'ui'`、`'game'`。
  - `key`：点分隔的键路径，如 `'panel.character'`、`'resources.wood'`。
  - `args`：可选参数，替换文本中的 `{0}`、`{1}` 占位符。
- 快捷方法：`textManager.getStepTitle(index)`、`textManager.getStepHint(index)`（引导专用）。

#### 使用约定
- **新增 UI 文本时，优先写入 text/ 下对应的 JSON 文件**，而非直接在 JSX 中硬编码。
- 参数化文本使用 `{0}`、`{1}` 格式的占位符，调用时通过 `textManager.get()` 的 args 传入。
- 新增文本分类时，在 `public/text/` 下创建新的 JSON 文件，并在 `TextManager` 的构造函数中注册。

> **原则**：所有运行时显示给玩家的中文文本应集中管理于 `public/text/`。技术性日志、调试信息等非面向玩家的文本不受此约束。

## 游戏系统

### 状态管理
- 使用 Zustand 的 gameStore.ts
- 状态更新通过 set() 方法
- 复杂状态使用子 store 分割

### 事件系统
- 使用 EventBus 进行组件通信
- 事件类型定义在 `src/types/event.types.ts`
- 常用事件：`resource:update`, `building:created`, `character:state-change`

### 调试功能
- 开发环境可通过 Ctrl+Shift+D 打开调试面板
- 调试面板提供：快速 Boss、满资源、满级角色等功能

## 注意事项

1. **修改类型文件后需检查** `vite.config.ts` 和 `tsconfig.json` 的路径别名配置
2. **AI 系统** 依赖 CharacterManager、NeedManager、TaskScheduler 的协同工作
3. **地图系统** 使用 SimplexNoise 生成地形，需正确初始化 seed
4. **存档系统** 自动保存间隔 60 秒，支持 5 个存档槽位
5. **资源管理准则**：
   - 新增图片须通过管线流程（spec → generate → review → manifest），不可直接放入 textures/
   - 新增数值配置优先修改 CSV 源文件，再运行 sync-config.js 同步
   - 新增 UI 文本须写入 public/text/ 下对应 JSON，不可在组件中硬编码

## 文档-代码版本控制机制

### 文档版本号规范

| 文档 | 当前版本 | 对应代码版本 |
|------|:--------:|:-----------:|
| 核心玩法与主循环设计方案.md | v2.0 | saveVersion 2.1.0 |
| README.md | v1.0 (固定) | saveVersion 2.1.0 |

### 版本变更记录

所有设计文档的末尾必须包含版本记录表：

```markdown
| 版本 | 日期 | 说明 |
|:---:|:---:|------|
| v1.0 | YYYY-MM-DD | 初始版本 |
| v2.0 | YYYY-MM-DD | 主要修订说明 |
```

### 双向一致性检查流程

```text
当以下情况发生时，必须执行双向一致性检查：
1. 新增功能模块 ⇒ 更新设计文档
2. 修改设计文档 ⇒ 检查代码是否匹配
3. 策划案评审后 ⇒ 同步更新代码实现
```

### 文档实现追踪

每个子系统在文档中标注实现状态：

| 标记 | 含义 |
|:---:|------|
| ✅ | 已实现并已验证 |
| 🏗️ | 部分实现 |
| 📝 | 仅文档设计 |
| ❌ | 未实现 |

### 存档版本校验

- 存档版本（saveVersion）与核心文档版本对应
- 版本不匹配时拒绝加载旧存档
- 重大更新后必须递增 saveVersion
