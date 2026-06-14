import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin(email: string) {
  console.log(`Looking up user by email: ${email}`);

  // To find user by email, we need to query auth.users, but we can only do that via admin API
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Error fetching users:", authError);
    return;
  }

  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  console.log(`Found user: ${user.id}. Setting role to admin...`);

  // Upsert the user_roles table
  const { error: upsertError } = await supabase
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("Error setting admin role:", upsertError);
    return;
  }

  console.log("Successfully assigned 'admin' role to", email);
}

makeAdmin("exoasia.edellelumabi@gmail.com");
makeAdmin("exoasia.yuanbenedictsuarez@gmail.com");
makeAdmin("exoasia.seanjaredsantos@gmail.com");
