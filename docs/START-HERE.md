# NextUp Credit Pro: start here (no coding needed)

Do one step at a time. Each is free unless marked.

## Step 1: Put the demo online (free, 10 minutes)
1. Make a free account at github.com.
2. Click New repository. Name it `nextup-credit-pro`. Choose Public. Create.
3. Click "uploading an existing file", drag in EVERYTHING from this folder (unzipped), commit.
4. Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
5. After a minute your link is `https://YOURNAME.github.io/nextup-credit-pro/demo/`. Send that to partners.
   The repo is public but holds no secrets and no client data. Never paste keys into it.
6. Feedback button: open `config.js`, put your email in `FEEDBACK_EMAIL`, commit.

## Step 2: Live database (free tier) - when you are ready
1. supabase.com > New project (pick a strong database password, save it in a password manager).
2. SQL Editor > paste `supabase/schema.sql` > Run.
3. Vault: add a secret named `data_key` (a long random string). This encrypts date of birth and SSN last 4.
4. Auth > turn on email sign-in, require two-step (TOTP) for agents. Turn OFF public sign-ups.
5. Storage: create a PRIVATE bucket `client-files`.
6. Copy Project URL + anon key into `config.js` (these two are safe to be public).

## Step 3: Claude (AI letter writing) - separate from this chat
This chat cannot be connected. The app calls Claude through its own API key:
1. console.anthropic.com > create account > add prepaid credit ($10-20) > set a monthly spend limit.
2. Create an API key. Put it ONLY in Supabase > Edge Functions > Secrets as `ANTHROPIC_API_KEY`. Also add `ANTHROPIC_MODEL` (pick the model name from the console).
3. Deploy `supabase/functions/draft-letters` (Supabase dashboard or CLI).
Cost estimate (unmeasured): roughly $0.20-0.30 per active client per month.

## Step 4: Phone app
Now: open the site on your phone > Share/menu > Add to Home Screen (works like an app).
Later: wrap for stores. Google Play $25 once, Apple $99/year.

## Free-tier cautions
Supabase free pauses after 7 days idle and has no backups: export data weekly or pay $25/month before real clients. Get a security review before storing real client data.

## What is built vs not yet
Built: full demo (every page, sample data), custom-reason option for agents and DIY, database schema with encryption and access rules (tested), letter-drafting function with rule checks (tested logic).
Not yet: wiring the pages to the live database, file uploads, Google Drive OAuth, PDF packets, payments.
