import { v4 as uuidv4 } from 'uuid';
export const newId = (): string => uuidv4();
export const ALIAS_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export const isValidAlias = (s: string): boolean => ALIAS_RE.test(s);
