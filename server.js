// AmboTavo Kindergarten server. Zero dependencies. Needs Node 18+. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const env=Object.fromEntries((fs.existsSync('.env')?fs.readFileSync('.env','utf8'):'').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const E=k=>process.env[k]||env[k]||'';
const PORT=Number(E('PORT')||3000);
const D=path.resolve(E('DATA_DIR')||path.join(__dirname,'data'));
fs.mkdirSync(path.join(D,'uploads'),{recursive:true});
const DB=path.join(D,'data.json'),H=p=>{const s=crypto.randomBytes(8).toString('hex');return s+':'+crypto.scryptSync(p,s,32).toString('hex')};
const chk=(p,h)=>{try{const[s,x]=h.split(':');const a=crypto.scryptSync(p,s,32).toString('hex');return typeof x==='string'&&a.length===x.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(x))}catch{return false}};
const id=()=>crypto.randomUUID();
let db=fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB)):{
 content:{name:'AmboTavo Kindergarten',tagline:'A Montessori school on Montessori Way Road',
 heroTitle:'Children learn best when they are free to explore.',
 heroText:'AmboTavo Kindergarten follows the Montessori way: calm classrooms, real materials, and teachers who guide instead of hurry. Children choose their work, concentrate deeply and grow in independence.',
 aboutTitle:'Our Montessori classroom',
 aboutText:'Mixed-age rooms, child-sized furniture and hands-on materials let each child learn at their own pace. Practical life, sensorial, language, maths and cultural work all sit within reach on open shelves.',
 prog1t:'Practical life',prog1x:'Pouring, buttoning, sweeping and caring for plants build focus, coordination and confidence.',
 prog2t:'Sensorial & maths',prog2x:'The pink tower, number rods and golden beads make abstract ideas something a child can hold.',
 prog3t:'Language & culture',prog3x:'Sandpaper letters, stories, songs, nature walks and maps open the wider world.',
 address:'Montessori Way Road',hours:'Mon to Fri, 7:30 am to 5:00 pm',phone:'+254 700 000 000',whatsapp:'254700000000',email:'hello@ambotavo.school',
 waGreeting:'Hello AmboTavo Kindergarten, I would like to book a school visit.',
 img_hero:'',img_about:'',img_g1:'',img_g2:'',img_g3:''},
 users:[{id:id(),name:'School Admin',email:'admin@ambotavo.school',phone:'254700000001',role:'admin',pw:H(E('ADMIN_PASSWORD')||'ChangeMe123!')},
 {id:id(),name:'Teacher Demo',email:'teacher@ambotavo.school',phone:'254700000002',role:'teacher',pw:H('Teacher123!')},
 {id:id(),name:'Parent Demo',email:'parent@ambotavo.school',phone:'254700000003',role:'parent',pw:H('Parent123!')}],
 posts:[{id:id(),title:'Welcome to AmboTavo',body:'Our first updates will appear here. Teachers can share notes, photos and videos with families.',kind:'note',media:'',author:'AmboTavo team',at:Date.now()}],enquiries:[]};
const save=()=>{const tmp=DB+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,1));fs.renameSync(tmp,DB)};
if(!fs.existsSync(DB))save();
const sess=new Map(),otps=new Map();
const SESSION_MS=1000*60*60*12;
const cleanSession=()=>{const now=Date.now();for(const [k,v] of sess)if(v.exp<now)sess.delete(k)};
setInterval(cleanSession,15*60*1000).unref();
const pub=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,role:u.role});
const norm=p=>String(p||'').replace(/\D/g,'');
async function sendWA(to,code){
 const t=E('WA_TOKEN'),pid=E('WA_PHONE_ID');
 if(!t||!pid){console.log(`[DEV MODE] WhatsApp code for ${to}: ${code}  (set WA_TOKEN and WA_PHONE_ID in .env to send for real)`);return{dev:true}}
 const r=await fetch(`https://graph.facebook.com/v20.0/${pid}/messages`,{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},
 body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:E('WA_TEMPLATE')||'login_code',language:{code:E('WA_LANG')||'en_US'},
 components:[{type:'body',parameters:[{type:'text',text:code}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:code}]}]}})});
 if(!r.ok)throw new Error(await r.text());return{dev:false};
}
const body=(q,max=60e6)=>new Promise((ok,no)=>{const c=[];let n=0;q.on('data',d=>{n+=d.length;if(n>max){no(new Error('too big'));q.destroy()}else c.push(d)});q.on('end',()=>ok(Buffer.concat(c)));q.on('error',no)});
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
const authAttempts=new Map();
const rateLimit=(ip,windowMs=15*60*1000,max=12)=>{const now=Date.now(),a=authAttempts.get(ip)||[];const fresh=a.filter(t=>t>now-windowMs);fresh.push(now);authAttempts.set(ip,fresh);return fresh.length<=max};
http.createServer(async(q,s)=>{
 s.setHeader('X-Content-Type-Options','nosniff');s.setHeader('Referrer-Policy','strict-origin-when-cross-origin');s.setHeader('X-Frame-Options','SAMEORIGIN');
 const u=new URL(q.url,'http://x'),p=u.pathname;
 const J=(c,o)=>{s.writeHead(c,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});s.end(JSON.stringify(o))};
 try{
 if(p==='/health'&&q.method==='GET')return J(200,{ok:true,status:'healthy'});
 if(p.startsWith('/api/')){
  const token=(q.headers.authorization||'').slice(7),entry=sess.get(token);
  const me=entry&&entry.exp>Date.now()?entry.user:null;
  if(entry&&entry.exp<=Date.now())sess.delete(token);
  const need=(...r)=>{if(!me||(r.length&&!r.includes(me.role))){J(me?403:401,{error:'Not allowed'});return false}return true};
  const m=q.method,raw=['POST','PUT'].includes(m)&&p!=='/api/upload'?await body(q,1e6):null,b=raw&&raw.length?JSON.parse(raw):{};
  if(p==='/api/content'&&m==='GET')return J(200,db.content);
  if(p==='/api/content'&&m==='PUT'){if(!need('admin'))return;Object.keys(db.content).forEach(k=>{if(k in b)db.content[k]=String(b[k])});save();return J(200,db.content)}
  if(p==='/api/login'){if(!rateLimit(q.socket.remoteAddress||'unknown'))return J(429,{error:'Too many login attempts. Please wait and try again.'});const x=db.users.find(v=>v.email.toLowerCase()===String(b.email||'').toLowerCase());
   if(!x||!chk(String(b.password||''),x.pw))return J(401,{error:'Wrong email or password'});const t=id();sess.set(t,{user:pub(x),exp:Date.now()+SESSION_MS});return J(200,{token:t,user:pub(x)})}
  if(p==='/api/otp/request'){if(!rateLimit(q.socket.remoteAddress||'unknown',15*60*1000,8))return J(429,{error:'Too many code requests. Please wait and try again.'});const ph=norm(b.phone),x=db.users.find(v=>norm(v.phone)===ph);
   if(x){const code=String(crypto.randomInt(100000,1e6));otps.set(ph,{code,exp:Date.now()+6e5,tries:0});try{await sendWA(ph,code)}catch(e){console.error('WhatsApp error',e.message);return J(502,{error:'WhatsApp could not send the code. Check WA_TOKEN, WA_PHONE_ID and template name.'})}}
   return J(200,{ok:true,message:'If that number belongs to an account, a code is on its way on WhatsApp.'})}
  if(p==='/api/otp/verify'){const ph=norm(b.phone),o=otps.get(ph);
   if(!o||o.exp<Date.now()||++o.tries>5||o.code!==String(b.code).trim())return J(401,{error:'That code is wrong or has expired'});
   otps.delete(ph);const x=db.users.find(v=>norm(v.phone)===ph),t=id();sess.set(t,{user:pub(x),exp:Date.now()+SESSION_MS});return J(200,{token:t,user:pub(x)})}
  if(p==='/api/me')return need()&&J(200,me);
  if(p==='/api/posts'&&m==='GET')return need()&&J(200,db.posts.sort((a,c)=>c.at-a.at));
  if(p==='/api/posts'&&m==='POST'){if(!need('teacher','admin'))return;const k=['note','image','video'].includes(b.kind)?b.kind:'note';
   const x={id:id(),title:String(b.title||'').slice(0,120),body:String(b.body||'').slice(0,2000),kind:k,media:b.media||'',author:me.name,at:Date.now()};db.posts.push(x);save();return J(200,x)}
  if(p.startsWith('/api/posts/')&&m==='DELETE'){if(!need('teacher','admin'))return;const x=db.posts.find(v=>v.id===p.slice(11));
   if(x&&(me.role==='admin'||x.author===me.name)){db.posts=db.posts.filter(v=>v!==x);save();return J(200,{ok:true})}return J(403,{error:'Not allowed'})}
  if(p==='/api/enquiry'&&m==='POST'){if(!b.name||!b.contact)return J(400,{error:'Name and contact are required'});db.enquiries.push({id:id(),name:String(b.name).slice(0,100),contact:String(b.contact).slice(0,100),message:String(b.message||'').slice(0,1000),at:Date.now()});save();return J(200,{ok:true})}
  if(p==='/api/enquiries'&&m==='GET')return need('admin')&&J(200,db.enquiries.sort((a,c)=>c.at-a.at));
  if(p.startsWith('/api/enquiries/')&&m==='DELETE'){if(!need('admin'))return;db.enquiries=db.enquiries.filter(v=>v.id!==p.slice(15));save();return J(200,{ok:true})}
  if(p==='/api/users'&&m==='GET')return need('admin')&&J(200,db.users.map(pub));
  if(p==='/api/users'&&m==='POST'){if(!need('admin'))return;if(!b.email||!b.password||b.password.length<8)return J(400,{error:'Email and a password of 8+ characters are required'});
   if(db.users.some(v=>v.email===b.email))return J(400,{error:'That email already exists'});db.users.push({id:id(),name:b.name||b.email,email:b.email,phone:norm(b.phone),role:['parent','teacher','admin'].includes(b.role)?b.role:'parent',pw:H(b.password)});save();return J(200,{ok:true})}
  if(p.startsWith('/api/users/')&&m==='DELETE'){if(!need('admin'))return;if(p.slice(11)===me.id)return J(400,{error:'You cannot delete yourself'});db.users=db.users.filter(v=>v.id!==p.slice(11));save();return J(200,{ok:true})}
  if(p==='/api/upload'&&m==='POST'){if(!need('teacher','admin'))return;const ext=path.extname(String(q.headers['x-filename']||'')).toLowerCase();
   if(!['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mov'].includes(ext))return J(400,{error:'Use a JPG, PNG, WEBP, GIF, MP4 or WEBM file'});
   const upload=await body(q,25e6);
   const f=id()+ext;fs.writeFileSync(path.join(D,'uploads',f),upload);return J(200,{url:'/uploads/'+f})}
  return J(404,{error:'Not found'});
 }
 const isUp=p.startsWith('/uploads/'),dir=isUp?path.join(D,'uploads'):path.join(__dirname,'public'),rel=isUp?p.slice('/uploads/'.length):decodeURIComponent(p==='/'?'/index.html':p).replace(/^\/+/,''),f=path.join(dir,rel);
 if(!path.resolve(f).startsWith(path.resolve(dir))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end('Not found')}
 s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);
 }catch(e){console.error(e);J(500,{error:'Server error'})}
}).listen(PORT,()=>console.log('AmboTavo running on http://localhost:'+PORT));
