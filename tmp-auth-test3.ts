import { authorizeRequest } from './src/lib/auth-engine.ts';

class MockQuery {
  table: string;
  constructor(table: string) { this.table = table; }
  select(cols: string) {
    console.log(`select ${cols} on ${this.table}`);
    return this;
  }
  eq(col: string, val: any) {
    console.log(`eq ${col}=${val} on ${this.table}`);
    return this;
  }
  maybeSingle() {
    console.log(`maybeSingle on ${this.table}`);
    return Promise.resolve({ data: { count: 0 } });
  }
  single() {
    console.log(`single on ${this.table}`);
    if (this.table === 'profiles') return Promise.resolve({ data: { subscription_plan: 'free' } });
    return Promise.resolve({ data: null });
  }
  upsert(row: any, opt: any) {
    console.log(`upsert on ${this.table}`, row, opt);
    return Promise.resolve({ error: null });
  }
  update(row: any) {
    console.log(`update on ${this.table}`, row);
    return Promise.resolve({ error: null });
  }
  insert(row: any) {
    console.log(`insert on ${this.table}`, row);
    return Promise.resolve({ error: null });
  }
}

const admin = {
  from(table: string) {
    console.log(`from ${table}`);
    return new MockQuery(table);
  },
} as any;

(async () => {
  try {
    await authorizeRequest(admin, 'user-1', 'startup', 'community_request');
    console.log('authorized');
  } catch (err) {
    console.error('ERR', err);
  }
})();
