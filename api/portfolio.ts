import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PostTools } from '../src/post-tools';
import { ProjectTools } from '../src/project-tools';
import { GitTools } from '../src/git-tools';
import { loadConfig } from '../src/config';

// Authentication
const validateAuth = (req: VercelRequest): boolean => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return true; // No auth configured

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  return token === apiKey;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check (no auth required)
  if (req.nextUrl.pathname === '/health') {
    res.json({ status: 'ok' });
    return;
  }

  // Authenticate other requests
  if (!validateAuth(req)) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  try {
    const config = loadConfig();
    const postTools = new PostTools(config);
    const projectTools = new ProjectTools(config);
    const gitTools = new GitTools(config);

    const pathname = req.nextUrl.pathname;
    const method = req.method;

    // Posts endpoints
    if (pathname === '/api/posts' && method === 'GET') {
      const posts = postTools.listPosts();
      res.json(posts);
    } else if (pathname.match(/^\/api\/posts\/[^/]+$/) && method === 'GET') {
      const slug = pathname.split('/')[3];
      const post = postTools.getPost(slug);
      res.json(post);
    } else if (pathname === '/api/posts' && method === 'POST') {
      const { content, ...frontmatter } = req.body;
      const post = postTools.createPost(frontmatter, content);
      res.status(201).json(post);
    } else if (pathname.match(/^\/api\/posts\/[^/]+$/) && method === 'PUT') {
      const slug = pathname.split('/')[3];
      const { content, ...updates } = req.body;
      const post = postTools.updatePost(slug, updates, content);
      res.json(post);
    } else if (pathname.match(/^\/api\/posts\/[^/]+$/) && method === 'DELETE') {
      const slug = pathname.split('/')[3];
      postTools.deletePost(slug);
      res.json({ message: 'Post deleted' });
    }
    // Projects endpoints
    else if (pathname === '/api/projects' && method === 'GET') {
      const projects = projectTools.listProjects();
      res.json(projects);
    } else if (pathname === '/api/projects' && method === 'POST') {
      const project = projectTools.createProject(req.body);
      res.status(201).json(project);
    } else if (pathname.match(/^\/api\/projects\//) && method === 'PUT') {
      const title = decodeURIComponent(pathname.split('/')[3]);
      const project = projectTools.updateProject(title, req.body);
      res.json(project);
    } else if (pathname.match(/^\/api\/projects\//) && method === 'DELETE') {
      const title = decodeURIComponent(pathname.split('/')[3]);
      projectTools.deleteProject(title);
      res.json({ message: 'Project deleted' });
    }
    // Git endpoints
    else if (pathname === '/api/git/status' && method === 'GET') {
      const status = await gitTools.getStatus();
      res.json(status);
    } else if (pathname === '/api/git/commit-push' && method === 'POST') {
      const { message, confirmed } = req.body;
      const result = await gitTools.commitAndPush(message, confirmed);
      res.json(result);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
}
