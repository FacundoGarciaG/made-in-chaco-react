/**
 * Build a parameterized SET clause for PostgreSQL UPDATE.
 * Returns { clause, values } where clause uses $N placeholders.
 *
 * @param {object} data - key/value pairs to set
 * @param {number} startAt - starting placeholder index (default 1)
 * @returns {{ clause: string, values: any[] } | null}
 */
export function buildSetClause(data, startAt = 1) {
  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  const parts = [];
  const values = [];
  let idx = startAt;

  for (const key of keys) {
    parts.push(`${key} = $${idx}`);
    values.push(data[key] ?? null);
    idx++;
  }

  return { clause: parts.join(", "), values };
}
