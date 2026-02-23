import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { PostTools } from './post-tools.js';
import { ProjectTools } from './project-tools.js';
import { GitTools } from './git-tools.js';

const config = loadConfig();
const postTools = new PostTools(config);
const projectTools = new ProjectTools(config);
const gitTools = new GitTools(config);

const server = new Server({
  name: 'portfolio-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {}
  }
});

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'list_posts',
    description: 'List all blog posts with their frontmatter',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_post',
    description: 'Get full content of a post by slug',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Post slug' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'create_post',
    description: 'Create a new blog post',
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
    description: 'Update an existing post',
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
    description: 'Delete a post by slug',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project',
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
    description: 'Update a project by title',
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
    description: 'Delete a project by title',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'git_status',
    description: 'Get git status of portfolio repo',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'git_commit_push',
    description: 'Commit and push changes. First call returns dry-run, set confirmed:true to execute.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'Commit message' },
        confirmed: { type: 'boolean', description: 'Set to true to execute (not dry-run)' },
      },
      required: ['message'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_posts': {
        const posts = postTools.listPosts();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(posts, null, 2),
            },
          ],
        };
      }

      case 'get_post': {
        const post = postTools.getPost((args as any).slug);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(post, null, 2),
            },
          ],
        };
      }

      case 'create_post': {
        const { content, ...frontmatter } = args as any;
        const post = postTools.createPost(frontmatter, content);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(post, null, 2),
            },
          ],
        };
      }

      case 'update_post': {
        const { slug, content, ...updates } = args as any;
        const post = postTools.updatePost(slug, updates, content);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(post, null, 2),
            },
          ],
        };
      }

      case 'delete_post': {
        postTools.deletePost((args as any).slug);
        return {
          content: [
            {
              type: 'text',
              text: 'Post deleted successfully',
            },
          ],
        };
      }

      case 'list_projects': {
        const projects = projectTools.listProjects();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case 'create_project': {
        const project = projectTools.createProject(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case 'update_project': {
        const { title, newTitle, ...updates } = args as any;
        if (newTitle) {
          updates.title = newTitle;
        }
        const project = projectTools.updateProject(title, updates);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case 'delete_project': {
        projectTools.deleteProject((args as any).title);
        return {
          content: [
            {
              type: 'text',
              text: 'Project deleted successfully',
            },
          ],
        };
      }

      case 'git_status': {
        const status = await gitTools.getStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'git_commit_push': {
        const { message, confirmed } = args as any;
        const result = await gitTools.commitAndPush(message, confirmed);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('portfolio-mcp running on stdio');
}

main().catch(console.error);
