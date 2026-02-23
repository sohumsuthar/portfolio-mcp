import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { PostTools } from './post-tools.js';
import { ProjectTools } from './project-tools.js';
import { GitTools } from './git-tools.js';

const config = loadConfig();
const postTools = new PostTools(config);
const projectTools = new ProjectTools(config);
const gitTools = new GitTools(config);

const app = express();

// Security: CORS with restricted origins
const allowedOrigins = [
  'https://sohumsuthar.com',
  'http://localhost:3000',
  process.env.ALLOWED_ORIGIN || ''
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Security: API key authentication middleware
const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  const expectedKey = process.env.API_KEY;

  // Allow health check without auth
  if (req.path === '/health') {
    return next();
  }

  if (!expectedKey) {
    console.warn('Warning: API_KEY not set in environment');
    return next(); // For development
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  next();
};

app.use(apiKeyAuth);

// Security: Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Posts endpoints
app.get('/api/posts', (req: Request, res: Response) => {
  try {
    const posts = postTools.listPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get('/api/posts/:slug', (req: Request, res: Response) => {
  try {
    const post = postTools.getPost(req.params.slug);
    res.json(post);
  } catch (error) {
    res.status(404).json({ error: String(error) });
  }
});

app.post('/api/posts', (req: Request, res: Response) => {
  try {
    const { content, ...frontmatter } = req.body;
    const post = postTools.createPost(frontmatter, content);
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

app.put('/api/posts/:slug', (req: Request, res: Response) => {
  try {
    const { content, ...updates } = req.body;
    const post = postTools.updatePost(req.params.slug, updates, content);
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

app.delete('/api/posts/:slug', (req: Request, res: Response) => {
  try {
    postTools.deletePost(req.params.slug);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(404).json({ error: String(error) });
  }
});

// Projects endpoints
app.get('/api/projects', (req: Request, res: Response) => {
  try {
    const projects = projectTools.listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/projects', (req: Request, res: Response) => {
  try {
    const project = projectTools.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

app.put('/api/projects/:title', (req: Request, res: Response) => {
  try {
    const project = projectTools.updateProject(req.params.title, req.body);
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

app.delete('/api/projects/:title', (req: Request, res: Response) => {
  try {
    projectTools.deleteProject(req.params.title);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(404).json({ error: String(error) });
  }
});

// Git endpoints
app.get('/api/git/status', async (req: Request, res: Response) => {
  try {
    const status = await gitTools.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/git/commit-push', async (req: Request, res: Response) => {
  try {
    const { message, confirmed } = req.body;
    const result = await gitTools.commitAndPush(message, confirmed);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

const port = parseInt(process.env.PORT || String(config.api.port), 10);
const host = process.env.HOST || config.api.host;

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, host, () => {
    console.log(`portfolio-mcp REST API listening on http://${host}:${port}`);
  });
}

// Export for Vercel
export default app;
