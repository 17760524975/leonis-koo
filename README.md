# 方寸巧拼（Tangram）

一款微信小游戏 + 网页预览版的拼图游戏：**四巧板 120 关 + 七巧板 60 关**，纯 Canvas 绘制、零图片依赖的 UI、Web Audio 现场合成音乐。

> 原名《四巧·七巧》，v0.6 起改名为「方寸巧拼」。

## 玩法

- **四巧板**：4 块板拼指定剪影，120 关。
- **七巧板**：标准七巧板 7 块，60 关，分「几何 / 动物 / 人物 / 交通」等章节。
- 拖动摆放、拖拽或点手柄旋转（吸附 45°）、双击板件翻转、顶点/边/网格三层吸附。
- 三档提示（虚线轮廓 → 细实线轮廓 → 纯剪影），用提示星级封顶 ★★☆。
- 倒计时 + 3 颗生命，时间归零可看广告或花巧币复活；巧币/体力、每日任务、在线奖励、皮肤。

## 目录结构

```
js/                  核心逻辑（三端同源，唯一真源）
  config.js          所有可调参数与配色（改数值只改这里）
  geom.js            几何工具与缓动
  judge.js           栅格覆盖率判定（位掩码，支持 4/7 块）
  levels.js          关卡数据（四巧 120 + 七巧 60）
  core.js            渲染 / 交互 / 状态机
preview/             网页预览版（双击 index.html 即玩）
miniprogram/         微信小游戏工程（用微信开发者工具导入这一层）
tools/               构建、验收、截图、音频探针
docs/shots/          各版本验收截图
assets/              图片与音频素材
animation/ art-src/ audio-src/   动效演示、素材源文件
```

## 运行

**网页版**：直接双击 `preview/index.html`（无需服务器、无外网请求）。

**微信小游戏**：微信开发者工具 → 导入项目 → 选 `miniprogram/` 目录（`project.config.json` 里已配好 `compileType: "game"`）。

## 开发约定

- `js/` 是唯一真源，`preview/js/` 与 `miniprogram/js/` 由 `node tools/sync.js` 同步，**不要手改副本**。
- 改完必须跑：`node tools/sync.js && node tools/verify_v15.js && node tools/verify_v14.js && node tools/verify_v11.js && node tools/verify_audio.js && node tools/smoke.js`。
- 关卡数据变更需跑 `verify_levels.js` / `verify_tangram7.js` / `verify_tangram7_geometry.js`。
- 截图验收：`node tools/shot_v11.js`（提示/对局页）、`node tools/shot_v14.js`（设置页资料态/榜单头像）、`node tools/shot_v15.js`（在线奖励页/主页气泡/提示卡）。
- 玩家资料：`miniprogram/js/wxprofile.js`（只有小程序端有）；`core` 只认 `env.profile`，浏览器预览自动降级。
- 音频链路：`node tools/verify_audio.js`（wx 桩真跑 game.js）+ `tools/audio_probe.html`（真实浏览器跑预览端 `<audio>`）。
- 换关卡 BGM：把 mp3 丢进 `audio/`，按 `1_/2_/3_/4_` 前缀命名，跑 `cd tools/audiokit && node build.mjs`（90s/48kbps 单声道，4 首约 2.0MB）。
- 主页 BGM 不用文件：`AUDIO.pad` 里的和弦表 + `AUDIO.bgm.home=''` 决定，改和弦/速度只动配置。

## 版本

| 版本 | 内容 |
|---|---|
| v0.1~v0.2.2 | 四巧板 120 关、托盘 1:1、选关改图案缩略图 |
| v0.3 | 七巧板 60 关、章节分类、三档提示、吸附/手势/翻转 |
| v0.3.1~v0.3.4 | 旋转手柄外移、选中高亮、双击翻转、鲜花与通关音乐 |
| v0.4 | 翻转回归双击、彻底移除长按、删按钮 tip |
| v0.5 | 倒计时+生命、巧币/体力、主页四入口、皮肤、多首 BGM |
| v0.6 | 修 BGM 无声、主页版式、固定入口、底纹动效、鲜花持续化、改名方寸巧拼 |
| v0.7 | HUD 胶囊底框+统一字号+上移、设置下移到右列、进关体力 2 点、BGM 再提 10dB（含软限幅） |
| v0.7.1 | 巧币/体力胶囊改为等长（共用 pillW + pillMinW 兜底） |
| v0.8 | 结算页改成"成品图案+分享+连胜进度"、四巧板 120→30 关、新增排行榜 |
| v0.9 | 保留 T 字关、倒计时居中、工具区散放压缩、顶部广告位、云开发存档与真实榜单 |
| v0.10 | 提示统一为三档阶梯（指位置/指板件/看全图）+ 看广告/巧币入口、星级改封顶本局、云环境 ID 落地 |
| v0.11 | 提示改画在已上板件之上（摆歪时圈块+箭头）、BGM 换真人 mp3（每 5 关一首）、云开发权限指南 |
| v0.12 | 主页/关卡列表改回合成柔和和弦（删 bgm_home.mp3）、关卡仍用 4 首真人 mp3 |
| v0.13 | 主页换成 8 小节四声部轻音乐、切场景零延迟（预载+同步切）、四首关卡曲响度对齐 |
| v0.14 | 微信登录态下的玩家资料：`createUserInfoButton` 授权拿微信昵称头像、`showKeyboard` 改名、设置页资料卡、榜单头像、云端 `players` 加 nick/avatar/src/auth |
| v0.14.1 | 修「进关卡音乐没了/卡顿」：预载不再 `play→pause` 掐正在放的曲、只做一次、解锁当拍不再同步解码；首播看门狗；进关卡主页曲 150ms 淡出让位 |
| v0.14.2 | 修「回主页没音乐」：WebAudioContext 被系统挂起后自动 `resume`（homeStart / tick / 每次点击 / 切前台），闸门写入防被旧淡出覆盖 |
| v0.15 | 每日在线奖励页：今日累计在线时长 + 6 档（1/5/10/20/40/60 分钟）按档领取，每日 0 点清零；新增「提示卡」道具并在提示面板可直接使用 |

## 代码存档

- GitHub：`https://github.com/17760524975/leonis-koo.git`，分支 **`tangram`**（另打 `v0.6.0` / `v0.7.0` / `v0.7.1` 标签）
- 推送：`git push origin master:tangram && git push origin --tags`
- 不入库：`tools/out/`（截图产物）、`node_modules/`、一次性补丁脚本（`.gitignore` 已排除）

## 素材替换

- 图片：`assets/img/` 下同名替换即可，代码零改动。
- 音频：默认代码合成 5 首场景曲（零文件）；换真人 BGM 把音频放进 `assets/audio/` 并将 `config.AUDIO.useSynthBgm` 设为 `false`。
- 图标目前是 `drawIcon()` 矢量绘制，换美术图需接一层「图标名 → 图片」映射。
- 微信小游戏包体：主包 ≤ 4MB、整包 ≤ 30MB；当前约 1.6MB。
