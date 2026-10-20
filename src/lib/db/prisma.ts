import { describe, expect, it } from 'vitest';
import { isDirectDatabaseAvailable, setDirectDatabaseAvailable } from './directPrismaClient';

describe('database availability semantics', () => {
  it('does not mark configured databases as available until verified', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/app';
    setDirectDatabaseAvailable(false);
    expect(isDirectDatabaseAvailable()).toBe(false);
  });

  it('requires a database URL before reporting availability', () => {
    delete process.env.DATABASE_URL;
    setDirectDatabaseAvailable(false);
    expect(isDirectDatabaseAvailable()).toBe(false);
  });
});

delete process.env.DATABASE_URL;
setDirectDatabaseAvailable(false);
