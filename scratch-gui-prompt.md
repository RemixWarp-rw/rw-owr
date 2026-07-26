# Scratch-GUI 修改 AI 提示词

> 以下提示词用于交给 AI 修改 remixwarp/scratch-gui（或 MistWarp/scratch-gui），
> 使其能够通过 Cloudflare Workers 代理上传和下载 .sb3 作品文件。
> 请根据实际 Workers 部署地址替换 `YOUR_WORKERS_URL`。

---

## 提示词 1：添加上传到 Workers 代理的功能

```
你正在修改 remixwarp/scratch-gui 项目。请添加一个功能：将当前编辑的 .sb3 作品文件上传到 Cloudflare Workers 代理服务器。

## 背景
我们搭建了一个 Cloudflare Workers 代理服务（rw-owr），用于中转 scratch 作品文件的上传和下载。
Workers 部署地址：YOUR_WORKERS_URL

## Workers API

### 上传接口
- 方法：POST
- 地址：YOUR_WORKERS_URL/upload
- 请求体：multipart/form-data，字段名为 "file"，值为 .sb3 文件
- 或者也可以直接以二进制 body 上传，query string 加 ?filename=xxx.sb3
- 响应（JSON）：
  {
    "success": true,
    "id": "文件ID字符串",
    "filename": "project.sb3",
    "size": 12345,
    "url": "/projects/xxx/project.sb3",
    "downloadUrl": "/projects/xxx/project.sb3"
  }
- 完整下载地址 = YOUR_WORKERS_URL + downloadUrl

### 下载接口
- 方法：GET
- 地址：YOUR_WORKERS_URL/projects/{id}/{filename}
- 响应：二进制 .sb3 文件，Content-Type: application/x.scratch.sb3

## 要求

1. **新增菜单项**：在菜单栏（File 菜单或顶部工具栏）添加一个新的按钮/菜单项，比如「上传到云端」或「Share via Proxy」。

2. **上传逻辑**：
   - 点击后，先通过 VM 的 `saveProjectSb3()` 或类似方法导出当前项目为 .sb3 二进制数据（Blob / ArrayBuffer）。
   - 使用 FormData 包装，字段名为 "file"。
   - POST 到 YOUR_WORKERS_URL/upload。
   - 支持 CORS（Workers 端已配置好）。

3. **结果展示**：
   - 上传成功后，弹出一个对话框/提示，显示：
     - 作品ID
     - 完整的下载链接（可点击复制）
     - 「复制链接」按钮
   - 上传失败时显示错误信息。

4. **加载功能**：
   - 在 File 菜单的「从电脑加载」旁边，新增一个「从链接加载」或「Load from Proxy」选项。
   - 用户输入作品 ID 或完整 URL 后，从 YOUR_WORKERS_URL/projects/{id}/{filename} 下载 .sb3 文件，然后加载到编辑器中。
   - 如果只输入了 ID，就自动拼出下载地址（可以先尝试 YOUR_WORKERS_URL/projects/{id}/project.sb3，或者让用户输入完整 URL）。

5. **代码位置**：
   - 在 scratch-gui 的 `src/containers/` 或 `src/components/` 中合适的位置添加组件。
   - 尽量遵循现有的代码风格和目录结构。
   - 不需要改动 scratch-vm，只改 scratch-gui。
   - 使用现有的国际化（l10n）机制来添加新字符串。

6. **配置项**：
   - 将 Workers 基础地址做成可配置项，比如放在一个常量文件或环境变量中，方便后续修改。
   - 例如 `src/lib/proxy-config.js` 之类的文件。

请按照现有代码风格实现以上功能，并确保不破坏原有功能。
```

---

## 提示词 2：URL Hash 自动加载（可选增强）

```
你正在修改 remixwarp/scratch-gui 项目。请添加一个功能：当 URL 中包含特定 hash 参数时，自动从 Cloudflare Workers 代理加载 .sb3 作品文件。

## 背景
Workers 代理地址：YOUR_WORKERS_URL
上传后返回的作品 ID 形如 `abc123XYZ`
完整下载地址：YOUR_WORKERS_URL/projects/{id}/{filename}

## 要求

1. **URL 格式支持**：
   - 当 URL 形如 `editor.html#proxy=abc123XYZ` 或 `editor.html#project=abc123XYZ` 时
   - 自动从 Workers 代理下载该 ID 对应的 .sb3 文件并加载到编辑器
   - 支持 `#proxy=id/filename.sb3` 的格式（指定文件名）

2. **加载流程**：
   - 应用启动时检查 URL hash
   - 如果检测到 proxy/project 参数，显示加载中提示
   - 使用 fetch 从 YOUR_WORKERS_URL/projects/{id}/{filename} 下载
   - 下载完成后调用 VM 的加载接口加载项目
   - 出错时显示友好的错误提示

3. **与已有功能兼容**：
   - 不影响原有的 `#editor`、`#123`（Scratch 项目 ID）等 hash 格式
   - 只在检测到 proxy/project 参数时触发新逻辑

4. **代码位置**：
   - 在 scratch-gui 的入口文件或 app.jsx / gui.jsx 中合适的位置添加
   - 与现有的 onProjectIdLoaded / 项目加载逻辑保持一致的风格

请实现以上功能，保持代码风格统一。
```

---

## 提示词 3：极简版本（只改上传下载，不增加 UI）

```
你正在修改 remixwarp/scratch-gui 项目。请修改项目的保存和加载逻辑，使其可以通过 Cloudflare Workers 代理进行中转。

## 背景
由于国内访问 Scratch 服务器缓慢，我们搭建了一个 Cloudflare Workers 代理来加速 .sb3 文件的上传和下载。
Workers 地址：YOUR_WORKERS_URL

## Workers API

### 上传
POST YOUR_WORKERS_URL/upload
- multipart/form-data, field: file
- 响应 JSON: { success, id, filename, downloadUrl }

### 下载
GET YOUR_WORKERS_URL/projects/{id}/{filename}
- 返回 .sb3 二进制

## 要求

1. **替换保存逻辑**（可选，或者新增一个保存方式）：
   - 在原有「保存到电脑」之外，新增一种「保存到云端代理」的方式
   - 导出 .sb3 → 上传到 Workers → 返回可分享链接

2. **替换加载逻辑**（可选，或者新增一种加载方式）：
   - 在原有「从电脑加载」之外，新增「从代理链接加载」
   - 输入 URL 或 ID → 从 Workers 下载 → 加载到编辑器

3. **尽量少改动**：
   - 只添加新功能，不删除或修改原有功能
   - UI 上只在 File 菜单加两个新选项即可
   - 代码放到新文件或单独的模块中，方便维护

请按照 scratch-gui 现有代码风格实现。
```

---

## 使用说明

1. 将 `YOUR_WORKERS_URL` 替换为你实际部署的 Workers 地址，例如 `https://rw-owr.your-account.workers.dev`
2. 选择合适的提示词（推荐从「提示词 1」开始）
3. 把提示词交给 AI 来修改 scratch-gui 代码库
4. 测试上传和下载功能是否正常工作
