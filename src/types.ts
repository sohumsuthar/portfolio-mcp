export interface Config {
  portfolioPath: string;
  postsDir: string;
  projectsFile: string;
  git: {
    remote: string;
    branch: string;
    requireConfirmation: boolean;
  };
  api: {
    port: number;
    host: string;
  };
}

export interface PostFrontmatter {
  title: string;
  date: string;
  tags: string[];
  draft: boolean;
  summary: string;
  pinned?: boolean;
  pinnedtext?: string;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
}

export interface Project {
  title: string;
  description: string;
  imgSrc: string;
  href: string;
  github?: string;
  tech1?: string;
  tech2?: string;
  tech3?: string;
}

export interface GitStatus {
  files: string[];
  hasChanges: boolean;
}

export interface CommitPushRequest {
  message: string;
  confirmed?: boolean;
}

export interface CommitPushResult {
  success: boolean;
  isDryRun: boolean;
  message: string;
}
