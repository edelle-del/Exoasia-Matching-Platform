import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdmins() {
  const emails = [
    "exoasia.yuanbenedictsuarez@gmail.com",
    "exoasia.seanjaredsantos@gmail.com",
    "exoasia.edellelumabi@gmail.com"
  ];
  
  const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  const users = usersData.users.filter(u => emails.includes(u.email));
  
  for (const user of users) {
    console.log(`\nFixing ${user.email}...`);
    
    // 1. Force profile to bypass onboarding
    const { error: profileError } = await supabase.from('profiles').update({
      stage: '4', // bypasses onboarding in middleware
      full_name: user.email.split('@')[0],
      sector: 'Administration', // fulfills !profile.sector
      member_role: 'admin'
    }).eq('id', user.id);
    
    if (profileError) {
      console.error("Profile update error:", profileError);
    } else {
      console.log("Profile updated.");
    }
    
    // 2. Ensure user_roles has 'admin'
    const { error: roleError } = await supabase.from('user_roles').upsert(
      { user_id: user.id, role: 'admin' },
      { onConflict: 'user_id' }
    );
    
    if (roleError) {
      console.error("Role upsert error:", roleError);
    } else {
      console.log("Role upserted.");
    }
  }
}

fixAdmins();
