# Scratch-GUI 修改 AI 提示词

---

## 提示词：添加上传到 Cloudflare Workers 代理的功能

```
你正在修改 remixwarp/scratch-gui（或 MistWarp/scratch-gui）项目。请添加功能：将当前编辑的 .sb3 作品文件上传到 Cloudflare Workers 代理。

## 背景
Workers 代理地址：https://api-owr.rewp.de5.net/
作用：把作品文件推送到 GitHub 仓库存储，Workers 作为加速代理。

## 上传 API

- 方法：POST
- 地址：https://api-owr.rewp.de5.net/upload
- 请求体：multipart/form-data，字段名为 "file"，值为 .sb3 文件
- 响应（JSON）：
  {
    "success": true,
    "id": "abc123XYZ",
    "filename": "project.sb3",
    "size": 12345,
    "url": "/projects/abc123XYZ/project.sb3",
    "downloadUrl": "/projects/abc123XYZ/project.sb3"
  }
- 完整下载地址 = https://api-owr.rewp.de5.net + downloadUrl

## 要求

1. **新增菜单项**：在 File 菜单中添加一个新菜单项，比如「上传到云端」或「分享作品」。

2. **上传逻辑**：
   - 点击菜单项后，通过 VM 的 `saveProjectSb3()` 方法导出当前项目为 .sb3 二进制数据
   - 使用 FormData 包装，字段名为 "file"
   - POST 到 https://api-owr.rewp.de5.net/upload
   - Workers 端已配置 CORS，浏览器可直接调用

3. **结果展示**：
   - 上传成功后，弹出对话框显示：
     - 作品ID
     - 完整的下载链接
     - 「复制链接」按钮
   - 上传失败时显示错误信息

4. **代码位置**：
   - 在 `src/components/menu-bar/file-menu.jsx` 中添加菜单项
   - 在 `src/containers/file-menu-container.jsx` 中添加处理函数
   - 使用现有的国际化（l10n）机制添加新字符串
   - 不要改动 scratch-vm，只改 scratch-gui

5. **配置项**：
   - 将 Workers 基础地址做成可配置项，比如创建 `src/lib/proxy-config.js`：
     export const PROXY_BASE_URL = 'https://api-owr.rewp.de5.net';
   - 后续修改地址时只需改这一个文件

6. **兼容性**：
   - 不破坏原有功能（保存到电脑等）
   - 新增功能作为额外选项

请按照现有代码风格实现以上功能。
```

---

## 使用说明

直接把上面的提示词交给 AI，AI 会帮你修改 scratch-gui 代码。
