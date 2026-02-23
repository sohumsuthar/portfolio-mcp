# portfolio-mcp

A Model Context Protocol (MCP) server for managing portfolio posts and projects. Allows Claude and other AI assistants to create, edit, and delete blog posts and projects, with Git integration for committing and pushing changes to GitHub.

## Features

- **Post Management**: Create, read, update, and delete MDX blog posts
- **Project Management**: Manage projects in `projectsData.js`
- **Git Integration**: View status and commit/push changes with confirmation
- **MCP Protocol**: Full MCP server implementation for Claude integration
- **REST API**: Standalone REST API for web-based management

## Setup

1. Copy the config file:
   ```bash
   cp portfolio-mcp.config.json.example portfolio-mcp.config.json
   ```

2. Update `portfolio-mcp.config.json` with your portfolio path:
   ```json
   {
     "portfolioPath": "/path/to/your/suthar-portfolio",
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

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build TypeScript:
   ```bash
   npm run build
   ```

## Running

### MCP Server (for Claude Desktop)
```bash
npm start
```

### REST API Server
```bash
npm run start:api
```

### Development

Watch mode for MCP:
```bash
npm run dev
```

Watch mode for REST API:
```bash
npm run dev:api
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_posts` | List all blog posts |
| `get_post` | Get post by slug |
| `create_post` | Create new post |
| `update_post` | Update existing post |
| `delete_post` | Delete post |
| `list_projects` | List all projects |
| `create_project` | Create project |
| `update_project` | Update project |
| `delete_project` | Delete project |
| `git_status` | Show pending changes |
| `git_commit_push` | Commit and push (requires confirmation) |

## REST API Endpoints

- `GET /health` - Health check
- `GET /api/posts` - List posts
- `GET /api/posts/:slug` - Get post
- `POST /api/posts` - Create post
- `PUT /api/posts/:slug` - Update post
- `DELETE /api/posts/:slug` - Delete post
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:title` - Update project
- `DELETE /api/projects/:title` - Delete project
- `GET /api/git/status` - Git status
- `POST /api/git/commit-push` - Commit and push

## Post Format

Posts are MDX files with YAML frontmatter:

```yaml
---
title: Post Title
date: '2024-06-27'
tags: [tag1, tag2, tag3]
draft: false
summary: Short description
---

MDX body content here...
```

Optional fields: `pinned`, `pinnedtext`

## Project Format

Projects are managed in `projectsData.js`:

```js
export const projectsData = [
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
```

## Git Workflow

The `git_commit_push` tool implements a two-step confirmation workflow:

1. **First call** (no `confirmed` param): Returns a dry-run showing what would be committed
2. **Second call** (with `confirmed: true`): Executes the actual commit and push

This prevents accidental commits and allows users to review changes before pushing.

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

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

## License

MIT
