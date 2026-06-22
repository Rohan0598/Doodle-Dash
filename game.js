/* ===================================================================
   DOODLE DASH — Multiplayer game logic (Firebase Realtime Database)
   =================================================================== */

const WORD_BANKS = {
  general: ["sunflower","umbrella","castle","robot","bicycle","volcano","spaceship","guitar","penguin","sandwich","rainbow","dragon","ladder","mountain","octopus","balloon","skateboard","lighthouse","cactus","snowman","pirate","windmill","jellyfish","telescope","waterfall","airplane","anchor","backpack","bathtub","beehive","binoculars","blanket","bonfire","bridge","broom","bubble","camera","candle","canoe","carousel","caterpillar","chandelier","chess board","clock","cloud","compass","crown","drum","earthquake","easel","escalator","fan","feather","fence","fireworks","flashlight","fountain","fishbowl","glasses","globe","hammock","handshake","hourglass","igloo","kite","knight","lantern","lawnmower","magnet","map","maze","microscope","mirror","mitten","mushroom","necklace","nest","origami","paintbrush","parachute","passport","piano","pillow","pinwheel","pretzel","puzzle","quill","raft","rocket","rollercoaster","saddle","sailboat","scarecrow","scissors","seesaw","shipwreck","skeleton","sled","snorkel","snowflake","spider web","staircase","stethoscope","suitcase","sundial","surfboard","swing set","teapot","tent","throne","tightrope","toolbox","tornado","traffic light","treehouse","tricycle","trophy","tuba","typewriter","unicycle","vacuum","violin","wagon","wheelbarrow","whistle","wizard hat","xylophone","yoyo","zeppelin"],
  animals: ["elephant","kangaroo","flamingo","octopus","penguin","giraffe","hedgehog","platypus","chameleon","walrus","peacock","raccoon","otter","koala","narwhal","alpaca","anteater","armadillo","baboon","badger","bat","beaver","bison","camel","cheetah","chimpanzee","cobra","cricket","crocodile","deer","dolphin","eagle","falcon","ferret","firefly","fox","gazelle","gecko","gorilla","hawk","hippopotamus","hyena","iguana","jaguar","jellyfish","ladybug","lemur","leopard","lobster","mole","mongoose","moose","ostrich","owl","panda","pangolin","parrot","pelican","porcupine","puffin","rabbit","rhinoceros","scorpion","seahorse","seal","shark","skunk","sloth","snail","squid","squirrel","starfish","stingray","swan","tiger","toucan","turtle","vulture","wolf","wombat","zebra"],
  food: ["pizza","sushi","pancake","watermelon","taco","popcorn","cupcake","spaghetti","croissant","burrito","donut","pretzel","lemonade","waffle","noodles","avocado","bagel","baguette","banana split","barbecue","biryani","biscuit","brownie","burger","cake","candy cane","cereal","cheese","cheesecake","chili","chocolate bar","churro","coconut","cookie","corn on the cob","crepe","curry","dumpling","eclair","fish and chips","fortune cookie","french fries","fried egg","fruit salad","gingerbread man","grapes","guacamole","honey","hot dog","hummus","ice cream cone","jam","ketchup","kiwi","lasagna","lollipop","macaroni","mango","meatball","milkshake","muffin","nachos","omelette","onion rings","oyster","pancetta","pasta","peanut butter","pie","pineapple","popsicle","pumpkin pie","quesadilla","ramen","ravioli","salad","salsa","sandwich","sausage","smoothie","soup","spring roll","strawberry","sundae","sushi roll","tea","toast","tomato","watermelon slice"],
  movies: ["superhero","robot","dinosaur","spaceship","wizard","ghost","zombie","time machine","treasure map","alien invasion","car chase","detective","explosion","haunted house","jungle expedition","magic spell","martial arts fight","pirate ship","robot uprising","secret agent","shipwreck","sword fight","talking animal","underwater city","villain lair","western showdown"],
  monuments: ["Eiffel Tower","Statue of Liberty","Taj Mahal","Great Wall of China","Pyramids of Giza","Colosseum","Big Ben","Leaning Tower of Pisa","Sydney Opera House","Christ the Redeemer","Machu Picchu","Stonehenge","Mount Rushmore","Golden Gate Bridge","Burj Khalifa","Sagrada Familia","Brandenburg Gate","Acropolis","Angkor Wat","Petra","Niagara Falls","Mount Fuji","Tower Bridge","Hollywood Sign","Empire State Building","Notre Dame","Buckingham Palace","Red Fort","India Gate","Charminar","Gateway of India","Hawa Mahal","Lotus Temple","Konark Sun Temple","Victoria Memorial"]
};
const PLAYER_COLORS = ["#FF5C5C","#3FBFB4","#FFB627","#9B7EDE","#5FB85A","#FF8FB1","#5DA9E9","#E08D45"];

/* ---------------------- Local identity ---------------------- */
function uid(len=20){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function roomCodeGen(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let s=''; for(let i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

// IMPORTANT: this used to be sessionStorage, which mobile browsers
// (especially iOS Safari) frequently wipe when a backgrounded tab gets
// reloaded to save memory. When that happened mid-game, the player would
// silently get a brand-new random ID — which no longer matched the ID
// Firebase had recorded for them in turnOrder/players, so the app could
// never recognize them as "the drawer" again even on their own turn.
// localStorage persists across reloads/backgrounding, so identity now
// survives for the lifetime of the browser (until cleared manually).
let myPlayerId = localStorage.getItem('dd_playerId') || uid();
localStorage.setItem('dd_playerId', myPlayerId);

let myRoomCode = null;
let myName = '';
let isHost = false;
let roomRef = null;
let listeners = [];
let localTimerInterval = null;

let roomState = null; // last known snapshot of /rooms/{code}
let chatRenderedKeys = new Set();
let strokeRenderedKeys = new Set();

/* ---------------------- Connection status ---------------------- */
function showError(msg){
  const el = document.getElementById('error-banner');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 5000);
}

function initConnectionWatcher(){
  if(typeof db === 'undefined'){
    document.getElementById('conn-dot').className = 'dot err';
    document.getElementById('conn-text').textContent = 'firebase-config.js not set up yet — see SETUP.md';
    return;
  }
  db.ref('.info/connected').on('value', (snap) => {
    const ok = snap.val() === true;
    document.getElementById('conn-dot').className = 'dot ' + (ok ? 'ok' : '');
    document.getElementById('conn-text').textContent = ok ? 'Connected' : 'Connecting to server…';
  });
}

/* ---------------------- Landing screen ---------------------- */
function goScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.getElementById('create-room-btn').addEventListener('click', async () => {
  myName = (document.getElementById('name-input').value || '').trim();
  if(!myName){ showError('Enter your name first'); return; }
  if(typeof db === 'undefined'){ showError('Firebase is not configured yet — see SETUP.md'); return; }

  const code = roomCodeGen();
  myRoomCode = code;
  isHost = true;
  roomRef = db.ref('rooms/' + code);

  const initialSettings = {
    drawtime: 80, rounds: 3, mode: 'normal', wordcount: 3, hints: 2, bank: 'general'
  };

  await roomRef.set({
    hostId: myPlayerId,
    status: 'lobby',
    createdAt: Date.now(),
    settings: initialSettings,
    round: 1,
    turnIndex: 0,
    turnOrder: [],
    players: {
      [myPlayerId]: { name: myName, score: 0, joinedAt: Date.now(), colorIdx: 0 }
    }
  });

  enterLobby();
  rememberRoom();
});

document.getElementById('join-room-btn').addEventListener('click', async () => {
  myName = (document.getElementById('name-input').value || '').trim();
  const code = (document.getElementById('join-code-input').value || '').trim().toUpperCase();
  if(!myName){ showError('Enter your name first'); return; }
  if(!code){ showError('Enter a room code'); return; }
  if(typeof db === 'undefined'){ showError('Firebase is not configured yet — see SETUP.md'); return; }

  const ref = db.ref('rooms/' + code);
  const snap = await ref.once('value');
  if(!snap.exists()){ showError('Room not found. Check the code.'); return; }
  const data = snap.val();
  if(data.status !== 'lobby'){ showError('That game already started.'); return; }

  myRoomCode = code;
  isHost = (data.hostId === myPlayerId);
  roomRef = ref;

  const existingCount = data.players ? Object.keys(data.players).length : 0;
  await roomRef.child('players/' + myPlayerId).set({
    name: myName, score: 0, joinedAt: Date.now(), colorIdx: existingCount % PLAYER_COLORS.length
  });

  enterLobby();
  rememberRoom();
});

/* Allow joining directly via ?room=CODE in URL */
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const linkedRoom = params.get('room') ? params.get('room').toUpperCase() : null;
  if(linkedRoom){
    document.getElementById('join-code-input').value = linkedRoom;
    document.getElementById('create-block').style.display = 'none';
    document.querySelector('.or-divider').style.display = 'none';
  }
  initConnectionWatcher();

  // Rejoin handling: if this device was already a player in a room (e.g.
  // the tab got reloaded mid-game by the mobile OS), we used to silently
  // reconnect automatically. That caused a real problem: there was no way
  // to tell "the OS reloaded my tab, please restore my game" apart from
  // "I manually cleared the URL because I want to go home" — both look
  // identical (a fresh page load with no ?room= param and a remembered
  // room in storage). Silently rejoining made the second case impossible:
  // editing the URL down to the bare domain just bounced you right back
  // into the same room every time.
  //
  // Fix: never rejoin silently. If there's a remembered room, show a small
  // dismissible prompt and let the person choose. An explicit ?room=CODE
  // link in the URL still always wins and skips the prompt entirely, since
  // clicking a fresh invite is itself a clear, unambiguous choice.
  const remembered = JSON.parse(localStorage.getItem('dd_lastRoom') || 'null');
  const linkPointsElsewhere = linkedRoom && remembered && remembered.roomCode && linkedRoom !== remembered.roomCode;

  if(linkedRoom && !linkPointsElsewhere && remembered && remembered.roomCode === linkedRoom){
    // The link matches the room we already remember — just go straight in,
    // no need to prompt since the URL itself is the explicit choice.
    await attemptRejoin(remembered);
  } else if(remembered && remembered.roomCode && !linkedRoom && typeof db !== 'undefined'){
    showRejoinPrompt(remembered);
  }
});

async function attemptRejoin(remembered){
  if(typeof db === 'undefined') return false;
  try{
    const snap = await db.ref('rooms/' + remembered.roomCode + '/players/' + myPlayerId).once('value');
    if(snap.exists()){
      myRoomCode = remembered.roomCode;
      myName = snap.val().name || remembered.name || '';
      isHost = remembered.isHost === true;
      roomRef = db.ref('rooms/' + myRoomCode);
      const hostSnap = await roomRef.child('hostId').once('value');
      isHost = hostSnap.val() === myPlayerId;
      enterLobby();
      return true;
    }
  } catch(e){ /* room may no longer exist */ }
  // Stale/invalid — clean it up so we don't keep prompting for a dead room.
  localStorage.removeItem('dd_lastRoom');
  return false;
}

function showRejoinPrompt(remembered){
  const banner = document.getElementById('rejoin-banner');
  document.getElementById('rejoin-room-code').textContent = remembered.roomCode;
  banner.classList.add('show');
  document.getElementById('rejoin-yes-btn').onclick = async () => {
    banner.classList.remove('show');
    const ok = await attemptRejoin(remembered);
    if(!ok) showError('That game is no longer available.');
  };
  document.getElementById('rejoin-no-btn').onclick = () => {
    banner.classList.remove('show');
    localStorage.removeItem('dd_lastRoom');
  };
}

function rememberRoom(){
  localStorage.setItem('dd_lastRoom', JSON.stringify({ roomCode: myRoomCode, name: myName, isHost }));
}

// Fully detach from the current room and return to the landing screen.
// This is the fix for "impossible to go back to home without clearing
// cookies" — previously there was no way to exit a room at all once
// you'd joined one, and the remembered room in localStorage would keep
// silently reconnecting you to it on every future page load.
function leaveRoom(){
  if(roomRef){
    roomRef.off();
    roomRef.child('chat').off();
    roomRef.child('strokes').off();
    roomRef.child('clearSignal').off();
    roomRef.child('guesses').off();
  }
  clearInterval(localTimerInterval);
  localTimerInterval = null;
  nonHostTickerStarted = false;
  roomState = null;
  roomRef = null;
  myRoomCode = null;
  isHost = false;
  chatRenderedKeys.clear();
  strokeRenderedKeys.clear();
  localStorage.removeItem('dd_lastRoom');

  // Clean the ?room= param out of the URL so reloading doesn't re-trigger
  // the join flow, and reset the landing form back to its default state.
  if(window.history && window.history.replaceState){
    window.history.replaceState({}, '', window.location.pathname);
  }
  document.getElementById('create-block').style.display = 'block';
  document.querySelector('.or-divider').style.display = 'block';
  document.getElementById('join-code-input').value = '';

  goScreen('landing-screen');
}

document.getElementById('leave-room-lobby-btn').addEventListener('click', leaveRoom);
document.getElementById('leave-room-game-btn').addEventListener('click', () => {
  if(confirm('Leave this game and go back to the home screen?')){
    leaveRoom();
  }
});

/* ---------------------- Lobby ---------------------- */
function enterLobby(){
  goScreen('lobby-screen');
  document.getElementById('room-code-text').textContent = myRoomCode;
  const link = window.location.origin + window.location.pathname + '?room=' + myRoomCode;
  document.getElementById('share-link-input').value = link;

  document.getElementById('host-settings-wrap').style.display = isHost ? 'block' : 'none';
  document.getElementById('settings-summary-view').style.display = isHost ? 'none' : 'grid';
  document.getElementById('waiting-msg').style.display = isHost ? 'none' : 'block';

  attachRoomListener();
}

document.getElementById('copy-link-btn').addEventListener('click', () => {
  const input = document.getElementById('share-link-input');
  input.select();
  navigator.clipboard?.writeText(input.value).catch(()=>{});
  document.execCommand && document.execCommand('copy');
  const btn = document.getElementById('copy-link-btn');
  const old = btn.textContent; btn.textContent = 'Copied!';
  setTimeout(()=> btn.textContent = old, 1200);
});

document.getElementById('start-game-btn').addEventListener('click', async () => {
  if(!isHost || !roomState) return;
  const players = roomState.players || {};
  const ids = Object.keys(players);
  if(ids.length < 2){ showError('Need at least 2 players to start'); return; }

  const settings = {
    drawtime: parseInt(document.getElementById('opt-drawtime').value, 10),
    rounds: parseInt(document.getElementById('opt-rounds').value, 10),
    mode: document.getElementById('opt-mode').value,
    drawMode: document.getElementById('opt-drawmode').value, // 'everyone' | 'host_only'
    wordcount: parseInt(document.getElementById('opt-wordcount').value, 10),
    hints: parseInt(document.getElementById('opt-hints').value, 10),
    bank: document.getElementById('opt-bank').value
  };

  // turnOrder is always the full shuffled player list — used for round-wrap
  // math and "how many non-drawers must guess" counts. Who actually draws
  // each turn is resolved separately by currentDrawerId(), which checks
  // settings.drawMode: in "host_only" mode every turn's drawer is just the
  // host, regardless of whose "turn" it nominally is in this list.
  const order = [...ids];
  for(let i=order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }

  // Same atomic-write fix as the "next turn" flow: settings/turnOrder/round/
  // turnIndex are passed into beginTurnAsHost's single update() call instead
  // of being written separately beforehand. Two separate writes here meant
  // clients could briefly observe status:'choosing' with stale/empty
  // wordOptions from before beginTurnAsHost's write landed.
  await beginTurnAsHost({ settings, turnOrder: order, round: 1, turnIndex: 0 });
});

/* ---------------------- Room listener (all clients) ---------------------- */
function attachRoomListener(){
  roomRef.on('value', (snap) => {
    const data = snap.val();
    if(!data){ showError('Room closed.'); return; }
    const prevStatus = roomState ? roomState.status : null;
    roomState = data;
    renderLobbyPlayers();
    renderSettingsSummary();

    if(data.status === 'lobby'){
      goScreen('lobby-screen');
    } else if(data.status === 'choosing' || data.status === 'drawing'){
      if(document.getElementById('game-screen').classList.contains('active') === false){
        goScreen('game-screen');
      }
      renderGameState(prevStatus);
    } else if(data.status === 'reveal'){
      goScreen('game-screen');
      renderGameState(prevStatus);
      showRevealOverlay();
    } else if(data.status === 'final'){
      showFinalResults();
    }
  });

  roomRef.child('chat').on('child_added', (snap) => {
    if(chatRenderedKeys.has(snap.key)) return;
    chatRenderedKeys.add(snap.key);
    const msg = snap.val();
    renderChatMessage(msg);
  });

  roomRef.child('strokes').on('child_added', (snap) => {
    if(strokeRenderedKeys.has(snap.key)) return;
    strokeRenderedKeys.add(snap.key);
    drawStrokeSegment(snap.val());
  });

  roomRef.child('strokes').on('child_removed', () => {
    // a clear event removes all strokes; handled by 'value' below for full clear detection
  });

  // Detect "clear" command via dedicated node
  roomRef.child('clearSignal').on('value', (snap) => {
    const v = snap.val();
    if(v && v.ts && v.ts !== lastClearTs){
      lastClearTs = v.ts;
      clearCanvasLocal();
    }
  });

  // Host-only: react whenever ANY player's guess is written (not just our own),
  // so a non-host guessing correctly still triggers a scoring pass.
  if(isHost){
    roomRef.child('guesses').on('child_added', () => {
      scorePendingGuesses();
    });
  }
}
let lastClearTs = 0;

function renderLobbyPlayers(){
  const ul = document.getElementById('lobby-players');
  ul.innerHTML = '';
  const players = roomState.players || {};
  Object.keys(players).forEach((pid, i) => {
    const p = players[pid];
    const li = document.createElement('li');
    const color = PLAYER_COLORS[p.colorIdx ?? (i % PLAYER_COLORS.length)];
    li.innerHTML = `
      <span class="avatar" style="background:${color}">${(p.name||'?')[0].toUpperCase()}</span>
      <span>${p.name}</span>
      ${pid === roomState.hostId ? '<span class="host-tag">HOST</span>' : ''}
    `;
    ul.appendChild(li);
  });
}

function renderSettingsSummary(){
  if(isHost || !roomState.settings) return;
  const s = roomState.settings;
  const el = document.getElementById('settings-summary-view');
  el.innerHTML = `
    <div>⏱️ ${s.drawtime}s draw time</div>
    <div>🔁 ${s.rounds} rounds</div>
    <div>🎮 ${s.mode}</div>
    <div>❓ ${s.hints} hints</div>
    <div>✏️ ${s.drawMode === 'host_only' ? 'Host draws all turns' : 'Everyone takes turns'}</div>
  `;
}

/* ---------------------- Canvas ---------------------- */
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastPoint = null;
let brushColor = '#1A1A2E';
let brushSize = 6;
let tool = 'pen';
let currentStrokePoints = [];

// Fixed internal drawing resolution — decoupled from on-screen CSS size.
// This is the key fix for strokes disappearing/not syncing on laptops:
// the canvas bitmap is now sized ONCE and never reset by a window resize
// (resizing canvas.width/height always wipes the bitmap, which was
// silently erasing strokes whenever a laptop browser fired a resize
// event after page load — scrollbars, devtools, font-load reflow, etc).
// We keep the canvas's *internal* pixel grid fixed at CANVAS_W x CANVAS_H
// and let CSS scale it visually; all stroke coordinates are normalized
// 0–1 against this fixed grid so every device — laptop or phone, any
// aspect ratio — draws and replays strokes at the exact same relative
// position.
const CANVAS_W = 1000;
const CANVAS_H = 625; // matches the 16:10 aspect-ratio set in CSS

function fitCanvas(){
  const ratio = window.devicePixelRatio || 1;
  if(canvas.width !== CANVAS_W * ratio || canvas.height !== CANVAS_H * ratio){
    canvas.width = CANVAS_W * ratio;
    canvas.height = CANVAS_H * ratio;
  }
  // Always re-apply transform and default stroke settings.
  // These get wiped whenever canvas.width/height changes AND whenever
  // ctx.restore() is called (which reverts the full context state).
  // Setting them here unconditionally means fitCanvas() can be called
  // as a "reset context state" function, not just a resize handler.
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1A1A2E';
  ctx.lineWidth = 6;
  ctx.fillStyle = '#FFFFFF';
}

// Call fitCanvas before first use — NOT deferred via setTimeout.
// Previously a 200ms setTimeout meant strokes arriving via child_added
// (which Firebase fires immediately on listener attach for existing data)
// were drawn BEFORE fitCanvas ran — onto a canvas with no transform
// and wrong dimensions, producing tiny disconnected grey dashes on
// observers' screens. Calling fitCanvas() synchronously at script load
// ensures the canvas is always properly sized before any strokes arrive.
fitCanvas();
// Also re-run on resize (DPR changes, window resize) and load
window.addEventListener('resize', fitCanvas);
window.addEventListener('load', fitCanvas);

function isMyTurnToDraw(){
  if(!roomState || roomState.status !== 'drawing') return false;
  return currentDrawerId() === myPlayerId;
}

// Maps a real pointer/touch event to a position on the FIXED canvas grid
// (CANVAS_W x CANVAS_H), regardless of how big the canvas is drawn on screen.
function getPos(e){
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;
  if(e.touches && e.touches.length){ clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
  else { clientX = e.clientX; clientY = e.clientY; }
  const xRatio = (clientX - rect.left) / rect.width;
  const yRatio = (clientY - rect.top) / rect.height;
  return { x: xRatio * CANVAS_W, y: yRatio * CANVAS_H };
}

// Stroke writing: one Firebase push per segment (one per mousemove/touchmove).
// We tried batching (accumulating points and flushing every 50ms) to reduce
// write rate, but the serialization format (string encoding) was adding
// complexity that made it hard to diagnose observer rendering issues.
// Per-segment writes are simpler and Firebase Realtime DB handles the rate
// fine for a drawing game (strokes are small payloads, ~100 bytes each).
// The coords are normalized 0-1 against CANVAS_W/CANVAS_H so every device
// renders at the same relative position regardless of screen size.

function localStroke(p1, p2, color, size, toolType){
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = toolType === 'eraser' ? '#FFFFFF' : color;
  ctx.lineWidth = toolType === 'eraser' ? size * 3 : size;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function startDraw(e){
  if(!isMyTurnToDraw()) return;
  e.preventDefault();
  drawing = true;
  lastPoint = getPos(e);
}
function moveDraw(e){
  if(!drawing || !isMyTurnToDraw()) return;
  e.preventDefault();
  const p = getPos(e);
  localStroke(lastPoint, p, brushColor, brushSize, tool);
  roomRef.child('strokes').push({
    x1: lastPoint.x/CANVAS_W,
    y1: lastPoint.y/CANVAS_H,
    x2: p.x/CANVAS_W,
    y2: p.y/CANVAS_H,
    c: brushColor,
    s: brushSize,
    t: tool
  });
  lastPoint = p;
}
function endDraw(){ drawing = false; }

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
window.addEventListener('mouseup', endDraw);
canvas.addEventListener('touchstart', startDraw, {passive:false});
canvas.addEventListener('touchmove', moveDraw, {passive:false});
canvas.addEventListener('touchend', endDraw);

function drawStrokeSegment(s){
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Support both short keys (c/s/t) and legacy long keys (color/size/tool)
  const color = s.c || s.color || '#1A1A2E';
  const size  = s.s || s.size  || 6;
  const tool  = s.t || s.tool  || 'pen';
  ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
  ctx.lineWidth   = tool === 'eraser' ? size * 3 : size;
  ctx.beginPath();
  ctx.moveTo(s.x1 * CANVAS_W, s.y1 * CANVAS_H);
  ctx.lineTo(s.x2 * CANVAS_W, s.y2 * CANVAS_H);
  ctx.stroke();
}

function clearCanvasLocal(){
  // Do NOT use ctx.save()/ctx.restore() here — restore() resets the entire
  // canvas context state including lineCap, lineJoin, strokeStyle, lineWidth,
  // back to browser defaults ('butt', 'miter', 'black', 1). After a clear,
  // the next stroke would look thin and harsh until drawStrokeSegment
  // explicitly reset them. Instead, just fill the rect and then re-call
  // fitCanvas() to ensure all context settings are correct.
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

document.getElementById('clear-canvas-btn').addEventListener('click', () => {
  if(!isMyTurnToDraw()) return;
  clearCanvasLocal();
  roomRef.child('strokes').remove();
  strokeRenderedKeys.clear();
  roomRef.child('clearSignal').set({ts: Date.now()});
});

function buildSwatches(){
  const colors = ["#1A1A2E","#FF5C5C","#FFB627","#3FBFB4","#5DA9E9","#9B7EDE","#5FB85A","#FF8FB1"];
  const wrap = document.getElementById('swatches');
  wrap.innerHTML = '';
  colors.forEach((c,i) => {
    const sw = document.createElement('div');
    sw.className = 'swatch' + (i===0?' active':'');
    sw.style.background = c;
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active');
      brushColor = c; tool = 'pen';
      document.getElementById('tool-pen').classList.add('active');
      document.getElementById('tool-eraser').classList.remove('active');
    });
    wrap.appendChild(sw);
  });
}
buildSwatches();

document.getElementById('tool-pen').addEventListener('click', () => {
  tool = 'pen';
  document.getElementById('tool-pen').classList.add('active');
  document.getElementById('tool-eraser').classList.remove('active');
});
document.getElementById('tool-eraser').addEventListener('click', () => {
  tool = 'eraser';
  document.getElementById('tool-eraser').classList.add('active');
  document.getElementById('tool-pen').classList.remove('active');
});
document.getElementById('brushSize').addEventListener('input', (e) => { brushSize = parseInt(e.target.value,10); });

/* ---------------------- Turn flow (host-authoritative) ---------------------- */
function currentDrawerId(){
  if(!roomState || !roomState.turnOrder || !roomState.turnOrder.length) return null;
  if(roomState.settings && roomState.settings.drawMode === 'host_only'){
    return roomState.hostId;
  }
  return roomState.turnOrder[roomState.turnIndex % roomState.turnOrder.length];
}

function pickWordOptions(settings){
  const pool = [...(WORD_BANKS[settings.bank] || WORD_BANKS.general)];
  const n = Math.min(settings.wordcount, pool.length);
  const chosen = [];
  while(chosen.length < n && pool.length){
    chosen.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }
  return chosen;
}

async function beginTurnAsHost(extraUpdates){
  if(!isHost) return;
  // Prefer the settings being written in this same update (e.g. when the
  // host just clicked Start Game) over the locally cached roomState.settings,
  // which may still reflect the lobby's old defaults until Firebase's
  // listener round-trip catches up — using the stale value here could pick
  // words from the wrong word bank for the very first turn.
  const settings = (extraUpdates && extraUpdates.settings) || roomState.settings;
  const options = pickWordOptions(settings);
  // IMPORTANT: turnIndex/round (when advancing to a new turn) are merged
  // into this SAME update() call as status/wordOptions/etc — previously
  // these were two separate writes (advance turn, then begin turn), which
  // meant every client's listener could fire in between them and briefly
  // see "new drawer, but status still = drawing from the old turn" — that
  // window let the incoming drawer's canvas unlock a beat early, looking
  // like two people could draw at once. A single atomic update means
  // clients only ever see one complete, consistent turn state.
  await roomRef.update({
    ...(extraUpdates || {}),
    status: 'choosing',
    wordOptions: options,
    currentWord: null,
    revealedHints: 0,
    guesses: null,
    chat: null,
    strokes: null,
    turnScoreGains: null,
    turnStartedAt: null
  });
  chatRenderedKeys.clear();
  strokeRenderedKeys.clear();
}

function renderGameState(prevStatus){
  if(!roomState) return;
  const drawerId = currentDrawerId();
  const drawerName = (roomState.players[drawerId] || {}).name || '?';
  const amDrawer = drawerId === myPlayerId;
  const alreadyGuessed = roomState.guesses && roomState.guesses[myPlayerId];

  document.getElementById('round-indicator').textContent = `Round ${roomState.round} / ${roomState.settings.rounds}`;
  document.getElementById('drawer-tag').textContent = amDrawer ? "You are drawing!" : `${drawerName} is drawing`;

  document.getElementById('toolbar').classList.toggle('disabled', !amDrawer || roomState.status !== 'drawing');

  const chatDisabled = (amDrawer && roomState.status === 'drawing') || !!alreadyGuessed;
  const chatPlaceholder = amDrawer && roomState.status === 'drawing'
    ? "You're drawing — can't guess!"
    : alreadyGuessed ? "You already guessed it! 🎉"
    : "Type your guess...";
  document.getElementById('chat-input').disabled = chatDisabled;
  document.getElementById('chat-input').placeholder = chatPlaceholder;

  renderScoreboard();

  if(roomState.status === 'choosing'){
    // A new turn just started. The canvas and word-blanks previously held
    // whatever was drawn/shown last turn — strokes are only ever ADDED to
    // the canvas (each arriving stroke segment is painted on top, nothing
    // ever erases it locally), and word-blanks text was only updated while
    // status === 'drawing'. So without this, every new turn silently kept
    // showing the previous turn's finished drawing and word underneath the
    // "picking a word..." overlay — exactly the stale-umbrella bug.
    if(prevStatus !== 'choosing'){
      clearCanvasLocal();
      strokeRenderedKeys.clear();
    }
    document.getElementById('word-blanks').textContent = '';
    document.getElementById('hint-row').textContent = '';
    handleChoosingPhase(amDrawer, drawerName);
  } else {
    document.getElementById('word-choice-overlay').classList.remove('active');
    document.getElementById('choosing-banner').style.display = 'none';
  }

  if(roomState.status === 'drawing'){
    document.getElementById('reveal-overlay').classList.remove('active');
    updateWordBlanksDisplay(amDrawer);
    runLocalTimerIfHost();
  }
}

function handleChoosingPhase(amDrawer, drawerName){
  const overlay = document.getElementById('word-choice-overlay');
  const titleEl = document.getElementById('word-choice-title');
  const choicesWrap = document.getElementById('word-choices');
  const banner = document.getElementById('choosing-banner');

  if(amDrawer){
    // Drawer: show the full-screen word-choice overlay (only they see it)
    overlay.classList.add('active');
    banner.style.display = 'none';
    titleEl.textContent = "Pick a word to draw";
    choicesWrap.style.display = 'flex';
    choicesWrap.innerHTML = '';
    (roomState.wordOptions || []).forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'word-choice-btn';
      btn.textContent = w;
      btn.addEventListener('click', async () => {
        const seconds = roomState.settings.mode === 'speedrun' ? Math.ceil(roomState.settings.drawtime/2) : roomState.settings.drawtime;
        await roomRef.update({
          currentWord: w,
          status: 'drawing',
          turnStartedAt: firebase.database.ServerValue.TIMESTAMP,
          turnDuration: seconds
        });
      });
      choicesWrap.appendChild(btn);
    });
  } else {
    // Non-drawers: hide the full overlay, show a slim non-blocking banner
    // at the top instead so the canvas remains visible.
    overlay.classList.remove('active');
    banner.style.display = 'block';
    banner.textContent = `⏳ ${drawerName} is picking a word…`;
  }
}

function updateWordBlanksDisplay(amDrawer){
  const word = roomState.currentWord || '';
  const blanksEl = document.getElementById('word-blanks');
  if(!word){ blanksEl.textContent = ''; return; }

  if(amDrawer){
    blanksEl.textContent = word.toUpperCase();
    document.getElementById('hint-row').textContent = 'Only you can see the word';
    return;
  }

  // Already guessed correctly this turn — show the full word
  const alreadyGuessed = roomState.guesses && roomState.guesses[myPlayerId];
  if(alreadyGuessed){
    blanksEl.textContent = word.toUpperCase();
    document.getElementById('hint-row').textContent = '✅ You guessed it!';
    return;
  }

  if(roomState.settings.mode === 'hidden'){
    blanksEl.textContent = `(${word.length} letters)`;
    return;
  }
  const revealedHints = roomState.revealedHints || 0;
  const seed = hashStr(word + (roomState.turnIndex||0));
  const letterIdxs = [...word].map((c,i)=>i).filter(i => word[i] !== ' ');
  const order = seededShuffle(letterIdxs, seed);
  const revealSet = new Set(order.slice(0, revealedHints));
  blanksEl.textContent = [...word].map((c,i) => c === ' ' ? '  ' : (revealSet.has(i) ? c.toUpperCase() : '_')).join(' ');
  document.getElementById('hint-row').textContent = revealedHints > 0 ? `Hints revealed: ${revealedHints}/${roomState.settings.hints}` : '';
}

function hashStr(s){
  let h = 0;
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}
function seededShuffle(arr, seed){
  const a = [...arr];
  let s = seed || 1;
  function rnd(){ s = (s*1103515245+12345) & 0x7fffffff; return s/0x7fffffff; }
  for(let i=a.length-1;i>0;i--){ const j = Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

/* ---------------------- Timer (host drives time + hints) ---------------------- */
function runLocalTimerIfHost(){
  if(!isHost) { displayTimerFromState(); startNonHostTimerTicker(); return; }
  if(localTimerInterval) return; // already running for this turn
  localTimerInterval = setInterval(async () => {
    if(!roomState || roomState.status !== 'drawing'){ clearInterval(localTimerInterval); localTimerInterval=null; return; }
    const elapsed = Math.floor((Date.now() - (roomState.turnStartedAt || Date.now())) / 1000);
    const total = roomState.turnDuration || roomState.settings.drawtime;
    const left = Math.max(0, total - elapsed);
    displayTimer(left, total);
    maybeRevealHintAsHost(left, total);
    if(left <= 0){
      clearInterval(localTimerInterval); localTimerInterval = null;
      await endTurnAsHost(roomState.status);
    }
  }, 1000);
}

let nonHostTickerStarted = false;
function startNonHostTimerTicker(){
  if(nonHostTickerStarted) return;
  nonHostTickerStarted = true;
  setInterval(() => { if(roomState && roomState.status === 'drawing') displayTimerFromState(); }, 1000);
}
function displayTimerFromState(){
  if(!roomState || !roomState.turnStartedAt) return;
  const total = roomState.turnDuration || roomState.settings.drawtime;
  const elapsed = Math.floor((Date.now() - roomState.turnStartedAt) / 1000);
  displayTimer(Math.max(0, total-elapsed), total);
}
function displayTimer(left, total){
  const el = document.getElementById('timer-circle');
  el.textContent = left;
  el.style.borderColor = left <= 10 ? 'var(--red)' : (left <= 25 ? 'var(--yellow)' : 'var(--teal)');
}

async function maybeRevealHintAsHost(left, total){
  const hintSlots = roomState.settings.hints;
  if(hintSlots === 0) return;
  const elapsedFrac = 1 - (left/total);
  const target = Math.floor(elapsedFrac * (hintSlots+1));
  if(target > (roomState.revealedHints||0) && (roomState.revealedHints||0) < hintSlots){
    await roomRef.update({ revealedHints: target });
  }
}

/* ---------------------- Chat / Guessing ---------------------- */
document.getElementById('chat-send-btn').addEventListener('click', submitGuess);
document.getElementById('chat-input').addEventListener('keydown', (e) => { if(e.key==='Enter') submitGuess(); });

function renderChatMessage(msg){
  const box = document.getElementById('chat-box');
  const line = document.createElement('div');
  line.className = 'chat-line' + (msg.cls ? ' '+msg.cls : '');
  line.innerHTML = msg.who ? `<span class="who">${msg.who}:</span> ${escapeHtml(msg.text)}` : escapeHtml(msg.text);
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

async function submitGuess(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text || !roomState) return;
  input.value = '';

  const drawerId = currentDrawerId();
  if(myPlayerId === drawerId){ return; } // drawer can't guess

  const alreadyGuessed = roomState.guesses && roomState.guesses[myPlayerId];
  const word = roomState.currentWord || '';
  const isCorrect = !alreadyGuessed && word && text.toLowerCase() === word.toLowerCase();

  if(isCorrect){
    await roomRef.child('guesses/' + myPlayerId).set({ at: Date.now() });
    await roomRef.child('chat').push({ who: null, text: `${roomState.players[myPlayerId].name} guessed the word!`, cls: 'correct' });
    await tryScoreAndMaybeEndTurn();
  } else {
    await roomRef.child('chat').push({ who: roomState.players[myPlayerId].name, text });
  }
}

async function tryScoreAndMaybeEndTurn(){
  // Scoring is host-authoritative: every client writes its own guess timestamp,
  // but only the host reads the full guess list and applies score deltas.
  // This avoids two clients double-awarding points for the same guess.
  if(isHost){
    await scorePendingGuesses();
  }
  // Non-host clients just wait — the host's listener on roomRef (attached via
  // .on('value')) will pick up the score/guess changes the host writes and
  // re-render automatically. We still nudge the host's own scoring pass
  // immediately above for low latency on the host's machine.
}

async function scorePendingGuesses(){
  if(!isHost) return;
  const snap = await roomRef.once('value');
  const room = snap.val();
  if(!room || room.status !== 'drawing') return;
  const drawerId = (room.settings && room.settings.drawMode === 'host_only')
    ? room.hostId
    : room.turnOrder[room.turnIndex % room.turnOrder.length];
  const guesses = room.guesses || {};
  const gains = room.turnScoreGains || {};

  const guesserIdsSorted = Object.keys(guesses).sort((a,b)=> guesses[a].at - guesses[b].at);
  const updates = {};
  let anyNew = false;
  let drawerBonusTotal = 0;

  guesserIdsSorted.forEach((pid, idx) => {
    if(gains[pid] !== undefined) return; // already scored
    if(pid === drawerId) return;         // drawer can't be a guesser
    anyNew = true;
    const total = room.turnDuration || room.settings.drawtime;
    const elapsed = Math.floor((Date.now() - room.turnStartedAt)/1000);
    const timeLeft = Math.max(0, total - elapsed);
    const points = Math.max(100 - idx*20, 30) + timeLeft;
    updates['players/'+pid+'/score'] = (room.players[pid].score||0) + points;
    updates['turnScoreGains/'+pid] = points;
    drawerBonusTotal += 25;
  });

  if(anyNew && drawerBonusTotal > 0){
    updates['players/'+drawerId+'/score'] = (room.players[drawerId].score||0) + drawerBonusTotal + (gains[drawerId]||0);
    updates['turnScoreGains/'+drawerId] = (gains[drawerId]||0) + drawerBonusTotal;
  }

  if(Object.keys(updates).length){
    await roomRef.update(updates);
  }

  // Use the nonDrawer count from this fresh snap (not the stale roomState),
  // and exclude any drawer-id that accidentally ended up in guesses.
  const nonDrawerCount = room.turnOrder.length - 1;
  const validGuessCount = Object.keys(guesses).filter(pid => pid !== drawerId).length;
  if(validGuessCount >= nonDrawerCount){
    // Pass the fresh status so endTurnAsHost doesn't race against a stale
    // roomState.status check — previously roomState could have already been
    // updated by the .on('value') listener BEFORE endTurnAsHost ran,
    // causing it to silently bail even though the turn genuinely needed to end.
    await endTurnAsHost(room.status);
  }
}

/* ---------------------- Scoreboard ---------------------- */
function renderScoreboard(){
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  const players = roomState.players || {};
  const drawerId = currentDrawerId();
  const guesses = roomState.guesses || {};
  const sorted = Object.keys(players).sort((a,b) => (players[b].score||0) - (players[a].score||0));
  sorted.forEach((pid,i) => {
    const p = players[pid];
    const li = document.createElement('li');
    if(pid === drawerId) li.classList.add('drawing-now');
    if(guesses[pid]) li.classList.add('guessed-it');
    const color = PLAYER_COLORS[p.colorIdx ?? (i % PLAYER_COLORS.length)];
    li.innerHTML = `
      <span class="pname"><span class="avatar" style="background:${color}">${(p.name||'?')[0].toUpperCase()}</span>${p.name}${guesses[pid] ? ' ✅':''}</span>
      <span class="score">${p.score||0}</span>
    `;
    list.appendChild(li);
  });
}

/* ---------------------- End turn / round ---------------------- */
async function endTurnAsHost(freshStatus){
  if(!isHost || !roomState) return;
  // Use freshStatus (from the live Firebase snapshot read in scorePendingGuesses)
  // when available. Fall back to roomState.status for callers like the timer
  // that don't have a pre-fetched snapshot. This prevents a race where the
  // .on('value') listener updates roomState AFTER scorePendingGuesses reads
  // its fresh snap but BEFORE endTurnAsHost checks status — which caused it
  // to silently bail with "status !== drawing" even though the turn genuinely
  // needed to end, deadlocking the game for the 3rd (and any subsequent) player.
  const statusToCheck = freshStatus || roomState.status;
  if(statusToCheck !== 'drawing') return;
  await roomRef.update({ status: 'reveal' });
}

function showRevealOverlay(){
  if(!roomState.currentWord) return;
  document.getElementById('reveal-word').textContent = roomState.currentWord;
  const list = document.getElementById('reveal-list');
  list.innerHTML = '';
  const players = roomState.players || {};
  const gains = roomState.turnScoreGains || {};
  const drawerId = currentDrawerId();
  const sorted = Object.keys(players).sort((a,b)=> (gains[b]||0)-(gains[a]||0));
  sorted.forEach(pid => {
    const g = gains[pid]||0;
    const li = document.createElement('li');
    li.innerHTML = `<span>${players[pid].name}${pid===drawerId?' ✏️':''}</span><span class="gain">${g>0?'+'+g:'—'}</span>`;
    list.appendChild(li);
  });
  document.getElementById('reveal-overlay').classList.add('active');

  const btn = document.getElementById('next-turn-btn');
  btn.style.display = isHost ? 'block' : 'none';
}

document.getElementById('next-turn-btn').addEventListener('click', async () => {
  if(!isHost) return;
  document.getElementById('reveal-overlay').classList.remove('active');
  let nextIndex = roomState.turnIndex + 1;
  let nextRound = roomState.round;
  if(nextIndex % roomState.turnOrder.length === 0){ nextRound++; }

  if(nextRound > roomState.settings.rounds){
    await roomRef.update({ status: 'final' });
  } else {
    await beginTurnAsHost({ turnIndex: nextIndex, round: nextRound });
  }
});

function showFinalResults(){
  goScreen('game-screen'); // keep game screen behind overlay
  const players = roomState.players || {};
  const sorted = Object.keys(players).sort((a,b)=> (players[b].score||0)-(players[a].score||0));

  const podium = document.getElementById('podium');
  podium.innerHTML = '';
  const medals = ['🥇','🥈','🥉'];
  const placeClasses = ['first','second','third'];
  sorted.slice(0,3).forEach((pid,i) => {
    const div = document.createElement('div');
    div.className = 'place ' + placeClasses[i];
    div.innerHTML = `<div class="medal">${medals[i]}</div><div>${players[pid].name}</div><div style="font-family:'Kalam',cursive;font-size:18px;">${players[pid].score||0}</div>`;
    podium.appendChild(div);
  });

  const list = document.getElementById('final-list');
  list.innerHTML = '';
  sorted.forEach((pid,i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${i+1}. ${players[pid].name}</span><span class="gain">${players[pid].score||0} pts</span>`;
    list.appendChild(li);
  });

  document.getElementById('play-again-btn').style.display = isHost ? 'block' : 'none';
  document.getElementById('final-overlay').classList.add('active');
}

document.getElementById('play-again-btn').addEventListener('click', async () => {
  if(!isHost) return;
  document.getElementById('final-overlay').classList.remove('active');
  const players = roomState.players;
  Object.keys(players).forEach(pid => players[pid].score = 0);
  await roomRef.update({ status: 'lobby', players, turnIndex: 0, round: 1, currentWord: null, chat: null, strokes: null, guesses: null, turnScoreGains: null });
});
