import type { Division } from '@/domains/contestAdministration/types';
import type { TeamImportRow, TeamMemberDraft } from '@/domains/teamParticipation/types';

export function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

export function parseTeamImportFile(text: string, divisions: Division[]): TeamImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);
  const findIndex = (...names: string[]) => headers.findIndex((header) => names.includes(header));

  const teamIndex = findIndex('teamname', '팀명');
  const divisionIndex = findIndex('division', 'divisionname', '참가유형', '유형');
  const leaderNameIndex = findIndex('leadername', '팀장이름', '대표이름');
  const leaderEmailIndex = findIndex('leaderemail', '팀장메일', '팀장이메일', '대표메일', '대표이메일');

  const divisionByKey = new Map<string, string>();
  divisions.forEach((division) => {
    [division.division_id, division.code, division.name]
      .filter(Boolean)
      .forEach((key) => divisionByKey.set(key.toLowerCase(), division.division_id));
  });

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const members: TeamMemberDraft[] = [];

    for (let index = 0; index < cells.length; index += 1) {
      const header = headers[index] ?? '';
      const memberMatch = header.match(/(?:member|팀원)(\d+)?(?:name|이름)$/);
      if (!memberMatch) continue;

      const emailHeaderA = header.replace(/(?:name|이름)$/, 'email');
      const emailHeaderB = header.replace(/(?:name|이름)$/, '메일');
      const emailIndex = headers.findIndex(
        (item) => item === emailHeaderA || item === emailHeaderB || item === header.replace('name', 'email'),
      );
      const name = cells[index]?.trim();
      const email = emailIndex >= 0 ? cells[emailIndex]?.trim() : '';

      if (name && email) {
        members.push({ name, email });
      }
    }

    const divisionKey = cells[divisionIndex]?.trim().toLowerCase() ?? '';

    return {
      team_name: cells[teamIndex]?.trim() ?? '',
      division_id: divisionByKey.get(divisionKey) ?? '',
      leader: {
        name: cells[leaderNameIndex]?.trim() ?? '',
        email: cells[leaderEmailIndex]?.trim() ?? '',
      },
      members,
    };
  });
}

