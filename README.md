# Glow Mend Portfolio

Kim Chou 的互动角色作品网站，使用 Next.js 16、React 19、TypeScript 与 GSAP，静态导出到 Netlify。包含首页项目环、Work 横向作品列表，以及三个角色详情页。

## 本地运行

需要 Node.js 24。

```sh
npm ci
npm run dev
```

## 检查与构建

```sh
npm run typecheck
npm run lint
node scripts/test-gallery-playback.mjs
CHARACTER_INDEX=0 node scripts/test-character-interaction.mjs
CHARACTER_INDEX=1 node scripts/test-character-interaction.mjs
CHARACTER_INDEX=2 node scripts/test-character-interaction.mjs
npm run build
```

`out/` 为可直接部署的静态网站。预览生产版本可运行 `python3 -m http.server 3000 --directory out`；静态导出不使用 `next start`。

## 页面与编辑

- `/`：视频开场与首页项目环。
- `/work/`：Glow Mend 系列横向作品列表。
- `/work/halden-farm/`：Shield Soother／心盾抚慰师。
- `/work/fieldwork-co/`：Mind Trimmer／思绪修整师。
- `/work/merel-skin/`：Gloom Blaster／坏情绪清除师。

文案、图片、视频及角色互动对应关系集中在 `src/data/portfolio.json`，页面样式位于 `src/app/globals.css`。素材位于 `public/assets/`。

三个详情页均有两项展示：第一项以静音帧图集实现鼠标方向跟随，点击头、手、裤子按钮播放一次带原声动作；第二项播放各角色的“翻页1”视频。翻页、离开角色或隐藏页面时停止相应播放。媒体区域不做四周虚化。头部跟随映射使用素材中已有姿态，并非实时三维模型。

开场视频尝试带原声播放，浏览器可能限制未经用户操作的有声自动播放。`?intro=replay` 可重播开场。

## Netlify

仓库根目录 `netlify.toml` 设置 Node.js 24、构建命令 `npm run build`、发布目录 `out`，并关闭 Next.js 服务端适配器。生产分支使用 `main`。无运行时密钥或数据库需求；不添加将所有路径改写到首页的规则。

首次在 Netlify 连接此 GitHub 仓库并选择 `main` 后，后续推送将自动构建部署。账号绑定 `.netlify/` 与 `.openai/` 不进入仓库。原有 Sites 网站独立保留。

## 可选：重新处理原始素材

构建已直接使用仓库内准备好的素材，不需要原始视频、Python 或 FFmpeg。仅在替换素材时使用 `scripts/prepare-*.py`。

安装 Pillow 和 FFmpeg，并设置：

```sh
export CHARACTER_SOURCE_DIR="/path/to/original-assets"
# 如果 FFmpeg 不在 PATH，可指定：
export FFMPEG_BIN="/path/to/ffmpeg"
python3 scripts/prepare-character-three.py
python3 scripts/prepare-gallery-videos.py
```

素材根目录包含 `角色1`、`角色2`、`角色3` 文件夹；具体文件名见各脚本。`prepare-character-media.py` 是角色1旧版 look-v2 准备脚本，当前角色1 look-v3 由 `prepare-character-three.py` 使用 `头部环绕-2.mp4` 生成。

## 来源

工程起始模板：[JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)。原版 MIT 许可保留在 `LICENSE`。布局与动效最初参考 [Theo Portfolio](https://theoportfolio.framer.photos/)，再按 Kim Chou 的设计和角色素材调整。第三方字体与素材的权利归各自权利人，模板许可不自动覆盖这些素材。
