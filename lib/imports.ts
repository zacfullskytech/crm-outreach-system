import { parse } from "csv-parse/sync";

export function parseCsv(content: string) {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

export function detectHeaders(rows: Record<string, string>[]) {
  return rows.length > 0 ? Object.keys(rows[0]) : [];
}
