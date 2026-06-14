import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin(email) {
  console.log(`\n--- Processing: ${email} ---`);
  
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching users:", authError);
    return;
  }
  
  const defaultPassword = "ExoasiaAdmin2026!";
  let user = users.users.find(u => u.email === email);
  
  if (!user) {
    console.log(`User not found, creating new account...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      return;
    }
    user = createData.user;
    
    // Create profile
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: email.split("@")[0].replace("exoasia.", "").replace(/([A-Z])/g, ' $1').trim(),
      stage: "4",
      verification_status: "verified",
      account_status: "active"
    });
  } else {
    console.log(`Found existing user: ${user.id}. Setting default password...`);
    await supabase.auth.admin.updateUserById(user.id, { password: defaultPassword });
  }
  
  console.log(`Setting role to admin...`);
  const { error: upsertError } = await supabase
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id" });
    
  if (upsertError) {
    console.error("Error setting admin role:", upsertError);
    return;
  }
  
  console.log("Successfully assigned 'admin' role to", email);
}

async function run() {
  await makeAdmin("exoasia.edellelumabi@gmail.com");
  await makeAdmin("exoasia.yuanbenedictsuarez@gmail.com");
  await makeAdmin("exoasia.seanjaredsantos@gmail.com");
}

run();
