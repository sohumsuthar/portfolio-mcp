import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Config } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'portfolio-mcp.config.json');

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found at ${configPath}. Copy from portfolio-mcp.config.json.example and update paths.`
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
