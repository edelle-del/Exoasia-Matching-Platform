import "dotenv/config";
import { createAdminClient } from "./src/lib/supabase/admin.ts";

(async () => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('profiles').select('id, member_role').limit(1);
    console.log('profiles data', data, 'error', error);
  } catch (err) {
    console.error('ERR', err);
  }
})();
