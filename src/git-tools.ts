import { simpleGit, SimpleGit } from 'simple-git';
import path from 'path';
import { Config, GitStatus, CommitPushResult } from './types.js';

export class GitTools {
  private git: SimpleGit;

  constructor(private config: Config) {
    this.git = simpleGit(this.config.portfolioPath);
  }

  async getStatus(): Promise<GitStatus> {
    const status = await this.git.status();

    return {
      files: [
        ...status.created,
        ...status.modified,
        ...status.deleted,
        ...status.renamed.map(r => r.to),
      ],
      hasChanges: status.files.length > 0,
    };
  }

  async commitAndPush(message: string, confirmed: boolean = false): Promise<CommitPushResult> {
    const status = await this.getStatus();

    if (!status.hasChanges) {
      return {
        success: true,
        isDryRun: false,
        message: 'No changes to commit',
      };
    }

    // First call is dry-run
    if (!confirmed) {
      return {
        success: false,
        isDryRun: true,
        message: `Dry run: Would commit ${status.files.length} file(s) with message: "${message}". Call again with confirmed: true to execute.`,
      };
    }

    // Actually commit and push
    try {
      await this.git.add('.');
      await this.git.commit(message);
      await this.git.push(this.config.git.remote, this.config.git.branch);

      return {
        success: true,
        isDryRun: false,
        message: `Successfully committed and pushed: "${message}"`,
      };
    } catch (error) {
      throw new Error(`Git operation failed: ${error}`);
    }
  }
}
