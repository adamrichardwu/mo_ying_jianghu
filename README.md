# Mo Ying Jiang Hu

墨影江湖是一个使用 TypeScript 构建的武侠题材原型项目，当前版本已经具备最小可运行闭环：场景加载、角色建模、基础武学选择、回合战斗结算，以及对应的自动化测试。

## Project Overview

当前代码重点在验证玩法骨架，而不是完整内容量。首个 MVP 已覆盖：

- 角色基础属性与武学配置
- 场景管理与起始场景加载
- 基础回合制战斗与胜负判定
- Vitest 自动化测试

## Project Structure

```
mo-ying-jianghu
├── src
│   ├── game.ts         # Game orchestration and MVP flow
│   ├── main.ts          # Entry point of the game
│   ├── characters       # Contains character-related logic
│   │   └── index.ts     # Character domain model
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

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

## Gameplay Details

当前版本会启动一段初始江湖遭遇战：

- 玩家角色“沈孤舟”进入起始场景“青石古道”
- 系统根据武学和属性自动选择行动
- 战斗模块完成命中、伤害、真气消耗与胜负结算

这为后续继续扩展以下系统提供了稳定基础：

- 数据驱动的武学库
- 更多敌人与场景事件
- 修炼、掉落、状态效果
- Phaser 场景表现层

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for details.