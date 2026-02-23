import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { Config } from './types.js';

export function loadConfig(): Config {
  // Try environment variables first (for Vercel/cloud deployment)
  if (process.env.PORTFOLIO_PATH) {
    return {
      portfolioPath: process.env.PORTFOLIO_PATH,
      postsDir: process.env.POSTS_DIR || 'data/posts',
      projectsFile: process.env.PROJECTS_FILE || 'data/projectsData.js',
      git: {
        remote: process.env.GIT_REMOTE || 'origin',
        branch: process.env.GIT_BRANCH || 'main',
        requireConfirmation: process.env.GIT_REQUIRE_CONFIRM !== 'false'
      },
      api: {
        port: parseInt(process.env.API_PORT || '3000'),
        host: process.env.API_HOST || 'localhost'
      }
    };
  }

  // Fall back to config file (for local development)
  const configPath = path.join(process.cwd(), 'portfolio-mcp.config.json');

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}. Copy from portfolio-mcp.config.json.example and update paths, or set PORTFOLIO_PATH environment variable.`
    );
  }

  const raw = readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(raw);

  // Validate required fields
  if (!config.portfolioPath) throw new Error('portfolioPath is required');
  if (!config.postsDir) throw new Error('postsDir is required');
  if (!config.projectsFile) throw new Error('projectsFile is required');

  return config;
}
