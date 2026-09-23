/* NextUp Credit Pro settings. Safe to be public: it holds NO secrets.
   Fill these in when you finish the Supabase step (see docs/START-HERE.md). */
window.NCP = {
  MODE: "demo",                 // "demo" = sample data only. "live" = real accounts (used by /app).
  FEEDBACK_EMAIL: "support@nextupcapitalgroup.com",           // Where demo feedback goes, for example you@yourbusiness.com
  SUPABASE_URL: "https://wvgfehgflbtxojhxbrza.supabase.co",             // Project URL from Supabase (Settings > API)
  SUPABASE_ANON_KEY: "sb_publishable__RndjF1d07NAEDkGUOjApA_IbSmTLcD",         // The "anon public" key from Supabase (public by design)

  /* ConsumerDirect enrollment widget (/enroll). The client key is meant to be public/embeddable
     (it sits in a data- attribute on the page), same as the anon key above - still, paste the real
     one in here yourself rather than in chat, same as any other credential.
     Switch CD_ENV to "production" once compliance approves and John sends the production client key
     (the production URLs below are fixed/known already, per ConsumerDirect's docs - not partner-specific). */
  CD_ENV: "stage",              // "stage" or "production"
  CD_PID: "60983",              // Your ConsumerDirect PID (PIDN), from the PartnerHub / outreach thread
  CD_PRODUCT_NAME: "smartcredit",     // Confirm this with John - every example in their docs uses "smartcredit"
  CD_COMPANY_NAME: "NextUp Credit Pro",  // Shown in the required co-marketing message widget
  CD_STAGE_CLIENT_KEY: "f87c290d-26e0-4b55-9e58-aff72d3d9c4f",
  CD_STAGE_MEMBER_URL: "https://stage-sc.consumerdirect.app",
  CD_STAGE_CDN: "https://stage-cdn.consumerdirect.io/cd-widgets/latest/cd-signup.js",
  CD_PROD_CLIENT_KEY: "PASTE_PRODUCTION_CLIENT_KEY_WHEN_ISSUED",
  CD_PROD_MEMBER_URL: "https://www.smartcredit.com",
  CD_PROD_CDN: "https://cdn.consumerdirect.io/cd-widgets/latest/cd-signup.js"
};
