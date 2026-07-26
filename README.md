# rw-owr

Cloudflare Workers 代理，用于 scratch-gui 的 sb3 文件上传和下载中转，存储在 GitHub 仓库中。

## 架构

```
scratch-gui ←→ Cloudflare Workers（代理加速）←→ GitHub API（存储）
```

- **Cloudflare Workers**：接收 scratch-gui 请求，通过 GitHub API 操作仓库
- **GitHub 仓库**：存储 .sb3 作品文件，同时托管 Workers 代码
- **Token**：存储在 Workers 环境变量（Secrets）中，不会提交到 GitHub

## 部署步骤

### 1. 创建 GitHub 仓库

1. 在 GitHub 上创建一个新仓库（公开或私有均可）
2. 复制仓库地址

### 2. 创建 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击「Generate new token」
3. 设置权限：`repo`（全部勾选）
4. 生成 Token，**复制保存**（只显示一次）

### 3. 在 Cloudflare Dashboard 部署

#### 方法一：图形界面部署（推荐）

1. 登录 https://dash.cloudflare.com → 进入 **Workers & Pages**
2. 点击 **创建应用程序** → **创建 Worker**
3. 输入名称（如 `rw-owr`）→ **部署**
4. 进入 Worker 详情页 → 点击 **设置** → **变量**

##### 添加环境变量（普通变量）：

| 变量名 | 值 |
|--------|-----|
| `ALLOWED_ORIGINS` | `*`（开发环境）或你的域名 |
| `GITHUB_REPO_OWNER` | 你的 GitHub 用户名 |
| `GITHUB_REPO_NAME` | 你的仓库名 |
| `GITHUB_BRANCH` | `main` 或其他分支名 |

##### 添加密钥（Secrets）：

| 密钥名 | 值 |
|--------|-----|
| `GITHUB_TOKEN` | 你创建的 Personal Access Token |

5. 点击 **快速编辑**，将 [src/index.js](src/index.js) 的内容粘贴进去
6. 点击 **部署**

#### 方法二：使用 Wrangler CLI

```bash
# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 设置环境变量
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO_OWNER
npx wrangler secret put GITHUB_REPO_NAME

# 或修改 wrangler.toml 后部署
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

响应：
```json
{
  "success": true,
  "projects": [...],
  "count": 10
}
```

### 删除项目

```
DELETE /projects/{id}/{filename}
```

## 文件结构

```
github-repo/
├── src/
│   └── index.js        # Workers 代码
├── projects/           # 上传的 .sb3 文件存储目录
│   ├── abc123XYZ/
│   │   └── project.sb3
│   └── def456UVW/
│       └── my-project.sb3
├── wrangler.toml       # Workers 配置（不含 Token）
├── package.json
└── README.md
```

## 注意事项

- GitHub Token 仅存储在 Cloudflare Workers 的 Secrets 中，不会出现在代码或仓库中
- GitHub 仓库可以是私有仓库，只有 Workers 能通过 Token 访问
- .sb3 文件存储在 `projects/{id}/` 目录下，每个文件有唯一的随机 ID
- Cloudflare Workers 在全球有 CDN 节点，国内访问速度快
