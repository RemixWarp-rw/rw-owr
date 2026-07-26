# Scratch-GUI 修改 AI 提示词

---

## 提示词：添加通过 Cloudflare Workers 代理上传/下载 .sb3 文件的功能

```
你正在修改 remixwarp/scratch-gui（或 MistWarp/scratch-gui）项目。请添加功能：通过 Cloudflare Workers 代理上传和下载 .sb3 作品文件，Workers 背后使用 GitHub 仓库作为存储。

## 背景
我们搭建了一个 Cloudflare Workers 代理服务（rw-owr），用于中转 scratch 作品文件的上传和下载。由于国内访问 GitHub 缓慢，Cloudflare Workers 作为加速代理。

Workers 部署地址：YOUR_WORKERS_URL（例如：https://rw-owr.your-account.workers.dev）

## Workers API

### 上传接口
- 方法：POST
- 地址：YOUR_WORKERS_URL/upload
- 请求体：multipart/form-data，字段名为 "file"，值为 .sb3 文件
- 响应（JSON）：
  {
    "success": true,
    "id": "abc123XYZ",
    "filename": "project.sb3",
    "size": 12345,
    "folder": "projects/abc123XYZ",
    "url": "/projects/abc123XYZ/project.sb3",
    "downloadUrl": "/projects/abc123XYZ/project.sb3"
  }
- 完整下载地址 = YOUR_WORKERS_URL + downloadUrl

### 下载接口
- 方法：GET
- 地址：YOUR_WORKERS_URL/projects/{id}/{filename}
- 响应：二进制 .sb3 文件，Content-Type: application/x.scratch.sb3

### 列出所有项目（可选）
- 方法：GET
- 地址：YOUR_WORKERS_URL/projects
- 响应（JSON）：
  {
    "success": true,
    "projects": [...],
    "count": 10
  }

## 要求

1. **新增菜单项**：在菜单栏（File 菜单）添加两个新菜单项：
   - 「上传到云端」或「Share via Proxy」
   - 「从链接加载」或「Load from Proxy」

2. **上传逻辑**：
   - 点击「上传到云端」后，通过 VM 的 `saveProjectSb3()` 方法导出当前项目为 .sb3 二进制数据
   - 使用 FormData 包装，字段名为 "file"
   - POST 到 YOUR_WORKERS_URL/upload
   - Workers 端已配置 CORS，无需额外处理

3. **上传结果展示**：
   - 上传成功后，弹出对话框显示：
     - 作品ID
     - 完整的下载链接（可点击）
     - 「复制链接」按钮
   - 上传失败时显示错误信息

4. **加载逻辑**：
   - 点击「从链接加载」后，弹出输入框让用户输入作品链接或ID
   - 如果输入的是完整 URL（包含 http），直接使用该 URL
   - 如果只输入了 ID，自动拼出下载地址：YOUR_WORKERS_URL/projects/{id}/project.sb3
   - 使用 fetch 下载 .sb3 文件（arrayBuffer）
   - 调用 VM 的 `loadProject()` 方法加载到编辑器中

5. **代码位置**：
   - 在 scratch-gui 的 `src/components/menu-bar/file-menu.jsx` 中添加菜单项
   - 在 `src/containers/file-menu-container.jsx` 中添加处理函数
   - 使用现有的国际化（l10n）机制添加新字符串
   - 不要改动 scratch-vm，只改 scratch-gui

6. **配置项**：
   - 将 Workers 基础地址做成可配置项，放在单独的配置文件中
   - 例如创建 `src/lib/proxy-config.js`：
     ```js
     export const PROXY_BASE_URL = 'YOUR_WORKERS_URL';
     ```
   - 后续修改地址时只需改这一个文件

7. **兼容性**：
   - 不破坏原有功能（保存到电脑、从电脑加载）
   - 新增功能作为额外选项

请按照现有代码风格实现以上功能。
```

---

## 使用说明

1. 将 `YOUR_WORKERS_URL` 替换为实际部署的 Workers 地址
2. 将提示词交给 AI，AI 会帮你修改 scratch-gui 代码
3. 修改完成后构建测试
