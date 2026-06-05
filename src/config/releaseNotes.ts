import changelogMarkdown from '../../CHANGELOG.md?raw';

export interface ReleaseNoteSection {
  title: string;
  items: string[];
}

export function getReleaseNotes(version: string): ReleaseNoteSection[] {
  const versionStart = changelogMarkdown.indexOf(`## [${version}]`);
  if (versionStart === -1) {
    return [];
  }

  const nextVersionStart = changelogMarkdown.indexOf('\n## [', versionStart + 1);
  const versionBlock = changelogMarkdown.slice(
    versionStart,
    nextVersionStart === -1 ? undefined : nextVersionStart
  );

  const sections: ReleaseNoteSection[] = [];
  let currentSection: ReleaseNoteSection | null = null;

  for (const rawLine of versionBlock.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith('### ')) {
      currentSection = { title: line.replace(/^###\s+/, ''), items: [] };
      sections.push(currentSection);
      continue;
    }

    if (line.startsWith('- ') && currentSection) {
      currentSection.items.push(formatReleaseNoteItem(line.replace(/^-\s+/, '')));
    }
  }

  return sections.filter(section => section.items.length > 0);
}

function formatReleaseNoteItem(item: string): string {
  return item.replace(/\*\*/g, '').replace(/`([^`]+)`/g, '$1');
}
