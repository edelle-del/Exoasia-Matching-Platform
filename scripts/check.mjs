import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users } = await supabase.from('profiles').select('*').in('email', [
    'exoasia.edellelumabi@gmail.com',
    'exoasia.yuanbenedictsuarez@gmail.com',
    'exoasia.seanjaredsantos@gmail.com'
  ]);
  console.log("Profiles:", users);

  const { data: roles } = await supabase.from('user_roles').select('*, profiles(email)').in('user_id', users.map(u => u.id));
  console.log("Roles:", roles);
}

check();
