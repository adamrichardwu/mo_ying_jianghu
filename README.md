# Mo Ying Jiang Hu

墨影江湖是一个使用 TypeScript 构建的武侠题材原型项目。当前代码已经具备可在终端直接游玩的最小文字游戏形态：主菜单、角色面板、武学目录、战前换装、交互式战斗，以及对应的自动化测试。

## Version

- **当前版本：** v1.1.0
- **版本代号：** Terminal Combat Update
- **当前工作树已实现：**
   - 终端主菜单、角色面板与武学目录
   - 轻功 / 内功独立装配
   - 拳 / 刀 / 剑 / 棍 / 暗器五类外功分流派预设
   - 武器 / 衣服 / 饰品 / 护腕 / 鞋子 / 帽子 / 戒指七槽装备体系
   - 武器类别决定当前生效外功；未装备武器时默认按拳法流派处理
   - 普通攻击随机施展当前外功的基础招式
   - 战前切换武学与装备，并将装配应用到后续战斗
   - 状态效果：流血、破绽、凝神

## Project Overview

当前代码重点在验证玩法骨架，而不是完整内容量。当前版本已覆盖：

- 角色基础属性与武学配置
- 武学库存与装备库存解析
- 场景管理与起始场景加载
- 终端主菜单、换装菜单与交互式文字战斗
- 基础回合制战斗与胜负判定
- 普通攻击、防御、调息、武学释放
- 外功基础招式与绝招的双层设计
- 按兵器类别切换当前外功的联动规则
- 状态效果与回合结算
- 装备对命中、闪避、速度、伤害、防御、回气以及基础属性的实时加成
- Vitest 自动化测试

## Project Structure

```
mo-ying-jianghu
├── src
│   ├── game.ts         # Game orchestration and MVP flow
│   ├── main.ts          # Entry point of the game
│   ├── characters       # Contains character-related logic
│   │   └── index.ts     # Character domain model
│   ├── data             # JSON-driven game content
│   │   ├── characters.json
│   │   ├── game-config.json
│   │   ├── gear.json
│   │   ├── index.ts
│   │   ├── martial-arts.json
│   │   └── scenes.json
│   ├── scenes           # Manages game scenes
│   │   └── index.ts     # Scene manager
│   ├── combat           # Handles combat mechanics
│   │   └── index.ts     # Combat resolution
│   └── types            # Defines types and interfaces
│       └── index.ts     # Shared game types
├── tests
│   ├── smoke.test.ts    # Combat and game startup tests
│   └── tsconfig.json    # Test-specific TypeScript config
├── package.json         # NPM configuration
├── tsconfig.json        # TypeScript configuration
├── vitest.config.ts     # Test runner config
└── README.md            # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mo-ying-jianghu.git
   cd mo-ying-jianghu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the game:**
   ```bash
   npm start
   ```

   启动后会进入终端主菜单，可进行以下操作：
   - 开始江湖遭遇
   - 查看角色面板
   - 查看武学目录
   - 更换装备
   - 查看操作说明
   - 退出

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## Gameplay Details

当前版本会在终端中提供一个完整的最小文字游戏循环：

- 玩家角色“沈孤舟”进入起始场景“青石古道”
- 通过主菜单查看角色、武学与当前装备信息
- 在战前切换轻功、内功、各兵器类别外功，以及武器、衣服、饰品、护腕、鞋子、帽子、戒指
- 在战斗中选择普通攻击、武学、防御、调息
- 当前武器会决定当前生效的外功流派；未装备武器时默认按拳法流派作战
- 普通攻击会随机调用当前外功下的基础招式，不再额外二次选择
- 武学可触发流血、破绽、凝神等状态效果
- 系统完成命中、伤害、真气消耗、防御抵消与回合结算

当前内置内容以验证搭配深度为主，已经包含：

- 多套可切换轻功：踏云追影步、浮萍掠水纵、燕羽穿林身、雾行回身步
- 多套可切换内功：潮生归元诀、铁壁藏机功、赤炉混元功、玉脉回照功
- 多套可切换外功：清霜江月剑、秋水分波剑、裂岳崩山拳、流萤飞星手、断浪沉锋刀、横江伏波棍
- 基础外功：基础拳脚、基础刀法、基础剑式、基础棍法、基础暗器术
- 多件可切换装备：柳纹长剑、惊涛铁拳套、青锋单刀、江纹长棍、燕尾针囊、青竹护衫、铁鳞短甲、夜行披风、温玉佩、逐影符、镇心玉锁、铁纹护腕、软丝护腕、机簧袖护、芦影快靴、镇岳重靴、飞羽履、青篾斗笠、行云抹额、夜隐风帽、鹰目环、流玉戒、铁骨戒

这为后续继续扩展以下系统提供了稳定基础：

- 数据驱动的武学库
- 数据驱动的装备库与掉落系统
- 更多敌人与场景事件
- 修炼、掉落、状态效果深化
- Phaser 场景表现层

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for details.