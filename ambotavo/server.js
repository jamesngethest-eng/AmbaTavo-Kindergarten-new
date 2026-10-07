// AmboTavo Kindergarten server. Zero dependencies. Needs Node 18+. Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const env=Object.fromEntries((fs.existsSync('.env')?fs.readFileSync('.env','utf8'):'').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const E=k=>process.env[k]||env[k]||'';
const D=E('DATA_DIR')||'.';fs.mkdirSync(path.join(D,'uploads'),{recursive:true});
const DB=path.join(D,'data.json'),H=p=>{const s=crypto.randomBytes(8).toString('hex');return s+':'+crypto.scryptSync(p,s,32).toString('hex')};
const chk=(p,h)=>{const[s,x]=h.split(':');return crypto.scryptSync(p,s,32).toString('hex')===x};
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
 users:[{id:id(),name:'School Admin',email:'admin@ambotavo.school',phone:'254700000001',role:'admin',pw:H('Admin123!')},
 {id:id(),name:'Teacher Demo',email:'teacher@ambotavo.school',phone:'254700000002',role:'teacher',pw:H('Teacher123!')},
 {id:id(),name:'Parent Demo',email:'parent@ambotavo.school',phone:'254700000003',role:'parent',pw:H('Parent123!')}],
 posts:[{id:id(),title:'Welcome to AmboTavo',body:'Our first updates will appear here. Teachers can share notes, photos and videos with families.',kind:'note',media:'',author:'AmboTavo team',at:Date.now()}],enquiries:[]};
db.content={autoApprove:'no',...db.content};
const save=()=>fs.writeFileSync(DB,JSON.stringify(db,null,1));save();
const EMAIL_RE=/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/,rl=[];
const sh=t=>crypto.createHash('sha256').update(t).digest('hex');
const sess=db.sessions=db.sessions||{},otps={},thr={};
for(const k in sess)if(sess[k].exp<Date.now())delete sess[k];
const mk=(u,via)=>{const t=crypto.randomBytes(32).toString('hex');sess[sh(t)]={uid:u.id,via,exp:Date.now()+30*864e5};save();return t};
const pub=u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,role:u.role,approved:u.approved!==false});
const norm=p=>String(p||'').replace(/\D/g,'');
function mail(to,subject,text){return new Promise((ok,no)=>{
 const u=E('GMAIL_USER'),pw=E('GMAIL_APP_PASSWORD').replace(/\s/g,'');
 if(!u||!pw){console.log(`[DEV MODE] Email to ${to}: ${text}\n  (set GMAIL_USER and GMAIL_APP_PASSWORD to send for real)`);return ok()}
 if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(to))return no(new Error('bad address'));
 const b64=x=>Buffer.from(x).toString('base64');
 const msg=`From: AmboTavo Kindergarten <${u}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n.`;
 const st=[[null,'220'],['EHLO ambotavo','250'],['AUTH LOGIN','334'],[b64(u),'334'],[b64(pw),'235'],[`MAIL FROM:<${u}>`,'250'],[`RCPT TO:<${to}>`,'250'],['DATA','354'],[msg,'250'],['QUIT','221']];
 const sk=require('tls').connect(+E('SMTP_PORT')||465,E('SMTP_HOST')||'smtp.gmail.com');let i=0,buf='';
 sk.setEncoding('utf8');sk.setTimeout(20000,()=>{sk.destroy();no(new Error('SMTP timeout'))});sk.on('error',no);
 sk.on('data',d=>{buf+=d;const L=buf.split('\r\n').filter(Boolean);if(!buf.endsWith('\r\n')||!/^\d{3} /.test(L[L.length-1]||''))return;buf='';
  if(!L[L.length-1].startsWith(st[i][1])){sk.destroy();return no(new Error('SMTP: '+L.join(' | ')))}
  if(++i===st.length){sk.end();return ok()}sk.write(st[i][0]+'\r\n')})});}
const body=(q,max=60e6)=>new Promise((ok,no)=>{const c=[];let n=0;q.on('data',d=>{n+=d.length;if(n>max){no(new Error('too big'));q.destroy()}else c.push(d)});q.on('end',()=>ok(Buffer.concat(c)));q.on('error',no)});
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
http.createServer(async(q,s)=>{
 const u=new URL(q.url,'http://x'),p=u.pathname;
 const J=(c,o)=>{s.writeHead(c,{'Content-Type':'application/json'});s.end(JSON.stringify(o))};
 try{
 if(p.startsWith('/api/')){
  const S=sess[sh((q.headers.authorization||'').slice(7))],me=(S&&S.exp>Date.now()&&(x=>x&&x.approved!==false&&pub(x))(db.users.find(v=>v.id===S.uid)))||null,need=(...r)=>{if(!me||(r.length&&!r.includes(me.role))){J(me?403:401,{error:'Not allowed'});return false}return true};
  const m=q.method,raw=['POST','PUT'].includes(m)&&p!=='/api/upload'?await body(q,1e6):null,b=raw&&raw.length?JSON.parse(raw):{};
  if(p==='/api/content'&&m==='GET')return J(200,db.content);
  if(p==='/api/content'&&m==='PUT'){if(!need('admin'))return;Object.keys(db.content).forEach(k=>{if(k in b)db.content[k]=String(b[k])});save();return J(200,db.content)}
  if(p==='/api/login'){const x=db.users.find(v=>v.email.toLowerCase()===String(b.email||'').trim().toLowerCase());
   if(!x||!chk(String(b.password||''),x.pw))return J(401,{error:'Wrong email or password'});if(x.approved===false)return J(403,{error:'Your account is waiting for the school to approve it'});return J(200,{token:mk(x),user:pub(x)})}
  if(p==='/api/otp/request'){const em=String(b.email||'').trim().toLowerCase(),x=db.users.find(v=>v.email.toLowerCase()===em);
   if(thr[em]>Date.now()-3e4)return J(429,{error:'Please wait 30 seconds before asking for another code'});thr[em]=Date.now();
   while(rl.length&&rl[0]<Date.now()-36e5)rl.shift();if((x||EMAIL_RE.test(em))&&rl.length>=100)return J(429,{error:'Too many codes requested. Try again later.'});
   if(x||EMAIL_RE.test(em)){rl.push(Date.now());const code=String(crypto.randomInt(100000,1e6));otps[em]={code,exp:Date.now()+6e5,tries:0,name:String(b.name||'').trim().slice(0,80),phone:norm(b.phone)};
    try{await mail(em,'Your AmboTavo sign-in code','Your AmboTavo Kindergarten sign-in code is '+code+'.\r\nIt works for 10 minutes. If you did not ask for it, please ignore this email.')}catch(e){console.error('Email error',e.message);return J(502,{error:'The email could not be sent. Check GMAIL_USER and GMAIL_APP_PASSWORD.'})}}
   return J(200,{ok:true,message:'If that email belongs to an account, a 6-digit code is on its way. Check your inbox and spam folder.'})}
  if(p==='/api/otp/verify'){const em=String(b.email||'').trim().toLowerCase(),o=otps[em];
   if(!o||o.exp<Date.now()||++o.tries>5||o.code!==String(b.code).trim())return J(401,{error:'That code is wrong or has expired'});
   delete otps[em];let x=db.users.find(v=>v.email.toLowerCase()===em),isNew=false;
   if(!x){isNew=true;x={id:id(),name:o.name||em.split('@')[0],email:em,phone:o.phone||'',role:'parent',pw:H(crypto.randomBytes(16).toString('hex')),approved:db.content.autoApprove==='yes'};db.users.push(x);save()}
   if(x.approved===false)return J(200,{pending:true,message:isNew?'Thank you! Your account is created. The school will approve it shortly, then you can sign in.':'Your account is still waiting for school approval.'});
   return J(200,{token:mk(x,'code'),user:pub(x),isNew})}
  if(p==='/api/password'&&m==='POST'){if(!need())return;const t=b.userId&&me.role==='admin'?db.users.find(v=>v.id===b.userId):db.users.find(v=>v.id===me.id);
   if(!t)return J(404,{error:'No such user'});
   if(t.id===me.id&&S.via!=='code'&&!chk(String(b.current||''),t.pw))return J(401,{error:'Your current password is wrong'});
   if(String(b.password||'').length<8)return J(400,{error:'Use 8 or more characters'});
   t.pw=H(String(b.password));save();return J(200,{ok:true})}
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
  if(p==='/api/users'&&m==='POST'){if(!need('admin'))return;b.email=String(b.email||'').trim().toLowerCase();if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(b.email)||String(b.password||'').length<8)return J(400,{error:'Email and a password of 8+ characters are required'});
   if(db.users.some(v=>v.email.toLowerCase()===b.email))return J(400,{error:'That email already exists'});db.users.push({id:id(),name:b.name||b.email,email:b.email,phone:norm(b.phone),role:['parent','teacher','admin'].includes(b.role)?b.role:'parent',pw:H(b.password)});save();return J(200,{ok:true})}
  if(p.startsWith('/api/users/')&&p.endsWith('/approve')&&m==='POST'){if(!need('admin'))return;const x=db.users.find(v=>v.id===p.slice(11,-8));if(!x)return J(404,{error:'No such user'});x.approved=true;save();return J(200,{ok:true})}
  if(p.startsWith('/api/users/')&&m==='DELETE'){if(!need('admin'))return;if(p.slice(11)===me.id)return J(400,{error:'You cannot delete yourself'});db.users=db.users.filter(v=>v.id!==p.slice(11));save();return J(200,{ok:true})}
  if(p==='/api/upload'&&m==='POST'){if(!need('teacher','admin'))return;const ext=path.extname(String(q.headers['x-filename']||'')).toLowerCase();
   if(!['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mov'].includes(ext))return J(400,{error:'Use a JPG, PNG, WEBP, GIF, MP4 or WEBM file'});
   const f=id()+ext;fs.writeFileSync(path.join(D,'uploads',f),await body(q));return J(200,{url:'/uploads/'+f})}
  return J(404,{error:'Not found'});
 }
 const isUp=p.startsWith('/uploads/'),dir=isUp?path.join(D,'uploads'):'public',f=isUp?path.join(D,decodeURIComponent(p)):path.join(dir,p==='/'?'index.html':decodeURIComponent(p));
 if(!path.resolve(f).startsWith(path.resolve(dir))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end('Not found')}
 s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);
 }catch(e){console.error(e);J(500,{error:'Server error'})}
}).listen(E('PORT')||3000,()=>console.log('AmboTavo running on http://localhost:'+(E('PORT')||3000)));
