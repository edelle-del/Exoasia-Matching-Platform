import { authorizeRequest } from './src/lib/auth-engine.ts';

(async () => {
  const events: string[] = [];
  const admin = {
    from: (table: string) => {
      events.push(`from:${table}`);
      return {
        select: (cols: string) => {
          events.push(`select:${cols}`);
          return {
            eq: (col: string, val: any) => {
              events.push(`eq:${col}=${val}`);
              return {
                maybeSingle: async () => {
                  events.push('maybeSingle');
                  return { data: { count: 0 } };
                },
                single: async () => {
                  events.push('single');
                  if (table === 'profiles') return { data: { subscription_plan: 'free' } };
                  return { data: null };
                },
                upsert: async (row: any, opt: any) => {
                  events.push(`upsert:${JSON.stringify(row)} onConflict=${JSON.stringify(opt)}`);
                  return { error: null };
                },
                update: async (row: any) => {
                  events.push(`update:${JSON.stringify(row)}`);
                  return { error: null };
                },
                insert: async (row: any) => {
                  events.push(`insert:${JSON.stringify(row)}`);
                  return { error: null };
                },
              };
            },
          };
        },
      };
    },
  } as any;

  try {
    await authorizeRequest(admin, 'user-1', 'startup', 'community_request');
    console.log('authorized');
  } catch (err) {
    console.error('ERR', err);
  }

  console.log('events:\n' + events.join('\n'));
})();
