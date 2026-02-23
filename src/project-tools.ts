import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { Config, Project } from './types.js';

export class ProjectTools {
  constructor(private config: Config) {}

  listProjects(): Project[] {
    const projectsPath = path.join(this.config.portfolioPath, this.config.projectsFile);

    if (!existsSync(projectsPath)) {
      throw new Error(`Projects file not found: ${projectsPath}`);
    }

    const raw = readFileSync(projectsPath, 'utf-8');
    const projects = this.parseProjectsFile(raw);
    return projects;
  }

  createProject(project: Project): Project {
    if (!project.title) throw new Error('title is required');
    if (!project.description) throw new Error('description is required');
    if (!project.imgSrc) throw new Error('imgSrc is required');
    if (!project.href) throw new Error('href is required');

    const projects = this.listProjects();

    if (projects.some(p => p.title === project.title)) {
      throw new Error(`Project already exists: ${project.title}`);
    }

    projects.push(project);
    this.writeProjectsFile(projects);

    return project;
  }

  updateProject(title: string, updates: Partial<Project>): Project {
    const projects = this.listProjects();
    const index = projects.findIndex(p => p.title === title);

    if (index === -1) {
      throw new Error(`Project not found: ${title}`);
    }

    const updated = { ...projects[index], ...updates };
    projects[index] = updated;

    this.writeProjectsFile(projects);

    return updated;
  }

  deleteProject(title: string): void {
    const projects = this.listProjects();
    const index = projects.findIndex(p => p.title === title);

    if (index === -1) {
      throw new Error(`Project not found: ${title}`);
    }

    projects.splice(index, 1);
    this.writeProjectsFile(projects);
  }

  private parseProjectsFile(content: string): Project[] {
    // Strip lines that are purely comments (won't break // in URLs)
    const stripped = content.replace(/^\s*\/\/.*$/gm, '');
    const match = stripped.match(/(?:export\s+)?const\s+projectsData\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      throw new Error('Invalid projects file format');
    }

    const arrayStr = match[1];
    try {
      const jsonStr = arrayStr
        .replace(/'/g, '"')
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*}/g, '}');
      return JSON.parse(jsonStr);
    } catch (e) {
      throw new Error(`Failed to parse projects: ${e}`);
    }
  }

  private writeProjectsFile(projects: Project[]): void {
    const projectsPath = path.join(this.config.portfolioPath, this.config.projectsFile);

    const projectLines = projects.map(p => {
      const lines = ['{'];
      lines.push(`  title: '${p.title.replace(/'/g, "\\'")}',`);
      lines.push(`  description: '${p.description.replace(/'/g, "\\'")}',`);
      lines.push(`  imgSrc: '${p.imgSrc.replace(/'/g, "\\'")}',`);
      lines.push(`  href: '${p.href.replace(/'/g, "\\'")}',`);
      if (p.github) lines.push(`  github: '${p.github.replace(/'/g, "\\'")}',`);
      if (p.tech1) lines.push(`  tech1: '${p.tech1.replace(/'/g, "\\'")}',`);
      if (p.tech2) lines.push(`  tech2: '${p.tech2.replace(/'/g, "\\'")}',`);
      if (p.tech3) lines.push(`  tech3: '${p.tech3.replace(/'/g, "\\'")}',`);
      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1); // Remove trailing comma from last item
      lines.push('},');
      return lines.join('\n');
    });

    const content = `const projectsData = [\n${projectLines.join('\n')}\n];\n\nexport default projectsData;\n`;

    writeFileSync(projectsPath, content, 'utf-8');
  }
}
