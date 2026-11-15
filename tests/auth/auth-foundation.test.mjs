import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveWorkspaceAccess } from "../../lib/auth/access-policy.mjs";
import { signOutCurrentBrowser } from "../../lib/auth/flows.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("unauthenticated requests do not reach membership lookup", async () => {
  let membershipLookupCalled = false;
  const result = await resolveWorkspaceAccess(
    { getUser: async () => ({ data: { user: null }, error: null }) },
    async () => {
      membershipLookupCalled = true;
      return { data: [], error: null };
    },
  );
  assert.deepEqual(result, { status: "unauthenticated" });
  assert.equal(membershipLookupCalled, false);
});

test("authenticated users without an active workspace membership are denied", async () => {
  const result = await resolveWorkspaceAccess(
    { getUser: async () => ({ data: { user: { id: "auth-user-1" } }, error: null }) },
    async () => ({
      data: [{ user_id: "auth-user-1", workspace_id: "workspace-1", status: "suspended", role: "owner" }],
      error: null,
    }),
  );
  assert.deepEqual(result, { status: "denied" });
});

test("active membership for the verified Auth user grants dashboard access", async () => {
  const result = await resolveWorkspaceAccess(
    { getUser: async () => ({ data: { user: { id: "auth-user-1" } }, error: null }) },
    async (userId) => ({
      data: [{ user_id: userId, workspace_id: "workspace-1", status: "active", role: "owner" }],
      error: null,
    }),
  );
  assert.deepEqual(result, {
    status: "allowed",
    userId: "auth-user-1",
    workspaceId: "workspace-1",
    role: "owner",
  });
});

test("sign-out clears the current session locally even if server revocation fails", async () => {
  let options;
  const result = await signOutCurrentBrowser({
    signOut: async (receivedOptions) => {
      options = receivedOptions;
      return { error: new Error("refresh token revocation unavailable") };
    },
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(options, { scope: "local" });
});

test("Google OAuth is the sole sign-in method, email/password and Firebase are absent, and workspace gate is enforced", async () => {
  async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(fullPath);
      return /\.(?:ts|tsx|mjs)$/.test(entry.name) ? [fullPath] : [];
    }));
    return nested.flat();
  }

  const appFiles = await collectFiles(path.join(projectRoot, "app"));
  const libFiles = await collectFiles(path.join(projectRoot, "lib"));
  const sourceFiles = [...appFiles, ...libFiles];
  const source = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");

  // 1. No Supabase password registration
  assert.doesNotMatch(source, /\.auth\.signUp\s*\(/);
  // 2. No public sign-up route
  assert.doesNotMatch(source, /href\s*=\s*["']\/sign-up/);
  // 3. No password sign-in method in app/lib
  assert.doesNotMatch(source, /\.signInWithPassword\s*\(/);
  // 4. No Firebase references in app or lib
  assert.doesNotMatch(source, /from ["'](?:firebase|firebase-admin|@\/lib\/firebase)/i);
  assert.doesNotMatch(source, /firebaseSignInAction/);

  // 5. Google OAuth is configured in SignInForm with exact redirectTo and account selection
  const signInForm = await readFile(path.join(projectRoot, "app", "components", "sign-in-form.tsx"), "utf8");
  assert.match(signInForm, /signInWithOAuth/);
  assert.match(signInForm, /provider:\s*["']google["']/);
  assert.match(signInForm, /Continue with Google/);
  assert.match(signInForm, /redirectTo:\s*`\${window\.location\.origin}\/auth\/callback`/);
  assert.match(signInForm, /prompt:\s*["']select_account["']/);

  // 6. OAuth callback exchanges code for session, ensures profile, accepts invites, and checks workspace access
  const callbackRoute = await readFile(path.join(projectRoot, "app", "auth", "callback", "route.ts"), "utf8");
  assert.match(callbackRoute, /exchangeCodeForSession/);
  assert.match(callbackRoute, /create_user_profile_if_missing/);
  assert.match(callbackRoute, /accept_pending_invitation/);
  assert.match(callbackRoute, /getWorkspaceAccess/);

  // 7. App layout enforces membership gate and propagates role context
  const layout = await readFile(path.join(projectRoot, "app", "(app)", "layout.tsx"), "utf8");
  assert.match(layout, /getWorkspaceAccess/);
  assert.match(layout, /redirect\("\/sign-in"\)/);
  assert.match(layout, /redirect\("\/access-denied"\)/);
  assert.match(layout, /role=\{.*access\.role/);

  // 8. Workspace access queries workspace_memberships for active status
  const membershipCheck = await readFile(path.join(projectRoot, "lib", "auth", "workspace-access.ts"), "utf8");
  assert.match(membershipCheck, /workspace_memberships/);
  assert.match(membershipCheck, /\.eq\("user_id", \w+\)/);
  assert.match(membershipCheck, /\.eq\("status", "active"\)/);

  // 9. Invitation action enforces owner/admin privileges and prevents inviting owners
  const invitationAction = await readFile(path.join(projectRoot, "app", "actions", "invitations.ts"), "utf8");
  assert.match(invitationAction, /pending_invitations/);
  assert.match(invitationAction, /\["owner", "admin"\]\.includes/);
  assert.doesNotMatch(invitationAction, /VALID_INVITE_ROLES.*["']owner["']/);
});
