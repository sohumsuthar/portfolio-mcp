# portfolio-mcp

An MCP (Model Context Protocol) server that enables AI assistants like Claude to manage blog posts and projects for a personal portfolio site. Supports creating, reading, updating, and deleting MDX blog posts and project entries, with Git integration for committing and pushing changes.

## How It Works

This server connects to a separate portfolio repository (e.g., `suthar-portfolio`) and provides tools for content management. It can run in three modes:

- **Local MCP server** -- Connects directly to Claude Desktop via stdio, reads and writes files on the local filesystem
- **REST API server** -- An Express HTTP server for web-based or programmatic access
- **Vercel serverless deployment** -- A serverless function that uses the GitHub API to read/write files without local filesystem access

## Features

- **Post Management**: Full CRUD operations on MDX blog posts with YAML frontmatter
- **Project Management**: Full CRUD operations on the `projectsData.js` file
- **Git Integration**: View repository status and commit/push changes with a two-step confirmation workflow
- **API Key Authentication**: Bearer token auth for securing the REST API and Vercel endpoints
- **CORS Support**: Configurable origin restrictions
- **MCP Proxy**: A bridge that lets Claude Desktop connect to a remote Vercel-deployed backend

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure

Copy the example config and update it with the path to your portfolio repository:

```bash
cp portfolio-mcp.config.json.example portfolio-mcp.config.json
```

Edit `portfolio-mcp.config.json`:

```json
{
  "portfolioPath": "/path/to/your/portfolio-repo",
  "postsDir": "data/posts",
  "projectsFile": "data/projectsData.js",
  "git": {
    "remote": "origin",
    "branch": "main",
    "requireConfirmation": true
  },
  "api": {
    "port": 3333,
    "host": "localhost"
  }
}
```

Alternatively, set environment variables (takes priority over the config file):

```
PORTFOLIO_PATH=/path/to/your/portfolio-repo
POSTS_DIR=data/posts
PROJECTS_FILE=data/projectsData.js
GIT_REMOTE=origin
GIT_BRANCH=main
API_PORT=3000
API_HOST=localhost
API_KEY=your-secret-key
ALLOWED_ORIGIN=https://yourdomain.com
```

### 3. Build

```bash
npm run build
```

## Usage

### MCP Server (Claude Desktop)

```bash
npm start
```

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portfolio-mcp": {
      "command": "node",
      "args": ["/path/to/portfolio-mcp/dist/index.js"],
      "cwd": "/path/to/portfolio-mcp"
    }
  }
}
```

### REST API Server

```bash
npm run start:api
```

### Development (ts-node, no build step)

```bash
npm run dev          # MCP server
npm run dev:api      # REST API server
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_posts` | List all blog posts with frontmatter |
| `get_post` | Get a post's full content by slug |
| `create_post` | Create a new MDX blog post |
| `update_post` | Update an existing post's frontmatter or content |
| `delete_post` | Delete a post by slug |
| `list_projects` | List all projects |
| `create_project` | Add a new project |
| `update_project` | Update a project by title |
| `delete_project` | Remove a project by title |
| `git_status` | Show pending changes in the portfolio repo |
| `git_commit_push` | Commit and push changes (dry-run first, then confirm) |

## REST API Endpoints

All endpoints (except `/health`) require a Bearer token in the `Authorization` header when `API_KEY` is set.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (no auth required) |
| `GET` | `/api/posts` | List all posts |
| `GET` | `/api/posts/:slug` | Get a single post |
| `POST` | `/api/posts` | Create a post |
| `PUT` | `/api/posts/:slug` | Update a post |
| `DELETE` | `/api/posts/:slug` | Delete a post |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `PUT` | `/api/projects/:title` | Update a project |
| `DELETE` | `/api/projects/:title` | Delete a project |
| `GET` | `/api/git/status` | Git status |
| `POST` | `/api/git/commit-push` | Commit and push |

## Data Formats

### Blog Posts

MDX files with YAML frontmatter, stored in `data/posts/`:

```yaml
---
title: 'Post Title'
date: '2024-06-27'
tags: [tag1, tag2, tag3]
draft: false
summary: 'Short description'
---

MDX body content here...
```

Optional frontmatter fields: `pinned` (boolean), `pinnedtext` (string).

### Projects

Managed in `data/projectsData.js` as a JavaScript array:

```js
const projectsData = [
  {
    title: 'Project Name',
    description: 'Description',
    imgSrc: '/image.jpg',
    href: 'https://example.com',
    github: 'https://github.com/...',
    tech1: 'React',
    tech2: 'TypeScript',
    tech3: 'Node.js'
  }
];
export default projectsData;
```

Required fields: `title`, `description`, `imgSrc`, `href`. Optional: `github`, `tech1`, `tech2`, `tech3`.

## Git Workflow

The `git_commit_push` tool uses a two-step confirmation:

1. **First call** (without `confirmed`): Returns a dry-run preview of what would be committed
2. **Second call** (with `confirmed: true`): Executes the commit and push

This prevents accidental commits and lets the user review changes first.

## Vercel Deployment

The `api/portfolio.ts` handler is a self-contained Vercel serverless function that uses the GitHub Contents API directly, so it does not require local filesystem access to the portfolio repo.

### Required environment variables on Vercel

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope |
| `GITHUB_OWNER` | GitHub username (default: `sohumsuthar`) |
| `GITHUB_REPO` | Repository name (default: `suthar-portfolio`) |
| `GITHUB_BRANCH` | Branch to read/write (default: `main`) |
| `API_KEY` | Secret key for Bearer token auth |
| `ALLOWED_ORIGIN` | CORS allowed origin |

### MCP Proxy for Remote Access

To connect Claude Desktop to a Vercel-deployed backend, use the MCP proxy:

```json
{
  "mcpServers": {
    "portfolio-mcp": {
      "command": "node",
      "args": ["/path/to/portfolio-mcp/dist/mcp-proxy.js"],
      "env": {
        "PORTFOLIO_API_URL": "https://your-deployment.vercel.app",
        "PORTFOLIO_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Security

- API key authentication via Bearer tokens
- CORS restricted to configured origins
- Environment variables for all secrets (never committed to git)
- Request logging on the REST API server
- Health check endpoint available without authentication

## License

MIT
