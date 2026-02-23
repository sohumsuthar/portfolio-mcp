export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildFrontmatter(frontmatter: Record<string, any>): string {
  const lines: string[] = ['---'];

  // Ensure consistent order
  const keys = ['title', 'date', 'tags', 'draft', 'summary', 'pinned', 'pinnedtext'];
  for (const key of keys) {
    if (key in frontmatter) {
      const value = frontmatter[key];
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key}: '${value.replace(/'/g, "\\'")}'`);
      } else if (typeof value === 'boolean') {
        lines.push(`${key}: ${value}`);
      }
    }
  }

  // Add any extra keys not in the standard list
  for (const key of Object.keys(frontmatter)) {
    if (!keys.includes(key)) {
      const value = frontmatter[key];
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key}: '${value.replace(/'/g, "\\'")}'`);
      } else if (typeof value === 'boolean') {
        lines.push(`${key}: ${value}`);
      }
    }
  }

  lines.push('---');
  return lines.join('\n');
}
