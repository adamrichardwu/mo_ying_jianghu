# 墨影江湖视觉素材清单

本文件用于记录当前仓库中已经接入代码的美术素材与视觉依赖位置，方便后续整体替换。

## 1. 当前已存在的素材文件

### 1.1 角色立绘

- [public/portraits/shen-guzhou-rage.svg](public/portraits/shen-guzhou-rage.svg)
  - 用途：主角“沈孤舟”的浏览器立绘
  - 当前接入位置：战斗舞台立绘卡、总览页立绘卡、战斗信息卡头像

- [public/portraits/blackwind-rage.svg](public/portraits/blackwind-rage.svg)
  - 用途：敌人“黑风盗”的浏览器立绘
  - 当前接入位置：战斗舞台立绘卡、总览页立绘卡、战斗信息卡头像

## 2. 当前没有独立文件、而是由 CSS 生成的视觉内容

这些内容后续如果要替换成正式美术资源，需要新增真实图片或切片素材：

- 古道场景背景
- 茶肆场景背景
- 远山、中景、近景地表
- 云层、日光、草丛等氛围层
- 舞台底部黑边和纸面氛围
- 角色舞台剪影、武器轮廓、气场光效

当前这些内容主要写在：

- [src/web/styles.css](src/web/styles.css)

关键类名：

- `.scene-stage.theme-ancient-road`
- `.scene-stage.theme-teahouse`
- `.scene-backdrop`
- `.scene-platform`
- `.stage-fighter`
- `.fighter-silhouette`

## 3. 代码中的视觉资源入口

后续要整体替换美术时，优先查看以下文件：

- [src/web/visuals.ts](src/web/visuals.ts)
  - 角色立绘路径映射
  - 场景主题映射
  - 默认回退资源

- [src/web/main.ts](src/web/main.ts)
  - 页面中哪些组件实际消费了立绘与场景主题

- [src/web/styles.css](src/web/styles.css)
  - 当前 CSS 生成的场景气氛、舞台、分镜卡片、立绘展示样式

## 4. 后续替换建议

### 4.1 如果只是替换角色立绘

优先修改：

- [public/portraits/shen-guzhou-rage.svg](public/portraits/shen-guzhou-rage.svg)
- [public/portraits/blackwind-rage.svg](public/portraits/blackwind-rage.svg)

如果文件名变化，再改：

- [src/web/visuals.ts](src/web/visuals.ts)

### 4.2 如果要替换整套场景美术

需要同时处理：

- 新增真实背景素材文件到 `public/` 下的专用目录
- 修改 [src/web/visuals.ts](src/web/visuals.ts) 中的场景映射
- 修改 [src/web/styles.css](src/web/styles.css) 中依赖纯 CSS 绘制的场景层

## 5. 当前结论

当前仓库里真正的独立美术文件只有两张 SVG 立绘；其余视觉表现多数仍由前端样式生成。后续如果你统一替换美术，建议优先保留代码结构，只替换 [src/web/visuals.ts](src/web/visuals.ts) 的映射和 `public/` 下的真实素材文件。