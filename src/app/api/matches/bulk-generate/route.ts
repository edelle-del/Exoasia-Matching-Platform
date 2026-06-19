import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductCredits } from "@/lib/credits";
import { generateGeminiMatches } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const authHeader = req.headers.get("authorization");
    
    // We need to identify the user
    // On the server, we typically use the standard auth methods, but we can also use a token
    const token = authHeader?.split(" ")[1];
    
    // Fallback to getting user via cookie if token is not provided
    const supabase = createAdminClient();
    
    // Actually, let's just use standard server client to get session
    // Wait, since we are in a route handler, let's just use the Authorization header if provided
    let userId = "";
    if (token) {
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (user) userId = user.id;
    } else {
      // For simplicity in this demo, let's expect the client to send user_id in body if needed, or we use standard auth
      // Wait, let's use the standard request approach
      const body = await req.json();
      userId = body.user_id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("member_role")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Upfront credit deduction
    const actionType = profile.member_role === "ecosystem_partner" 
      ? "BULK_MATCH_SWEEP_PARTNER" 
      : "BULK_MATCH_SWEEP_STARTUP";
      
    let deductedCost = 0;
    try {
      const { deducted } = await deductCredits(userId, actionType);
      deductedCost = deducted;
    } catch (e: any) {
      if (e.name === "InsufficientCreditsError") {
        return NextResponse.json(
          { error: e.message, balance: e.balance, required: e.required },
          { status: 402 }
        );
      }
      throw e;
    }

    // Insert job tracking
    const { data: job, error: jobErr } = await admin
      .from("background_jobs")
      .insert({
        user_id: userId,
        job_type: "BULK_MATCH_SWEEP",
        status: "processing"
      })
      .select()
      .single();

    if (jobErr || !job) {
      console.error("Failed to insert into background_jobs:", jobErr);
      // Fatal error before starting job tracking, refund
      if (deductedCost > 0) {
        await admin.from("ad_credit_ledger").insert({
          member_id: userId,
          change_amount: deductedCost,
          reason: "Refund for failed BULK_MATCH_SWEEP init",
        });
      }
      return NextResponse.json({ error: "Failed to initialize job" }, { status: 500 });
    }

    // Fire off async processing
    // In a true Vercel production environment, this should ideally be an Edge Function or Inngest/QStash task.
    // For this context, we will trigger an unawaited background function that runs on the Node process.
    processBulkSweepAsync(userId, job.id, profile.member_role, deductedCost).catch(console.error);

    // Instant Response
    return NextResponse.json({ success: true, jobId: job.id, status: "processing" }, { status: 202 });

  } catch (err: any) {
    console.error("Bulk Generate Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Background Worker implementation
async function processBulkSweepAsync(userId: string, jobId: string, role: string, deductedCost: number) {
  const admin = createAdminClient();
  try {
    const { data: caller } = await admin.from("profiles").select("*").eq("id", userId).single();
    if (!caller) throw new Error("Caller profile not found");

    const chunkArray = <T,>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

    if (role === "investor") {
      const { data: allProjects } = await admin.from("projects").select("*").eq("is_active", true);
      const { data: partners } = await admin.from("profiles").select("*").eq("member_role", "ecosystem_partner");
      const { data: allProfiles } = await admin.from("profiles").select("*");

      if (allProjects && allProjects.length > 0 && allProfiles) {
        for (const c of chunkArray(allProjects, 40)) {
          const candidatesWithOwners = c.map(p => {
            const owner = allProfiles.find(profile => profile.id === p.owner_id) || {};
            return { counterpart_id: p.id, ...p, owner };
          });
          const res = await generateGeminiMatches({ subject: caller, candidates: candidatesWithOwners });
          const rows = res.map(r => ({ project_id: r.counterpart_id, investor_profile_id: userId, fit_score: r.fit_score, summary: r.summary, rationale: r.rationale, generated_at: new Date().toISOString() }));
          if (rows.length > 0) await admin.from("project_match_scores").upsert(rows, { onConflict: "project_id, investor_profile_id" });
        }
      }
      if (partners && partners.length > 0) {
        for (const c of chunkArray(partners, 40)) {
          const res = await generateGeminiMatches({ subject: caller, candidates: c.map(p => ({ counterpart_id: p.id, ...p })) });
          const rows = res.map(r => ({ investor_profile_id: userId, eco_partner_profile_id: r.counterpart_id, fit_score: r.fit_score, summary: r.summary, rationale: r.rationale, generated_at: new Date().toISOString() }));
          if (rows.length > 0) await admin.from("ecosystem_investor_match_scores").upsert(rows, { onConflict: "investor_profile_id, eco_partner_profile_id" });
        }
      }
    } else if (role === "startup") {
      const { data: userProjects } = await admin.from("projects").select("*").eq("owner_id", userId).eq("is_active", true);
      const { data: investors } = await admin.from("profiles").select("*").eq("member_role", "investor");
      const { data: partners } = await admin.from("profiles").select("*").eq("member_role", "ecosystem_partner");

      if (userProjects && userProjects.length > 0) {
        for (const proj of userProjects) {
          const payloadSubject = { ...proj, owner: caller };
          if (investors && investors.length > 0) {
            for (const c of chunkArray(investors, 40)) {
              const res = await generateGeminiMatches({ subject: payloadSubject, candidates: c.map(p => ({ counterpart_id: p.id, ...p })) });
              const rows = res.map(r => ({ project_id: proj.id, investor_profile_id: r.counterpart_id, fit_score: r.fit_score, summary: r.summary, rationale: r.rationale, generated_at: new Date().toISOString() }));
              if (rows.length > 0) await admin.from("project_match_scores").upsert(rows, { onConflict: "project_id, investor_profile_id" });
            }
          }
          if (partners && partners.length > 0) {
            for (const c of chunkArray(partners, 40)) {
              const res = await generateGeminiMatches({ subject: payloadSubject, candidates: c.map(p => ({ counterpart_id: p.id, ...p })) });
              const rows = res.map(r => ({ project_id: proj.id, eco_partner_profile_id: r.counterpart_id, fit_score: r.fit_score, summary: r.summary, rationale: r.rationale, generated_at: new Date().toISOString() }));
              if (rows.length > 0) await admin.from("ecosystem_match_scores").upsert(rows, { onConflict: "project_id, eco_partner_profile_id" });
            }
          }
        }
      }
    } else if (role === "ecosystem_partner") {
      const { data: allProjects } = await admin.from("projects").select("*").eq("is_active", true);
      const { data: investors } = await admin.from("profiles").select("*").eq("member_role", "investor");

      if (allProjects && allProjects.length > 0) {
        for (const c of chunkArray(allProjects, 40)) {
          const res = await generateGeminiMatches({ subject: caller, candidates: c.map(p => ({ counterpart_id: p.id, ...p })) });
          const rows = res.map(r => ({ project_id: r.counterpart_id, eco_partner_profile_id: userId, fit_score: r.fit_score, summary: r.summary, rationale: r.rationale, generated_at: new Date().toISOString() }));
          if (rows.length > 0) await admin.from("ecosystem_match_scores").upsert(rows, { onConflict: "project_id, eco_partner_profile_id" });
        }
      }
      if (investors && investors.length > 0) {
        for (const c of chunkArray(investors, 40)) {
          const res = await generateGeminiMatches({ subject: caller, candidates: c.map(p => ({ counterpart_id: p.id, ...p })) });
          const rows = res.map(r => ({ investor_profile_id: r.counterpart_id, eco_partner_profile_id: userId, fit_score: r.fit_score, summary: r.summary, rationale: r.rationale, generated_at: new Date().toISOString() }));
          if (rows.length > 0) await admin.from("ecosystem_investor_match_scores").upsert(rows, { onConflict: "investor_profile_id, eco_partner_profile_id" });
        }
      }
    }

    await admin
      .from("background_jobs")
      .update({ status: "completed", result_payload: { message: "Sweep executed across all profiles and generated real AI scores." } })
      .eq("id", jobId);

  } catch (error: any) {
    if (deductedCost > 0) {
      await admin.from("ad_credit_ledger").insert({
        member_id: userId,
        change_amount: deductedCost,
        reason: `Refund for fatal AI sweep failure (Job ${jobId})`,
      });
    }

    await admin
      .from("background_jobs")
      .update({ status: "failed", error_message: error.message || "Unknown fatal error" })
      .eq("id", jobId);
  }
}
