import { authorizeRequest } from './src/lib/auth-engine.ts';

(async () => {
  const events: string[] = [];
  const admin = {
    from: (table: string) => {
      events.push(rom:);
      return {
        select: (cols: string) => {
          events.push(select:);
          return {
            eq: (col: string, val: any) => {
              events.push(eq:=);
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
                  events.push(upsert: onConflict=);
                  return { error: null };
                },
                update: async (row:any) => {
                  events.push(update:);
                  return { error: null };
                },
                insert: async (row:any) => {
                  events.push(insert:);
                  return { error: null };
                }
              };
            }
          };
        }
      };
    }
  } as any;
  try {
    await authorizeRequest(admin, 'user-1', 'startup', 'community_request');
    console.log('authorized');
  } catch (err) {
    console.error('ERR', err);
  }
  console.log(events.join('\n'));
})();
