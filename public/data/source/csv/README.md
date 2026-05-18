# 游戏配置表

## 目录结构

```
config/
├── csv/                    # CSV格式配置表（供策划编辑）
│   ├── game_settings.csv
│   ├── professions.csv
│   ├── talents.csv
│   ├── buildings.csv
│   ├── terrains.csv
│   └── resources.csv
├── game-config.json        # JSON格式（程序使用）
├── character-config.json
├── building-config.json
└── terrain-config.json
```

## 编辑流程

1. **策划编辑CSV** → 修改 `config/csv/` 目录下的CSV文件
2. **运行同步** → 执行 `npm run sync:config` 将CSV转换回JSON
3. **测试验证** → 重启游戏查看效果

## 同步命令

```bash
# CSV转JSON（同步配置）
npm run sync:config

# 仅验证CSV格式
npm run validate:config
```

---

# CSV表说明

## 1. game_settings.csv - 游戏核心配置

| 字段 | 说明 | 示例值 |
|------|------|--------|
| category | 配置类别 | map/character/economy/game |
| key | 配置键名 | width/height/maxCount/baseStats |
| value | 配置值 | 20/100/1.0 |
| description | 说明 | 地图宽度/最大角色数 |

## 2. professions.csv - 职业配置

| 字段 | 说明 | 示例值 |
|------|------|--------|
| type | 职业类型 | gatherer/builder/farmer/warrior |
| name | 职业名称 | 采集者/建造者/农夫/战士 |
| description | 描述 | 擅长采集各种资源 |
| bonusSkills | 加成技能 | gathering,mining / building / cooking / combat |
| baseEfficiency | 基础效率 | 1.2/1.3/1.2/1.5 |

## 3. talents.csv - 天赋配置

| 字段 | 说明 | 示例值 |
|------|------|--------|
| type | 天赋类型 | gathering/mining/building/cooking/combat |
| name | 天赋名称 | 采集/挖矿/建造/烹饪/战斗 |
| maxLevel | 最大等级 | 10 |
| expMultiplier | 经验乘数 | 1.5/1.3/1.4/1.6 |

## 4. buildings.csv - 建筑配置

| 字段 | 说明 | 示例值 |
|------|------|--------|
| type | 建筑类型 | warehouse/workbench/kitchen/house |
| name | 建筑名称 | 仓库/工作台/厨房/房屋 |
| description | 描述 | 存储资源的仓库 |
| width | 宽度 | 2/1/2 |
| height | 高度 | 2/1/1 |
| cost_wood | 木材 cost | 20/15/10/30 |
| cost_stone | 石材 cost | 10/5/15/20 |
| capacity | 容量 | 500/2 |
| efficiencyBonus | 效率加成 | 1.5 |

## 5. terrains.csv - 地形配置

| 字段 | 说明 | 示例值 |
|------|------|--------|
| type | 地形类型 | grass/forest/mountain/water |
| name | 地形名称 | 草地/森林/山地/水域 |
| color | 颜色代码 | #7CBA5F/#2D5A27/#8B7355/#4A90D9 |
| passable | 可通行 | TRUE/FALSE |
| movementCost | 移动消耗 | 1/2/3/999 |

## 6. resources.csv - 资源生成配置

| 字段 | 说明 | 示例值 |
|------|------|--------|
| type | 资源类型 | wood/stone/food |
| name | 资源名称 | 木材/石材/食物 |
| baseAmount | 基础数量 | 50/30/20 |
| respawnable | 可重生 | TRUE |
| respawnTime | 重生时间(ms) | 300000/600000/180000 |

---

# 经验等级表 (exp_table.csv)

| level | required_exp |
|-------|--------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 900 |
| 6 | 1500 |
| 7 | 2400 |
| 8 | 3700 |
| 9 | 5500 |
| 10 | 8000 |
