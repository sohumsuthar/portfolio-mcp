import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Config from environment ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'sohumsuthar';
const GITHUB_REPO = process.env.GITHUB_REPO || 'suthar-portfolio';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const POSTS_DIR = process.env.POSTS_DIR || 'data/posts';
const PROJECTS_FILE = process.env.PROJECTS_FILE || 'data/projectsData.js';
const API_KEY = process.env.API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// --- GitHub API helpers ---
async function ghFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

function b64decode(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

function b64encode(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64');
}

// --- Frontmatter parsing (minimal, no dependency) ---
function parseFrontmatter(raw: string): { frontmatter: Record<string, any>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw };

  const fm: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Parse arrays: [tag1, tag2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/^['"]|['"]$/g, ''));
    }
    // Parse booleans
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Strip quotes
    else if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    fm[key] = value;
  }
  return { frontmatter: fm, content: match[2].trim() };
}

function buildFrontmatter(fm: Record<string, any>): string {
  const lines: string[] = ['---'];
  const keys = ['title', 'date', 'tags', 'draft', 'summary', 'pinned', 'pinnedtext'];
  const allKeys = [...new Set([...keys, ...Object.keys(fm)])];

  for (const key of allKeys) {
    if (!(key in fm)) continue;
    const value = fm[key];
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: '${value}'`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function titleToSlug(title: string): string {
  return title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

// --- Post operations via GitHub API ---
async function listPosts() {
  const data = await ghFetch(`/contents/${POSTS_DIR}?ref=${GITHUB_BRANCH}`);
  const posts = [];
  for (const file of data) {
    if (!file.name.endsWith('.mdx')) continue;
    const slug = file.name.replace(/\.mdx$/, '');
    const fileData = await ghFetch(`/contents/${POSTS_DIR}/${file.name}?ref=${GITHUB_BRANCH}`);
    const raw = b64decode(fileData.content);
    const { frontmatter, content } = parseFrontmatter(raw);
    posts.push({ slug, frontmatter, content });
  }
  return posts;
}

async function getPost(slug: string) {
  const fileData = await ghFetch(`/contents/${POSTS_DIR}/${slug}.mdx?ref=${GITHUB_BRANCH}`);
  const raw = b64decode(fileData.content);
  const { frontmatter, content } = parseFrontmatter(raw);
  return { slug, frontmatter, content, sha: fileData.sha };
}

async function createPost(frontmatter: Record<string, any>, content: string) {
  const slug = titleToSlug(frontmatter.title);
  const fm = buildFrontmatter(frontmatter);
  const fileContent = `${fm}\n\n${content}`;

  await ghFetch(`/contents/${POSTS_DIR}/${slug}.mdx`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Create post: ${frontmatter.title}`,
      content: b64encode(fileContent),
      branch: GITHUB_BRANCH,
    }),
  });

  return { slug, frontmatter, content };
}

async function updatePost(slug: string, updates: Record<string, any>, newContent?: string) {
  const existing = await getPost(slug);
  const mergedFm = { ...existing.frontmatter, ...updates };
  const body = newContent !== undefined ? newContent : existing.content;
  const fm = buildFrontmatter(mergedFm);
  const fileContent = `${fm}\n\n${body}`;

  await ghFetch(`/contents/${POSTS_DIR}/${slug}.mdx`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Update post: ${slug}`,
      content: b64encode(fileContent),
      sha: existing.sha,
      branch: GITHUB_BRANCH,
    }),
  });

  return { slug, frontmatter: mergedFm, content: body };
}

async function deletePost(slug: string) {
  const existing = await getPost(slug);
  await ghFetch(`/contents/${POSTS_DIR}/${slug}.mdx`, {
    method: 'DELETE',
    body: JSON.stringify({
      message: `Delete post: ${slug}`,
      sha: existing.sha,
      branch: GITHUB_BRANCH,
    }),
  });
}

// --- Project operations via GitHub API ---
async function listProjects() {
  const fileData = await ghFetch(`/contents/${PROJECTS_FILE}?ref=${GITHUB_BRANCH}`);
  const raw = b64decode(fileData.content);

  // Strip single-line comments (// ...)
  const stripped = raw.replace(/\/\/.*$/gm, '');

  // Match both `const projectsData = [...]` and `export const projectsData = [...]`
  const match = stripped.match(/(?:export\s+)?const\s+projectsData\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('Invalid projects file format');

  let jsonStr = match[1]
    // Replace single quotes with double quotes only if file uses them for values
    .replace(/:\s*'([^']*)'/g, ': "$1"')
    // Remove trailing commas
    .replace(/,\s*\]/g, ']')
    .replace(/,\s*}/g, '}')
    // Remove control characters inside strings (tabs, etc.)
    .replace(/[\t\r]/g, ' ');

  return { projects: JSON.parse(jsonStr), sha: fileData.sha, raw };
}

async function writeProjects(projects: any[], sha: string, message: string) {
  const projectLines = projects.map((p: any) => {
    const lines = ['{'];
    lines.push(`  title: '${(p.title || '').replace(/'/g, "\\'")}',`);
    lines.push(`  description: '${(p.description || '').replace(/'/g, "\\'")}',`);
    lines.push(`  imgSrc: '${(p.imgSrc || '').replace(/'/g, "\\'")}',`);
    lines.push(`  href: '${(p.href || '').replace(/'/g, "\\'")}',`);
    if (p.github) lines.push(`  github: '${p.github.replace(/'/g, "\\'")}',`);
    if (p.tech1) lines.push(`  tech1: '${p.tech1.replace(/'/g, "\\'")}',`);
    if (p.tech2) lines.push(`  tech2: '${p.tech2.replace(/'/g, "\\'")}',`);
    if (p.tech3) lines.push(`  tech3: '${p.tech3.replace(/'/g, "\\'")}',`);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
    lines.push('},');
    return lines.join('\n');
  });

  const content = `const projectsData = [\n${projectLines.join('\n')}\n];\n\nexport default projectsData;\n`;

  await ghFetch(`/contents/${PROJECTS_FILE}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: b64encode(content),
      sha,
      branch: GITHUB_BRANCH,
    }),
  });
}

// --- Auth ---
function validateAuth(req: VercelRequest): boolean {
  if (!API_KEY) return true;
  const token = req.headers.authorization?.replace('Bearer ', '');
  return token === API_KEY;
}

// --- Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse pathname from req.url
  const pathname = new URL(req.url!, `https://${req.headers.host}`).pathname;

  // Health check (no auth)
  if (pathname === '/health') {
    return res.json({ status: 'ok', github: `${GITHUB_OWNER}/${GITHUB_REPO}` });
  }

  // Auth check
  if (!validateAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check GitHub token
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  const method = req.method!;

  try {
    // --- Posts ---
    if (pathname === '/api/posts' && method === 'GET') {
      return res.json(await listPosts());
    }
    if (pathname.match(/^\/api\/posts\/[^/]+$/) && method === 'GET') {
      const slug = pathname.split('/')[3];
      const post = await getPost(slug);
      return res.json({ slug: post.slug, frontmatter: post.frontmatter, content: post.content });
    }
    if (pathname === '/api/posts' && method === 'POST') {
      const { content, ...frontmatter } = req.body;
      return res.status(201).json(await createPost(frontmatter, content));
    }
    if (pathname.match(/^\/api\/posts\/[^/]+$/) && method === 'PUT') {
      const slug = pathname.split('/')[3];
      const { content, ...updates } = req.body;
      return res.json(await updatePost(slug, updates, content));
    }
    if (pathname.match(/^\/api\/posts\/[^/]+$/) && method === 'DELETE') {
      const slug = pathname.split('/')[3];
      await deletePost(slug);
      return res.json({ message: 'Post deleted' });
    }

    // --- Projects ---
    if (pathname === '/api/projects' && method === 'GET') {
      const { projects } = await listProjects();
      return res.json(projects);
    }
    if (pathname === '/api/projects' && method === 'POST') {
      const { projects, sha } = await listProjects();
      projects.push(req.body);
      await writeProjects(projects, sha, `Create project: ${req.body.title}`);
      return res.status(201).json(req.body);
    }
    if (pathname.match(/^\/api\/projects\//) && method === 'PUT') {
      const title = decodeURIComponent(pathname.split('/').slice(3).join('/'));
      const { projects, sha } = await listProjects();
      const idx = projects.findIndex((p: any) => p.title === title);
      if (idx === -1) return res.status(404).json({ error: `Project not found: ${title}` });
      projects[idx] = { ...projects[idx], ...req.body };
      await writeProjects(projects, sha, `Update project: ${title}`);
      return res.json(projects[idx]);
    }
    if (pathname.match(/^\/api\/projects\//) && method === 'DELETE') {
      const title = decodeURIComponent(pathname.split('/').slice(3).join('/'));
      const { projects, sha } = await listProjects();
      const idx = projects.findIndex((p: any) => p.title === title);
      if (idx === -1) return res.status(404).json({ error: `Project not found: ${title}` });
      projects.splice(idx, 1);
      await writeProjects(projects, sha, `Delete project: ${title}`);
      return res.json({ message: 'Project deleted' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
