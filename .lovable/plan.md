

The screenshot shows "email rate limit exceeded" — a 429 from Supabase Auth on `/auth/v1/recover`. This is Supabase's default built-in email rate limit (very low: ~2 emails/hour on the free tier shared SMTP), not a code bug.

The user already has working `/recuperar-senha` and `/redefinir-senha` pages. Nothing in our code is broken — the limit is server-side at Supabase's shared SMTP layer.

## Why this happens

Supabase's default SMTP is shared across all projects and heavily rate-limited. Once you trigger a few password resets to the same address, you hit the cap and get `over_email_send_rate_limit`.

## Fix options

**Option A — Wait + use a custom sender domain (recommended, permanent fix)**
Set up Lovable Emails with a verified sender domain. This routes auth emails through Lovable's infrastructure (not Supabase's shared SMTP), removing the tight rate limit and letting you brand the emails.

**Option B — Just wait**
The limit resets in ~1 hour. No code changes needed. Good if you don't want a custom domain right now.

**Option C — In-app reset for dev**
For dev convenience, add a temporary admin-only "reset password" button in the super-admin area that uses the service role to update a user's password directly (bypasses email entirely). Not recommended for production users but useful while testing.

## Plan

1. Explain the cause (Supabase shared SMTP rate limit, not our code).
2. Recommend Option A (Lovable Emails) as the proper fix — sets up a verified sender domain so auth emails (recovery, signup, magic link) send reliably with our branding.
3. Mention Option B as the zero-effort workaround (just wait ~1h).
4. Ask which path the user wants before implementing.

No code changes needed for the diagnosis itself.

