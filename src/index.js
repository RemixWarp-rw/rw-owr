function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(16);
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  const key = `projects/${fileId}/${filename}`;

  const metadata = {
    filename,
    size: fileBuffer.byteLength,
    uploadedAt: new Date().toISOString(),
    contentType: 'application/x.scratch.sb3',
  };

  await SB3_STORE.put(key, fileBuffer, {
    metadata,
  });

  const downloadUrl = `/projects/${fileId}/${encodeURIComponent(filename)}`;

  return jsonResponse({
    success: true,
    id: fileId,
    filename,
    size: fileBuffer.byteLength,
    key,
    url: downloadUrl,
    downloadUrl,
  }, 200, request);
}

async function handleDownload(request, pathname) {
  const key = pathname.replace(/^\//, '');

  const file = await SB3_STORE.get(key, 'arrayBuffer');
  if (!file) {
    return jsonResponse({ error: 'File not found' }, 404, request);
  }

  const metadata = await SB3_STORE.getWithMetadata(key, 'arrayBuffer');
  const meta = metadata && metadata.metadata ? metadata.metadata : {};
  const filename = meta.filename || key.split('/').pop() || 'project.sb3';
  const contentType = meta.contentType || 'application/x.scratch.sb3';

  return new Response(file, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': file.byteLength.toString(),
      'Cache-Control': 'public, max-age=31536000',
      ...corsHeaders(request),
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    Object.assign(globalThis, env);

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

    if (request.method === 'GET' && pathname === '/') {
      return jsonResponse({
        name: 'rw-owr',
        version: '1.0.0',
        endpoints: {
          upload: {
            method: 'POST',
            path: '/upload',
            description: 'Upload a scratch .sb3 project file',
            requestBody: 'multipart/form-data (field: file/sb3/project) OR raw binary',
          },
          download: {
            method: 'GET',
            path: '/projects/{id}/{filename}',
            description: 'Download a scratch .sb3 project file by ID',
          },
        },
      }, 200, request);
    }

    return jsonResponse({ error: 'Not found' }, 404, request);
  },
};
