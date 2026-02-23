import express, { Request, Response } from 'express';
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
app.use(cors());
app.use(express.json());

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

const port = config.api.port;
const host = config.api.host;

app.listen(port, host, () => {
  console.log(`portfolio-mcp REST API listening on http://${host}:${port}`);
});
