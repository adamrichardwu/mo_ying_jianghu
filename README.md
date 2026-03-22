# Mo Ying Jiang Hu

墨影江湖是一个使用 TypeScript 构建的武侠题材原型项目。当前版本为 v1.1.0，已经具备可在终端直接游玩的最小文字游戏形态：主菜单、角色面板、武学目录、交互式战斗，以及对应的自动化测试。

## Version

- **当前版本：** v1.1.0
- **版本代号：** Terminal Combat Update
- **本次更新：**
   - 新增终端主菜单
   - 新增角色面板与武学目录
   - 支持在战斗中手动选择武学
   - 新增状态效果：流血、破绽、凝神
   - 内功改为具有恢复真气和提供防御的独立战斗价值

## Project Overview

当前代码重点在验证玩法骨架，而不是完整内容量。当前版本已覆盖：

- 角色基础属性与武学配置
- 场景管理与起始场景加载
- 终端主菜单与交互式文字战斗
- 基础回合制战斗与胜负判定
- 普通攻击、防御、调息、武学释放
- 状态效果与回合结算
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
- 通过主菜单查看角色和武学信息
- 在战斗中手动选择普通攻击、武学、防御、调息
- 武学可触发流血、破绽、凝神等状态效果
- 系统完成命中、伤害、真气消耗、防御抵消与回合结算

这为后续继续扩展以下系统提供了稳定基础：

- 数据驱动的武学库
- 更多敌人与场景事件
- 修炼、掉落、状态效果深化
- Phaser 场景表现层

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for details.