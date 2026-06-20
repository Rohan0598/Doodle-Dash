# Doodle Dash 🎨

A real-time multiplayer drawing & guessing game (like skribbl.io), built with vanilla JS + Firebase Realtime Database.

## Live setup

See [SETUP.md](./SETUP.md) for full Firebase setup instructions.

## Deploying

This is a static site — no build step needed. Deploy via Vercel or Netlify by connecting this GitHub repo (see deployment guide).

## Files

- `index.html` — all screens (landing, lobby, game, results)
- `game.js` — game logic + Firebase sync
- `firebase-config.js` — your Firebase project credentials
- `vercel.json` / `netlify.toml` — hosting config (only the one matching your platform is used)
