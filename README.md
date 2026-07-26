# rw-owr

Cloudflare Workers 代理，用于 scratch-gui 的 sb3 文件上传和下载中转。

## 功能

- **上传接口** `POST /upload` — 接收 scratch-gui 上传的 .sb3 文件，存储到 Cloudflare KV
- **下载接口** `GET /projects/{id}/{filename}` — 根据文件 ID 返回对应的 .sb3 文件
- **CORS 支持** — 允许跨域访问，方便 scratch-gui 直接调用

## 部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 KV 命名空间

```bash
npx wrangler kv:namespace create SB3_STORE
```

将输出的 `id` 填入 `wrangler.toml` 中的 `kv_namespaces[0].id`。

同时创建预览命名空间：

```bash
npx wrangler kv:namespace create SB3_STORE --preview
```

将输出的 `id` 填入 `wrangler.toml` 中的 `kv_namespaces[0].preview_id`。

### 4. 开发调试

```bash
npm run dev
```

### 5. 部署到生产环境

```bash
npm run deploy
```

## API 文档

### 上传文件

```
POST /upload
Content-Type: multipart/form-data
```

表单字段：
- `file` / `sb3` / `project`：.sb3 文件

响应：
```json
{
  "success": true,
  "id": "文件ID",
  "filename": "project.sb3",
  "size": 12345,
  "key": "projects/xxx/project.sb3",
  "url": "/projects/xxx/project.sb3",
  "downloadUrl": "/projects/xxx/project.sb3"
}
```

也支持直接以二进制 body 上传（需在 query string 加 `?filename=xxx.sb3`）。

### 下载文件

```
GET /projects/{id}/{filename}
```

返回 .sb3 文件的二进制内容，`Content-Type: application/x.scratch.sb3`。
