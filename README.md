# 隐脉申城

隐脉申城是一个面向 1930 年代上海地下革命网络的历史数据可视化平台，使用上海图书馆开放数据及竞赛支持机构数据，组织人物、地点、事件、机构和人物关系。

## 主要功能

- 3D 档案大厅
- 人物画像与检索
- 时空地图
- 关系网络
- 历史时间轴
- 机构和异常发现

## 数据说明

本项目数据来自第十一届上海图书馆开放数据竞赛官方接口。竞赛开放数据仅授权本届竞赛非商业使用，禁止篡改、伪造或用于任何非法及未授权用途。

- 数据来源与授权说明见 [DATA_SOURCES.md](DATA_SOURCES.md)
- 授权限制见 [DATA_LICENSE.md](DATA_LICENSE.md)
- 原始字段、清洗字段和衍生字段说明见 `public/data/provenance.json`

## 本地运行

```powershell
npm install
python scripts/fetch_full.py
npm run dev
```

生产构建：

```powershell
npm run build
npm run preview
```

## GitHub Pages 部署

项目使用 HashRouter，可直接部署到 GitHub Pages：

```powershell
npm run build
npm run deploy
```

`deploy` 脚本会把 `dist/` 发布到当前仓库的 `gh-pages` 分支。

当前 `vite.config.ts` 的 `base` 是 `/yin-mai-shencheng/`。如果仓库名不同，请同步修改该值。

## 提交前检查

```powershell
python scripts/verify_submission.py
powershell -ExecutionPolicy Bypass -File scripts/prepare_submission.ps1
```
