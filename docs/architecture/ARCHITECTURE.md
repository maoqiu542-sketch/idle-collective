# Idle Collective - 项目架构设计文档

## 一、架构设计原则

### 1.1 核心原则
- **模块化**: 每个系统独立封装，职责单一
- **高内聚低耦合**: 相关功能聚合，模块间通过接口通信
- **依赖注入**: 核心系统通过 DI 容器管理，便于测试和替换
- **数据驱动**: 游戏数值和资源配置外部化，支持热更新
- **事件驱动**: 系统间通过事件总线通信，降低直接依赖

### 1.2 分层架构
```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (React Components, UI, Views)                          │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│  (Game Loop, Systems Coordinator, Event Bus)            │
├─────────────────────────────────────────────────────────┤
│                      Domain Layer                        │
│  (Entities, Systems, AI, Rules)                         │
├─────────────────────────────────────────────────────────┤
│                       Data Layer                         │
│  (Config, Save/Load, Resource Management)               │
├─────────────────────────────────────────────────────────┤
│                      Infrastructure                      │
│  (Electron, File System, Desktop Integration)           │
└─────────────────────────────────────────────────────────┘
```

## 二、目录结构设计

```
idle-collective/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本
│   └── desktop-pet/             # 桌面宠物模块（后期）
│
├── src/                         # 渲染进程源码
│   ├── core/                    # 核心系统层
│   │   ├── Game.ts              # 游戏主类
│   │   ├── GameLoop.ts          # 游戏循环
│   │   ├── EventBus.ts          # 事件总线
│   │   ├── ServiceContainer.ts  # 依赖注入容器
│   │   └── TimeManager.ts       # 时间管理
│   │
│   ├── domain/                  # 领域层（业务逻辑）
│   │   ├── map/                 # 地图系统
│   │   │   ├── MapSystem.ts
│   │   │   ├── Tile.ts
│   │   │   └── TerrainGenerator.ts
│   │   │
│   │   ├── character/           # 角色系统
│   │   │   ├── Character.ts
│   │   │   ├── CharacterManager.ts
│   │   │   ├── Profession.ts
│   │   │   └── Talent.ts
│   │   │
│   │   ├── ai/                  # AI 系统
│   │   │   ├── BehaviorTree.ts
│   │   │   ├── DecisionMaker.ts
│   │   │   └── Tasks/
│   │   │
│   │   ├── building/            # 建筑系统
│   │   │   ├── Building.ts
│   │   │   ├── BuildingManager.ts
│   │   │   └── BuildingFactory.ts
│   │   │
│   │   ├── resource/            # 资源系统
│   │   │   ├── ResourceManager.ts
│   │   │   └── ResourceTypes.ts
│   │   │
│   │   └── economy/             # 经济系统
│   │       ├── EconomySystem.ts
│   │       └── Market.ts
│   │
│   ├── data/                    # 数据层
│   │   ├── config/              # 配置文件（可替换）
│   │   │   ├── game-config.json
│   │   │   ├── terrain-config.json
│   │   │   ├── building-config.json
│   │   │   └── character-config.json
│   │   │
│   │   ├── save/                # 存档系统
│   │   │   ├── SaveManager.ts
│   │   │   └── SaveData.ts
│   │   │
│   │   └── assets/              # 资源文件（可替换）
│   │       ├── images/
│   │       ├── audio/
│   │       └── sprites/
│   │
│   ├── ui/                      # UI 层
│   │   ├── components/          # React 组件
│   │   │   ├── common/          # 通用组件
│   │   │   ├── map/             # 地图相关组件
│   │   │   ├── character/       # 角色相关组件
│   │   │   └── building/        # 建筑相关组件
│   │   │
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── stores/              # Zustand 状态管理
│   │   └── styles/              # 样式文件
│   │
│   ├── utils/                   # 工具函数
│   │   ├── logger.ts            # 日志系统
│   │   ├── pathfinding.ts       # 寻路算法
│   │   ├── random.ts            # 随机数工具
│   │   └── math.ts              # 数学工具
│   │
│   └── types/                   # TypeScript 类型定义
│       ├── index.ts
│       ├── map.types.ts
│       ├── character.types.ts
│       ├── building.types.ts
│       └── event.types.ts
│
├── config/                      # 外部配置（可替换）
│   ├── game-config.json
│   └── assets-manifest.json
│
├── docs/                        # 文档
│   ├── api/                     # API 文档
│   ├── design/                  # 设计文档
│   └── guides/                  # 开发指南
│
└── tests/                       # 测试
    ├── unit/
    └── integration/
```

## 三、核心系统设计

### 3.1 事件总线 (EventBus)
```typescript
// 事件类型定义
interface GameEvents {
  'map:tile-changed': { x: number; y: number; tile: Tile };
  'character:spawned': { character: Character };
  'character:moved': { character: Character; from: Position; to: Position };
  'resource:collected': { type: ResourceType; amount: number };
  'building:placed': { building: Building; position: Position };
  'game:tick': { deltaTime: number };
}

// 使用示例
eventBus.on('character:moved', (data) => { ... });
eventBus.emit('character:moved', { character, from, to });
```

### 3.2 依赖注入容器 (ServiceContainer)
```typescript
// 服务注册
container.register('MapSystem', MapSystem);
container.register('CharacterManager', CharacterManager);
container.register('ResourceManager', ResourceManager);

// 服务获取
const mapSystem = container.resolve<MapSystem>('MapSystem');
```

### 3.3 游戏循环 (GameLoop)
```typescript
class GameLoop {
  private readonly TICK_RATE = 60; // 60 FPS
  private readonly FIXED_TIMESTEP = 1000 / TICK_RATE;
  
  private update(deltaTime: number): void {
    // 固定时间步更新
    this.eventBus.emit('game:tick', { deltaTime });
    
    // 更新各系统
    this.aiSystem.update(deltaTime);
    this.characterManager.update(deltaTime);
    this.buildingManager.update(deltaTime);
  }
}
```

### 3.4 AI 行为树
```typescript
interface BehaviorNode {
  execute(context: CharacterContext): NodeStatus;
}

// 行为树节点类型
- SequenceNode    // 顺序执行
- SelectorNode    // 选择执行
- ConditionNode   // 条件判断
- ActionNode      // 执行动作
```

## 四、数据配置系统

### 4.1 配置文件结构
```json
// config/game-config.json
{
  "version": "1.0.0",
  "map": {
    "width": 20,
    "height": 20
  },
  "character": {
    "maxCount": 10,
    "baseStats": {
      "health": 100,
      "mood": 100
    }
  },
  "economy": {
    "sellMultiplier": 1.0,
    "expandCost": 1000
  }
}
```

### 4.2 资源清单
```json
// config/assets-manifest.json
{
  "images": {
    "terrain.grass": "assets/images/terrain/grass.png",
    "terrain.forest": "assets/images/terrain/forest.png"
  },
  "audio": {
    "bgm.main": "assets/audio/bgm/main.mp3"
  }
}
```

## 五、编码规范

### 5.1 命名约定
| 类型 | 命名风格 | 示例 |
|------|---------|------|
| 类名 | PascalCase | `CharacterManager` |
| 接口 | PascalCase + I前缀 | `ICharacter` |
| 函数/方法 | camelCase | `calculateDamage()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_CHARACTER_COUNT` |
| 私有属性 | _前缀 | `private _health: number` |
| 事件 | 语义化 | `character:died` |

### 5.2 文件命名
- 组件文件: PascalCase.tsx (如 `CharacterPanel.tsx`)
- 工具文件: camelCase.ts (如 `pathfinding.ts`)
- 类型文件: camelCase.types.ts (如 `character.types.ts`)
- 样式文件: 与组件同名.css (如 `CharacterPanel.css`)

### 5.3 注释规范
```typescript
/**
 * 角色管理器 - 负责角色的创建、更新和销毁
 * @class CharacterManager
 */
class CharacterManager {
  /**
   * 创建新角色
   * @param name - 角色名称
   * @param profession - 职业类型
   * @returns 创建的角色实例
   */
  createCharacter(name: string, profession: ProfessionType): Character {
    // ...
  }
}
```

## 六、错误处理与日志

### 6.1 日志系统
```typescript
enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

class Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, error?: Error, context?: object): void;
}
```

### 6.2 错误处理
```typescript
// 自定义错误类型
class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: object
  ) {
    super(message);
  }
}

// 全局错误处理
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', event.error);
});
```

## 七、扩展性设计

### 7.1 插件系统（预留）
```typescript
interface GamePlugin {
  name: string;
  version: string;
  install(game: Game): void;
  uninstall(): void;
}
```

### 7.2 模块热加载（预留）
```typescript
// 支持后期替换资源
async function loadAssets(manifest: AssetManifest): Promise<void>;
async function reloadAssets(): Promise<void>;
```

### 7.3 桌面宠物扩展点
```typescript
// 桌面宠物接口（后期实现）
interface DesktopPet {
  spawn(x: number, y: number): void;
  moveTo(x: number, y: number): void;
  interact(): void;
}
```

## 八、测试策略

### 8.1 单元测试
- 核心算法（寻路、AI决策）
- 数据转换
- 工具函数

### 8.2 集成测试
- 系统间交互
- 事件流
- 存档/读档

### 8.3 E2E测试
- 完整游戏流程
- UI交互

## 九、性能优化策略

### 9.1 渲染优化
- 虚拟化列表（大量角色时）
- 视口裁剪（只渲染可见区域）
- 对象池（复用对象实例）

### 9.2 逻辑优化
- 空间分区（减少碰撞检测）
- 脏标记（只更新变化的对象）
- 时间切片（分帧处理大量计算）

## 十、开发路线图

### Phase 1: 基础框架
- [x] 项目结构搭建
- [ ] 核心系统实现
- [ ] 基础UI框架

### Phase 2: 核心玩法
- [ ] 地图系统
- [ ] 角色系统
- [ ] AI系统
- [ ] 资源系统

### Phase 3: 扩展功能
- [ ] 建筑系统
- [ ] 经济系统
- [ ] 存档系统

### Phase 4: 桌面集成
- [ ] Electron打包
- [ ] 桌面宠物模式
- [ ] 资源替换系统
