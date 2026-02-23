import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Config, Post, PostFrontmatter } from './types.js';
import { titleToSlug, buildFrontmatter } from './utils.js';

export class PostTools {
  constructor(private config: Config) {}

  listPosts(): Post[] {
    const postsPath = path.join(this.config.portfolioPath, this.config.postsDir);
    const files = readdirSync(postsPath).filter(f => f.endsWith('.mdx'));

    return files.map(file => {
      const slug = file.replace(/\.mdx$/, '');
      return this.getPost(slug);
    });
  }

  getPost(slug: string): Post {
    const postsPath = path.join(this.config.portfolioPath, this.config.postsDir);
    const filePath = path.join(postsPath, `${slug}.mdx`);

    if (!existsSync(filePath)) {
      throw new Error(`Post not found: ${slug}`);
    }

    const raw = readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    return {
      slug,
      frontmatter: data as PostFrontmatter,
      content: content.trim(),
    };
  }

  createPost(frontmatter: Partial<PostFrontmatter>, content: string): Post {
    // Validate required fields
    if (!frontmatter.title) throw new Error('title is required');
    if (!frontmatter.date) throw new Error('date is required');
    if (!frontmatter.tags) throw new Error('tags is required');
    if (frontmatter.draft === undefined) throw new Error('draft is required');
    if (!frontmatter.summary) throw new Error('summary is required');

    const slug = titleToSlug(frontmatter.title);
    const postsPath = path.join(this.config.portfolioPath, this.config.postsDir);
    const filePath = path.join(postsPath, `${slug}.mdx`);

    if (existsSync(filePath)) {
      throw new Error(`Post already exists: ${slug}`);
    }

    const fm = buildFrontmatter(frontmatter);
    const fullContent = `${fm}\n\n${content}`;

    writeFileSync(filePath, fullContent, 'utf-8');

    return {
      slug,
      frontmatter: frontmatter as PostFrontmatter,
      content: content.trim(),
    };
  }

  updatePost(slug: string, updates: Partial<PostFrontmatter>, content?: string): Post {
    const post = this.getPost(slug);

    // Merge frontmatter
    const newFrontmatter = { ...post.frontmatter, ...updates };
    const newContent = content !== undefined ? content : post.content;

    const postsPath = path.join(this.config.portfolioPath, this.config.postsDir);
    const filePath = path.join(postsPath, `${slug}.mdx`);

    const fm = buildFrontmatter(newFrontmatter);
    const fullContent = `${fm}\n\n${newContent}`;

    writeFileSync(filePath, fullContent, 'utf-8');

    return {
      slug,
      frontmatter: newFrontmatter,
      content: newContent.trim(),
    };
  }

  deletePost(slug: string): void {
    const postsPath = path.join(this.config.portfolioPath, this.config.postsDir);
    const filePath = path.join(postsPath, `${slug}.mdx`);

    if (!existsSync(filePath)) {
      throw new Error(`Post not found: ${slug}`);
    }

    unlinkSync(filePath);
  }
}
