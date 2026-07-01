import { CURRENT_SCHEMA_VERSION } from '../schema/types';

export type MigrationStep = (input: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Record<number, MigrationStep> = {
  // placeholder; no prior versions exist for v1
};

export function migrateForward(input: Record<string, unknown>): Record<string, unknown> {
  let doc = input;
  while (typeof doc.schemaVersion === 'number' && doc.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = migrations[doc.schemaVersion];
    if (!step) throw new Error(`No migration from schemaVersion ${doc.schemaVersion}`);
    doc = step(doc);
  }
  return doc;
}
