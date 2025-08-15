import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-' + Math.random().toString(36).slice(2);
const ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({ origin: ORIGIN, credentials:true }));
app.use(express.json({ limit:'2mb' }));

// In-memory demo DB
const db = {
  users: [],
  follows: [], // { followerId, followedId }
  posts: [],   // { id, userId, text, createdAt }
  stories: [], // { id, userId, text, createdAt, expiresAt }
  lives: {},   // liveId -> { liveId, hostId, title, startedAt, viewers }
  battles: {}, // battleId -> { battleId, hostId, liveId, title, startedAt }
  wallets: {}, // userId -> { coins, eur }
  donations: [],
  notifications: {} // userId -> [ { id, text, createdAt } ]
};

function addNotif(uid,text){
  if(!db.notifications[uid]) db.notifications[uid]=[];
  db.notifications[uid].unshift({ id:uuidv4(), text, createdAt:new Date().toISOString() });
}
function publicUser(u){ if(!u) return null; return { id:u.id, name:u.name||u.email?.split('@')[0], avatar:u.avatar||'' }; }

// seed demo
(function seed(){
  const id = uuidv4();
  const passHash = bcrypt.hashSync('secret123', 8);
  const user = { id, email:'demo@youvibe.app', passHash, name:'Demo User', createdAt:new Date().toISOString() };
  db.users.push(user);
  db.wallets[id] = { coins: 5000, eur: 0 };
  const liveId = uuidv4();
  db.lives[liveId] = { liveId, hostId:id, title:'Demo LIVE', startedAt:new Date().toISOString(), viewers:42 };
  db.posts.push({ id:uuidv4(), userId:id, text:'Добре дошли в YouVibe!', createdAt:new Date().toISOString() });
})();

// Auth
function auth(req,res,next){
  const h=req.headers.authorization||''; const t=h.startsWith('Bearer ')?h.slice(7):null;
  if(!t) return res.status(401).json({message:'Unauthorized'});
  try{ req.user = jwt.verify(t, JWT_SECRET); next(); }catch{ return res.status(401).json({message:'Invalid token'}); }
}
function authOptional(req,res,next){
  const h=req.headers.authorization||''; const t=h.startsWith('Bearer ')?h.slice(7):null;
  if(t){ try{ req.user=jwt.verify(t, JWT_SECRET);}catch{} } next();
}

app.get('/health',(req,res)=> res.json({ ok:true, time:new Date().toISOString() }));

app.post('/auth/register',(req,res)=>{
  const { email, password, name, phone, dob } = req.body||{};
  if(!email || !password) return res.status(400).json({message:'Email и парола са задължителни'});
  if(db.users.find(u=>u.email===email)) return res.status(400).json({message:'Имейлът е зает'});
  const passHash = bcrypt.hashSync(password, 8);
  const id = uuidv4();
  db.users.push({ id, email, passHash, name:name||'', phone:phone||'', dob:dob||'', createdAt:new Date().toISOString() });
  db.wallets[id] = { coins: 0, eur: 0 };
  res.json({ ok:true });
});
app.post('/auth/login',(req,res)=>{
  const { email, password } = req.body||{};
  const u = db.users.find(x=>x.email===email);
  if(!u) return res.status(401).json({message:'Грешен имейл или парола'});
  if(!bcrypt.compareSync(password,u.passHash)) return res.status(401).json({message:'Грешен имейл или парола'});
  const token = jwt.sign({ id:u.id, email:u.email }, JWT_SECRET, { expiresIn:'7d' });
  res.json({ ok:true, token });
});
app.get('/me', auth, (req,res)=>{
  const u = db.users.find(x=>x.id===req.user.id);
  if(!u) return res.status(404).json({message:'Няма такъв'});
  res.json({ id:u.id, email:u.email, name:u.name, phone:u.phone, dob:u.dob, createdAt:u.createdAt });
});

// Feed
app.get('/feed',(req,res)=>{
  const out = db.posts.slice(0,50).map(p=>({ id:p.id, text:p.text, createdAt:p.createdAt, user: publicUser(db.users.find(u=>u.id===p.userId)) }));
  res.json(out);
});

// Stories
app.get('/stories/feed',(req,res)=>{
  const now = Date.now();
  const usersWith = [...new Set(db.stories.filter(s=>new Date(s.expiresAt).getTime()>now).map(s=>s.userId))];
  res.json(usersWith.map(uid=>({ user: publicUser(db.users.find(u=>u.id===uid)) })));
});
app.get('/stories/me', auth, (req,res)=>{
  const now = Date.now();
  const list = db.stories.filter(s=>s.userId===req.user.id && new Date(s.expiresAt).getTime()>now)
    .map(s=>({ id:s.id, text:s.text, createdAt:s.createdAt, expiresAt:s.expiresAt, user: publicUser(db.users.find(u=>u.id===s.userId)) }));
  res.json(list);
});
app.post('/stories', auth, (req,res)=>{
  const { text } = req.body||{};
  if(!text) return res.status(400).json({message:'Текстът е задължителен'});
  const id = uuidv4();
  const expiresAt = new Date(Date.now()+24*60*60*1000).toISOString();
  db.stories.push({ id, userId:req.user.id, text, createdAt:new Date().toISOString(), expiresAt });
  res.json({ ok:true, id, expiresAt });
});

// Live
app.get('/feed/live',(req,res)=>{
  const list = Object.values(db.lives).map(l=>({ liveId:l.liveId, host: publicUser(db.users.find(u=>u.id===l.hostId)), title:l.title, viewers:l.viewers, startedAt:l.startedAt }));
  res.json(list.sort((a,b)=> new Date(b.startedAt)-new Date(a.startedAt)));
});
app.get('/live/:id',(req,res)=>{
  const l = db.lives[req.params.id];
  if(!l) return res.status(404).json({message:'Live not found'});
  res.json({ liveId:l.liveId, title:l.title, host: publicUser(db.users.find(u=>u.id===l.hostId)) });
});
app.post('/live/start', auth, (req,res)=>{
  const { title='Live' } = req.body||{};
  const liveId = uuidv4();
  db.lives[liveId] = { liveId, hostId:req.user.id, title, startedAt:new Date().toISOString(), viewers:0 };
  broadcast({ type:'LIVE_START', payload:{ liveId, host: publicUser(db.users.find(u=>u.id===req.user.id)), title, startedAt: db.lives[liveId].startedAt, viewers:0 } });
  res.json({ ok:true, liveId });
});
app.post('/live/end', auth, (req,res)=>{
  const { liveId }= req.body||{};
  if(!db.lives[liveId]) return res.status(404).json({message:'Няма такъв лайв'});
  delete db.lives[liveId]; broadcast({ type:'LIVE_END', payload:{ liveId } });
  res.json({ ok:true });
});

// Donations / Wallet
const PLATFORM_CUT = 0.25; // 25% платформа / 75% създател
app.post('/live/donate', authOptional, (req,res)=>{
  const { liveId, amountCoins=0, source='live' } = req.body||{};
  const l=db.lives[liveId]; if(!l) return res.status(404).json({message:'Няма такъв лайв'});
  const donorId = req.user?.id || 'anon';
  const coins = Math.max(0, Math.floor(amountCoins));
  if(coins<=0) return res.status(400).json({message:'Невалидна сума'});
  const fee = Math.floor(coins * PLATFORM_CUT);
  const toCreator = coins - fee;
  db.wallets[l.hostId] = db.wallets[l.hostId] || { coins:0, eur:0 };
  db.wallets[l.hostId].coins += toCreator;
  db.donations.push({ id:uuidv4(), liveId, from:donorId, to:l.hostId, coins, fee, source, at:new Date().toISOString() });
  addNotif(l.hostId, `Получихте дарение: ${coins} V-Coins`);
  broadcast({ type:'DONATION', payload:{ liveId, donor:{ id:donorId, name: donorId==='anon'?'Гост':'Потребител'}, amountCoins: coins }});
  res.json({ ok:true, creditedCoins: toCreator, platformFee: fee });
});
app.get('/wallet/balance', auth, (req,res)=>{
  const w=db.wallets[req.user.id]||{ coins:0, eur:0 }; res.json({ coins:w.coins, eur:w.eur });
});
app.post('/wallet/purchase-coins', auth, (req,res)=>{
  const { eur=0 } = req.body||{}; const amount=Math.max(0, Math.floor(eur));
  if(amount<=0) return res.status(400).json({message:'Минимум 1€'});
  const coins = amount * 500 + (amount>=20 ? 1000 : 0);
  db.wallets[req.user.id] = db.wallets[req.user.id] || { coins:0, eur:0 };
  db.wallets[req.user.id].coins += coins;
  res.json({ ok:true, addedCoins: coins });
});
app.post('/wallet/payout', auth, (req,res)=>{
  const { eur=0, method, target } = req.body||{};
  if(eur<10) return res.status(400).json({message:'Минимум 10€'});
  if(!method || !target) return res.status(400).json({message:'Избери метод и въведи адрес'});
  // Acknowledge only in demo
  res.json({ ok:true, message:'Заявката е приета.' });
});

// Battles
app.post('/battles/start', auth, (req,res)=>{
  const { title='Vibe Battle' }=req.body||{};
  const liveId = uuidv4();
  db.lives[liveId] = { liveId, hostId:req.user.id, title:'Battle LIVE: '+title, startedAt:new Date().toISOString(), viewers:0 };
  const battleId = uuidv4();
  db.battles[battleId] = { battleId, hostId:req.user.id, liveId, title, startedAt:new Date().toISOString() };
  broadcast({ type:'LIVE_START', payload: { liveId, host: publicUser(db.users.find(u=>u.id===req.user.id)), title:'Battle LIVE: '+title, startedAt: new Date().toISOString(), viewers:0 } });
  res.json({ ok:true, battleId, liveId });
});
app.get('/battles/active',(req,res)=>{
  const out = Object.values(db.battles).map(b=>({ battleId:b.battleId, liveId:b.liveId, title:b.title, host: publicUser(db.users.find(u=>u.id===b.hostId)), viewers: db.lives[b.liveId]?.viewers||0 }));
  res.json(out);
});

// Notifications
app.get('/notifications', auth, (req,res)=>{
  res.json(db.notifications[req.user.id]||[]);
});

// WS
const server = app.listen(PORT, ()=> console.log('YouVibe API on :' + PORT));
const wss = new WebSocketServer({ server, path:'/ws' });
function broadcast(obj){ const msg=JSON.stringify(obj); wss.clients.forEach(c=>{ try{ c.send(msg); }catch{} }); }

// viewers mock
setInterval(()=>{
  Object.values(db.lives).forEach(l=>{
    l.viewers = Math.max(0, l.viewers + Math.floor(Math.random()*5 - 2));
    broadcast({ type:'VIEWERS_UPDATE', payload:{ liveId:l.liveId, viewers:l.viewers } });
  });
}, 4000);

// purge expired stories
setInterval(()=>{
  const now = Date.now();
  db.stories = db.stories.filter(s=> new Date(s.expiresAt).getTime() > now );
}, 60000);
