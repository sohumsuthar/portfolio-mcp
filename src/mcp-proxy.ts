import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const API_URL = (process.env.PORTFOLIO_API_URL || 'https://portfolio-mcp.vercel.app').replace(/\/$/, '');
const API_KEY = process.env.PORTFOLIO_API_KEY || '';

async function apiFetch(path: string, method = 'GET', body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

const server = new Server({
  name: 'portfolio-mcp',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

const tools: Tool[] = [
  {
    name: 'list_posts',
    description: 'List all blog posts with their frontmatter',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_post',
    description: 'Get full content of a post by slug',
    inputSchema: {
      type: 'object' as const,
      properties: { slug: { type: 'string', description: 'Post slug' } },
      required: ['slug'],
    },
  },
  {
    name: 'create_post',
    description: 'Create a new blog post (commits directly to GitHub)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD format' },
        tags: { type: 'array', items: { type: 'string' } },
        draft: { type: 'boolean' },
        summary: { type: 'string' },
        content: { type: 'string', description: 'MDX body content' },
        pinned: { type: 'boolean' },
        pinnedtext: { type: 'string' },
      },
      required: ['title', 'date', 'tags', 'draft', 'summary', 'content'],
    },
  },
  {
    name: 'update_post',
    description: 'Update an existing post (commits directly to GitHub)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string' },
        title: { type: 'string' },
        date: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        draft: { type: 'boolean' },
        summary: { type: 'string' },
        content: { type: 'string' },
        pinned: { type: 'boolean' },
        pinnedtext: { type: 'string' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'delete_post',
    description: 'Delete a post by slug (commits directly to GitHub)',
    inputSchema: {
      type: 'object' as const,
      properties: { slug: { type: 'string' } },
      required: ['slug'],
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects',
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_project',
    description: 'Create a new project (commits directly to GitHub)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        imgSrc: { type: 'string' },
        href: { type: 'string' },
        github: { type: 'string' },
        tech1: { type: 'string' },
        tech2: { type: 'string' },
        tech3: { type: 'string' },
      },
      required: ['title', 'description', 'imgSrc', 'href'],
    },
  },
  {
    name: 'update_project',
    description: 'Update a project by title (commits directly to GitHub)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Current project title' },
        newTitle: { type: 'string' },
        description: { type: 'string' },
        imgSrc: { type: 'string' },
        href: { type: 'string' },
        github: { type: 'string' },
        tech1: { type: 'string' },
        tech2: { type: 'string' },
        tech3: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project by title (commits directly to GitHub)',
    inputSchema: {
      type: 'object' as const,
      properties: { title: { type: 'string' } },
      required: ['title'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'list_posts':
        result = await apiFetch('/api/posts');
        break;

      case 'get_post':
        result = await apiFetch(`/api/posts/${(args as any).slug}`);
        break;

      case 'create_post': {
        const { content, ...frontmatter } = args as any;
        result = await apiFetch('/api/posts', 'POST', { ...frontmatter, content });
        break;
      }

      case 'update_post': {
        const { slug, content, ...updates } = args as any;
        result = await apiFetch(`/api/posts/${slug}`, 'PUT', { ...updates, content });
        break;
      }

      case 'delete_post':
        result = await apiFetch(`/api/posts/${(args as any).slug}`, 'DELETE');
        break;

      case 'list_projects':
        result = await apiFetch('/api/projects');
        break;

      case 'create_project':
        result = await apiFetch('/api/projects', 'POST', args);
        break;

      case 'update_project': {
        const { title, ...updates } = args as any;
        result = await apiFetch(`/api/projects/${encodeURIComponent(title)}`, 'PUT', updates);
        break;
      }

      case 'delete_project':
        result = await apiFetch(`/api/projects/${encodeURIComponent((args as any).title)}`, 'DELETE');
        break;

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('portfolio-mcp proxy running on stdio');
}

main().catch(console.error);
