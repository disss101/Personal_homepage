# Supabase setup

This site is hosted on GitHub Pages, so login, likes, and comments need a backend service.
Use Supabase for Auth and Database.

1. Create a Supabase project.
2. Open SQL Editor and run `supabase-schema.sql`.
3. In Authentication > Providers, keep Email enabled.
4. In Authentication > Sign In / Providers > Email, turn off Confirm email if you want registration to work without confirmation emails.
5. In Authentication > URL Configuration, add:
   - Site URL: `https://disss101.github.io/Personal_homepage/`
   - Redirect URL: `https://disss101.github.io/Personal_homepage/**`
6. Copy Project URL and anon public key into `supabase-config.js`.
7. Commit and publish the updated `supabase-config.js`.
