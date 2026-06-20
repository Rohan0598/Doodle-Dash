# Deploying Doodle Dash to Vercel or Netlify

You already have a complete project (`doodle-dash-project.zip`) with the right config files
for both platforms. The cleanest path is: **unzip → push to GitHub → connect to Vercel or
Netlify → done.** Every future change just needs a `git push` and it redeploys automatically.

---

## Step 1 — Unzip and create a GitHub repo

1. Unzip `doodle-dash-project.zip` into a folder on your computer.
2. Go to **https://github.com/new**
3. Repository name: `doodle-dash` (or anything). Keep it **Public** or **Private** — both work
   fine with Vercel/Netlify's free tier. Don't initialize with a README (you already have one).
4. Click **Create repository**. GitHub will show you commands — but easiest is the
   **"uploading an existing file"** link on that same page if you don't want to use git commands:
   - Drag all the files from your unzipped folder into the browser upload box.
   - Commit directly to `main`.

   *(If you're comfortable with git/terminal instead, the standard flow is: `git init`,
   `git add .`, `git commit -m "Doodle Dash"`, `git remote add origin <your-repo-url>`,
   `git push -u origin main`.)*

## Step 2A — Deploy on Vercel

1. Go to **https://vercel.com** → sign in with your GitHub account.
2. Click **Add New → Project**.
3. Select your `doodle-dash` repo → **Import**.
4. Framework Preset: choose **Other** (it's a static site, no build step).
5. Leave Build Command and Output Directory blank.
6. Click **Deploy**.
7. In ~30 seconds you'll get a live URL like `https://doodle-dash-yourname.vercel.app`
   — **this is your shareable game link.**

## Step 2B — Deploy on Netlify (alternative)

1. Go to **https://app.netlify.com** → sign in with GitHub.
2. Click **Add new site → Import an existing project**.
3. Choose GitHub → select your `doodle-dash` repo.
4. Build command: leave blank. Publish directory: `.` (just a dot).
5. Click **Deploy site**.
6. You'll get a URL like `https://doodle-dash-yourname.netlify.app`.

Either platform works the same way for this game — pick whichever you already have an account
on, or whichever name you like better. You don't need both.

---

## Step 3 — Updating the game later

Any time you (or I) change a file:
1. Push the change to GitHub (`git push`, or re-upload via the GitHub web UI).
2. Vercel/Netlify auto-detects the change and redeploys within ~30–60 seconds.
3. Your link stays exactly the same — no need to re-share a new URL.

---

## Quick checklist before sharing your link with friends

- [ ] `firebase-config.js` has your real project values (already done in this project)
- [ ] Firebase Console → Realtime Database → Rules are published as `.read: true, .write: true`
- [ ] You've opened your deployed link yourself once and confirmed "Connected" shows on the landing page (green dot, bottom of the card)
- [ ] Tested with two browser tabs: create a room in one, join with the code in the other
