# Doodle Dash — Online Multiplayer Setup

This game needs two things to go live for real, cross-device play:
1. A free Firebase project (the "server" that syncs everyone's drawing/guesses live)
2. Free hosting so the link actually works for other people (Firebase Hosting is easiest since it's the same account)

Takes about 10 minutes the first time.

---

## Part 1 — Create your Firebase project

1. Go to **https://console.firebase.google.com** and sign in with any Google account.
2. Click **Add project**. Name it anything (e.g. `doodle-dash`). You can disable Google Analytics — not needed.
3. Once created, you'll land on the project dashboard.

## Part 2 — Create the Realtime Database

1. In the left sidebar, click **Build → Realtime Database**.
2. Click **Create Database**.
3. Pick any location (closest to you is fine).
4. Choose **Start in test mode** (lets the game read/write without login — fine for casual play with friends).
   - ⚠️ Test mode means anyone with your database URL could technically read/write it. For a private game with friends this is normal and how most casual multiplayer game prototypes work. Don't store anything sensitive in it.
5. Click **Enable**.

## Part 3 — Register a Web App

1. In the left sidebar, click the **gear icon → Project settings**.
2. Scroll to **Your apps**, click the **`</>`** (web) icon.
3. Give it a nickname (e.g. `doodle-dash-web`), click **Register app**. Skip the "Firebase Hosting" checkbox here — we'll do that separately.
4. You'll see a code block with a `firebaseConfig` object that looks like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "doodle-dash-xxxxx.firebaseapp.com",
  databaseURL: "https://doodle-dash-xxxxx-default-rtdb.firebaseio.com",
  projectId: "doodle-dash-xxxxx",
  storageBucket: "doodle-dash-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. Copy these values into **`firebase-config.js`** (the file I gave you), replacing each `PASTE_YOUR_...` placeholder.

> If your project didn't auto-create a `databaseURL`, go back to **Realtime Database** in the sidebar — the URL is shown at the top of that page. Copy it exactly.

## Part 4 — Set Database Rules (so writes work)

1. Realtime Database → **Rules** tab.
2. Replace the rules with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. Click **Publish**.

(This is open access — fine for a casual game link shared with friends. Don't use this config for anything containing real personal/sensitive data.)

## Part 5 — Host it so the link works for others

Your friends can't load a file sitting on your computer — it needs to be on the web. Easiest free option, same Firebase account:

1. Install Firebase CLI (one-time): open a terminal and run:
   ```
   npm install -g firebase-tools
   ```
2. In the folder with `index.html`, `firebase-config.js`, and `game.js`, run:
   ```
   firebase login
   firebase init hosting
   ```
   - Select **Use an existing project** → pick your `doodle-dash` project.
   - Public directory: press Enter to accept default, or type `.` for current folder.
   - Single-page app: **No**.
   - Don't overwrite `index.html` if asked.
3. Deploy:
   ```
   firebase deploy --only hosting
   ```
4. You'll get a live URL like `https://doodle-dash-xxxxx.web.app` — **this is your shareable game link.**

**Alternative (no command line):** drag-and-drop the 3 files into **Netlify Drop** (https://app.netlify.com/drop) — gives you an instant public URL too, and works with this same Firebase backend since Firebase config is independent of hosting.

---

## How play works once it's live

1. Open your hosted URL. Enter your name → **Create Room**.
2. Share the room code or the auto-filled link (e.g. `?room=ABCD`) with friends — text it, Discord it, whatever.
3. They open the link, enter their name, and land straight in your lobby.
4. Host picks settings and hits **Start Game** — everyone's screen updates instantly.
5. Drawing strokes, guesses, and scores sync live across every device.

## Troubleshooting

- **"Firebase is not configured yet"** → you haven't filled in `firebase-config.js`, or it has a typo.
- **Room not found when joining** → double check the code is correct and the host's tab is still open (room only exists while at least the data is written — it doesn't expire automatically, but typos are the usual culprit).
- **Strokes not appearing for guessers** → check the Rules step (Part 4) was published.
- **Nothing loads at all** → open browser dev tools (F12) → Console tab, and check for a red error — usually a missing/wrong field in `firebase-config.js`.
