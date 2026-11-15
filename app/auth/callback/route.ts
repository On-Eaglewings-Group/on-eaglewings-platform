import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return redirectTo(request, "/sign-in?error=auth_callback_failed");
  }

  const { url, publishableKey } = getSupabaseConfig();
  const origin = request.nextUrl.origin;
  const redirectTarget = new URL(next.startsWith("/") ? next : "/", origin);
  const response = NextResponse.redirect(redirectTarget);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectTo(request, "/sign-in?error=auth_callback_failed");
  }

  // Step 3: Ensure a user_profiles row exists for this user (safe on repeat sign-ins).
  // The table grants only SELECT/UPDATE to authenticated, so we use a
  // security-definer RPC that enforces auth.uid() === p_user_id.
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    await supabase.rpc("create_user_profile_if_missing", {
      p_user_id: user.id,
      p_display_name: (user.user_metadata?.full_name as string | undefined) ?? "",
    });

    // Step 4: If a pending invitation exists for this Google email, accept it.
    // The security-definer RPC atomically creates the workspace_memberships row
    // and stamps accepted_at, preventing replay and duplicate rows.
    if (user.email) {
      await supabase.rpc("accept_pending_invitation", {
        p_user_id: user.id,
        p_email: user.email,
      });
    }
  }

  // Check workspace membership (may now exist thanks to invitation acceptance above).
  const access = await getWorkspaceAccess(supabase);
  if (access.status === "allowed") {
    return response;
  }

  // Authenticated with Google, but no active workspace membership.
  const accessDeniedResponse = NextResponse.redirect(new URL("/access-denied", origin));
  accessDeniedResponse.headers.set("Cache-Control", "private, no-store");
  response.cookies.getAll().forEach((cookie) => {
    accessDeniedResponse.cookies.set(cookie.name, cookie.value);
  });
  return accessDeniedResponse;
}
