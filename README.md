# rw-owr

Cloudflare Workers 代理，用于 scratch-gui 的 sb3 文件上传和下载中转，存储在当前 GitHub 仓库中。

## 架构

```
scratch-gui ←→ Cloudflare Workers（代理加速）←→ 当前 GitHub 仓库（存储）
```

- **Cloudflare Workers**：接收 scratch-gui 请求，通过 GitHub API 操作当前仓库
- **当前仓库**：存储 .sb3 作品文件（`projects/` 目录），同时托管 Workers 代码
- **Token**：仅存储在 Workers Secrets 中，不会提交到 GitHub

## 部署步骤

### 1. 创建 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击「Generate new token」
3. 设置权限：`repo`（全部勾选）
4. 生成 Token，**复制保存**（只显示一次）

### 2. 在 Cloudflare Dashboard 部署

1. 登录 https://dash.cloudflare.com → 进入 **Workers & Pages**
2. 点击 **创建应用程序** → **创建 Worker**
3. 输入名称 `rw-owr` → **部署**
4. 进入 Worker 详情页 → 点击 **设置** → **变量**

#### 添加密钥（Secrets）：

| 密钥名 | 值 |
|--------|-----|
| `GITHUB_TOKEN` | 你创建的 Personal Access Token |

5. 点击 **快速编辑**，将 [src/index.js](src/index.js) 的内容粘贴进去
6. 点击 **部署**

## API 文档

### 上传文件

```
POST /upload
Content-Type: multipart/form-data
```

表单字段：`file` / `sb3` / `project` → .sb3 文件

响应：
```json
{
  "success": true,
  "id": "abc123XYZ",
  "filename": "project.sb3",
  "size": 12345,
  "folder": "projects/abc123XYZ",
  "url": "/projects/abc123XYZ/project.sb3",
  "downloadUrl": "/projects/abc123XYZ/project.sb3"
}
```

### 下载文件

```
GET /projects/{id}/{filename}
```

返回 .sb3 文件的二进制内容。

### 列出所有项目

```
GET /projects
```

### 删除项目

```
DELETE /projects/{id}/{filename}
```

## 文件结构

```
rw-owr/
├── src/
│   └── index.js        # Workers 代码
├── projects/           # 上传的 .sb3 文件存储目录（自动创建）
│   ├── abc123XYZ/
│   │   └── project.sb3
│   └── def456UVW/
│       └── my-project.sb3
├── wrangler.toml
├── package.json
└── README.md
```

## 安全说明

- ✅ GitHub Token 仅存储在 Cloudflare Workers Secrets 中
- ✅ 仓库信息硬编码在代码中，无需额外配置
- ✅ 只需要配置一个变量：`GITHUB_TOKEN`
