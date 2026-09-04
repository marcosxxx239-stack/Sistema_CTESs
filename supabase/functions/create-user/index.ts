// Edge function: create-user
// Allows the General Admin or CTES to create users with specific roles.
// Admin can create: ctes, advisor, supervisor, admin
// CTES can create: ctes, advisor, supervisor
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerProfile, error: callerError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("user_id", (await callerClient.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    if (callerError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = callerProfile.role;
    if (callerRole !== "admin" && callerRole !== "ctes") {
      return new Response(JSON.stringify({ error: "Apenas o Administrador Geral ou a CTES pode criar usuários." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, role, registration_number, department, phone } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, full_name, role." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CTES can only create ctes/advisor/supervisor. Admin can also create admin.
    const ctesAllowed = ["ctes", "advisor", "supervisor"];
    const adminAllowed = [...ctesAllowed, "admin"];
    const allowed = callerRole === "admin" ? adminAllowed : ctesAllowed;

    if (!allowed.includes(role)) {
      return new Response(
        JSON.stringify({
          error: callerRole === "admin"
            ? "Perfil inválido. Use: ctes, orientador, supervisor ou admin."
            : "A CTES só pode criar perfis de CTES, orientador ou supervisor.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        registration_number: registration_number ?? null,
        department: department ?? null,
        phone: phone ?? null,
      },
    });

    if (createError || !newUserData.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Erro ao criar usuário." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        role,
        registration_number: registration_number ?? null,
        department: department ?? null,
        phone: phone ?? null,
      })
      .eq("user_id", newUserData.user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: "Usuário criado, mas erro ao definir perfil: " + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserData.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
