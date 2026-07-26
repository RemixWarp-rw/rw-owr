const REPO_OWNER = 'XiaoXiaoLang';
const REPO_NAME = 'rw-owr';
const REPO_BRANCH = 'main';

async function getGitHubToken() {
  return GITHUB_TOKEN;
}

async function getGitHubApiUrl(path) {
  const base = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
  return `${base}${path}`;
}

async function fetchGitHubApi(path, options = {}) {
  const url = getGitHubApiUrl(path);
  const token = await getGitHubToken();
  
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }
  
  return response;
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

function isOriginAllowed(origin) {
  const allowed = ALLOWED_ORIGINS || '*';
  if (allowed === '*') return true;
  const origins = allowed.split(',');
  return origins.includes(origin);
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = isOriginAllowed(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200, request = null) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(request ? corsHeaders(request) : {}),
  };
  return new Response(JSON.stringify(data), { status, headers });
}

async function handleUpload(request) {
  const contentType = request.headers.get('Content-Type') || '';

  let filename = '';
  let fileBuffer = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const fileEntry = formData.get('file') || formData.get('sb3') || formData.get('project');
    if (!fileEntry || typeof fileEntry.arrayBuffer !== 'function') {
      return jsonResponse({ error: 'No file uploaded. Expected field: "file", "sb3", or "project"' }, 400, request);
    }
    filename = fileEntry.name || 'project.sb3';
    fileBuffer = await fileEntry.arrayBuffer();
  } else {
    fileBuffer = await request.arrayBuffer();
    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return jsonResponse({ error: 'Empty request body' }, 400, request);
    }
    const url = new URL(request.url);
    filename = url.searchParams.get('filename') || 'project.sb3';
  }

  if (fileBuffer.byteLength === 0) {
    return jsonResponse({ error: 'Empty file' }, 400, request);
  }

  const fileId = generateId();
  const folder = `projects/${fileId}`;
  const filePath = `${folder}/${filename}`;

  const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

  const githubData = {
    message: `Upload project ${fileId}: ${filename}`,
    content: base64Content,
    branch: REPO_BRANCH,
  };

  try {
    const response = await fetchGitHubApi(`/contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify(githubData),
    });

    const result = await response.json();
    const downloadUrl = `/projects/${fileId}/${encodeURIComponent(filename)}`;
    const rawUrl = result.content.download_url;

    return jsonResponse({
      success: true,
      id: fileId,
      filename,
      size: fileBuffer.byteLength,
      folder,
      filePath,
      url: downloadUrl,
      downloadUrl,
      rawUrl,
      commit: {
        sha: result.commit.sha,
        url: result.commit.url,
      },
    }, 200, request);
  } catch (error) {
    console.error('GitHub upload error:', error);
    return jsonResponse({ error: 'Failed to upload to GitHub: ' + error.message }, 500, request);
  }
}

async function handleDownload(request, pathname) {
  const url = new URL(request.url);
  const parts = pathname.replace(/^\//, '').split('/');
  
  if (parts.length < 3) {
    return jsonResponse({ error: 'Invalid path format. Expected: /projects/{id}/{filename}' }, 400, request);
  }

  const fileId = parts[1];
  const filename = decodeURIComponent(parts.slice(2).join('/'));
  const filePath = `projects/${fileId}/${filename}`;

  try {
    const response = await fetchGitHubApi(`/contents/${filePath}`);
    const result = await response.json();

    if (!result.content) {
      return jsonResponse({ error: 'File not found' }, 404, request);
    }

    const binaryContent = atob(result.content);
    const buffer = new Uint8Array(binaryContent.length);
    for (let i = 0; i < binaryContent.length; i++) {
      buffer[i] = binaryContent.charCodeAt(i);
    }

    const headers = {
      'Content-Type': result.content_type || 'application/x.scratch.sb3',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.byteLength.toString(),
      'Cache-Control': 'public, max-age=31536000',
      ...corsHeaders(request),
    };

    return new Response(buffer, { status: 200, headers });
  } catch (error) {
    console.error('GitHub download error:', error);
    if (error.message.includes('404')) {
      return jsonResponse({ error: 'File not found' }, 404, request);
    }
    return jsonResponse({ error: 'Failed to download from GitHub: ' + error.message }, 500, request);
  }
}

async function handleListProjects(request) {
  try {
    const response = await fetchGitHubApi('/contents/projects');
    const folders = await response.json();

    if (!Array.isArray(folders)) {
      return jsonResponse({ error: 'Projects directory not found' }, 404, request);
    }

    const projects = [];
    for (const folder of folders) {
      if (folder.type === 'dir') {
        const fileResponse = await fetchGitHubApi(`/contents/${folder.path}`);
        const files = await fileResponse.json();
        
        if (Array.isArray(files)) {
          const sb3Files = files.filter(f => f.name.endsWith('.sb3'));
          for (const file of sb3Files) {
            projects.push({
              id: folder.name,
              filename: file.name,
              size: file.size,
              url: `/projects/${folder.name}/${encodeURIComponent(file.name)}`,
              lastModified: file.last_modified,
            });
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      projects,
      count: projects.length,
    }, 200, request);
  } catch (error) {
    console.error('GitHub list error:', error);
    return jsonResponse({ error: 'Failed to list projects: ' + error.message }, 500, request);
  }
}

async function handleDeleteProject(request, pathname) {
  const parts = pathname.replace(/^\//, '').split('/');
  
  if (parts.length < 3) {
    return jsonResponse({ error: 'Invalid path format. Expected: /projects/{id}/{filename}' }, 400, request);
  }

  const fileId = parts[1];
  const filename = decodeURIComponent(parts.slice(2).join('/'));
  const filePath = `projects/${fileId}/${filename}`;

  try {
    const infoResponse = await fetchGitHubApi(`/contents/${filePath}`);
    const info = await infoResponse.json();

    if (!info.sha) {
      return jsonResponse({ error: 'File not found' }, 404, request);
    }

    const deleteData = {
      message: `Delete project ${fileId}: ${filename}`,
      sha: info.sha,
      branch: REPO_BRANCH,
    };

    await fetchGitHubApi(`/contents/${filePath}`, {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
    });

    return jsonResponse({
      success: true,
      id: fileId,
      filename,
      message: 'File deleted successfully',
    }, 200, request);
  } catch (error) {
    console.error('GitHub delete error:', error);
    if (error.message.includes('404')) {
      return jsonResponse({ error: 'File not found' }, 404, request);
    }
    return jsonResponse({ error: 'Failed to delete from GitHub: ' + error.message }, 500, request);
  }
}

export default {
  async fetch(request, env, ctx) {
    Object.assign(globalThis, env);

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (request.method === 'POST' && pathname === '/upload') {
      return handleUpload(request);
    }

    if (request.method === 'GET' && pathname.startsWith('/projects/')) {
      return handleDownload(request, pathname);
    }

    if (request.method === 'GET' && pathname === '/projects') {
      return handleListProjects(request);
    }

    if (request.method === 'DELETE' && pathname.startsWith('/projects/')) {
      return handleDeleteProject(request, pathname);
    }

    if (request.method === 'GET' && pathname === '/') {
      return jsonResponse({
        name: 'rw-owr',
        version: '2.0.0',
        description: 'Cloudflare Workers proxy for scratch-gui with GitHub storage',
        endpoints: {
          upload: {
            method: 'POST',
            path: '/upload',
            description: 'Upload a scratch .sb3 project file to GitHub',
            requestBody: 'multipart/form-data (field: file/sb3/project) OR raw binary',
          },
          download: {
            method: 'GET',
            path: '/projects/{id}/{filename}',
            description: 'Download a scratch .sb3 project file from GitHub',
          },
          list: {
            method: 'GET',
            path: '/projects',
            description: 'List all uploaded projects',
          },
          delete: {
            method: 'DELETE',
            path: '/projects/{id}/{filename}',
            description: 'Delete a project from GitHub',
          },
        },
        storage: {
          type: 'GitHub Repository',
          owner: REPO_OWNER,
          repo: REPO_NAME,
          branch: REPO_BRANCH,
        },
      }, 200, request);
    }

    return jsonResponse({ error: 'Not found' }, 404, request);
  },
};
