const express=require('express'),http=require('http'),{Server}=require('socket.io'),fs=require('fs'),path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server),DB=JSON.parse(fs.readFileSync(path.join(__dirname,'questions.json'),'utf8')),rooms={};
app.use(express.static(path.join(__dirname,'public')));
const G=['Quiz Battle','Tu me connais ?','Majorité','La Bombe',"L’Imposteur",'Duel','Mot interdit','Défi surprise'];
function code(){let s='',a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function view(r){return{code:r.code,host:r.host,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,score:p.score})),settings:r.settings,round:r.round,total:r.total,state:r.state}}
function emit(r){io.to(r.code).emit('room',view(r))}
function q(r){let p=[];for(const t of r.settings.themes)(DB[t]||[]).forEach(x=>p.push({...x,theme:t}));if(!p.length)Object.entries(DB).forEach(([t,a])=>a.forEach(x=>p.push({...x,theme:t})));return p[Math.floor(Math.random()*p.length)]}
function next(r){r.round++;r.answers={};let g=r.settings.games[(r.round-1)%r.settings.games.length],c={game:g};if(g==='Quiz Battle'){let x=q(r);c={game:g,q:x.q,a:x.a,c:x.c,image:x.image||null,theme:x.theme}}
else if(g==='Tu me connais ?'){let ps=Object.values(r.players),target=ps[(r.round-1)%ps.length];r.secretChoice=null;r.guesses={};c={game:g,phase:'choose',target:target.id,targetName:target.name,q:'Quel univers préfères-tu ?',a:['Musique','Films/Séries','Jeux vidéo','Voyage']};}
else if(g==='Majorité')c={game:g,q:['Soirée maison ou sortie ?','Sucré ou salé ?','Film ou série ?'][Math.floor(Math.random()*3)],a:['Choix A','Choix B']};
else if(g==='La Bombe')c={game:g,q:'Donne '+['un rappeur français','un anime','un club de football','un jeu vidéo'][Math.floor(Math.random()*4)]+' avant la fin !'};
else if(g==="L’Imposteur"){let w=[['Pizza','Burger'],['Paris','Londres'],['Naruto','One Piece'],['Football','Basket']][Math.floor(Math.random()*4)],ps=Object.values(r.players),imp=ps[Math.floor(Math.random()*ps.length)];r.secret={imp:imp.id,n:w[0],o:w[1]};c={game:g,q:"Regarde ton mot secret, décris-le sans le dire puis trouvez l’imposteur !"}}
else if(g==='Duel')c={game:g,q:'Duel éclair : le premier à répondre correctement gagne.'};
else if(g==='Mot interdit')c={game:g,q:'Fais deviner « Plage » sans dire « mer ».'};
else c={game:g,q:['Imite une célébrité sans parler.','Fais deviner un film en 3 mots.','Donne 5 animaux en 10 secondes.'][Math.floor(Math.random()*3)]};
r.current=c;io.to(r.code).emit('round',{round:r.round,total:r.total,current:c});if(g==="L’Imposteur")for(const p of Object.values(r.players))io.to(p.id).emit('secret',{word:p.id===r.secret.imp?r.secret.o:r.secret.n});emit(r)}
function scheduleNextIfAll(r){
  if(!r||r._advancing)return;
  let ids=Object.keys(r.players);
  let done=false;
  if(r.current&&r.current.game==='Tu me connais ?'&&r.current.phase==='guess'){
    let eligible=ids.filter(id=>id!==r.current.target);
    done=eligible.length>0&&eligible.every(id=>r.guesses&&r.guesses[id]!=null);
  }else{
    done=ids.length>0&&ids.every(id=>r.answers&&r.answers[id]!=null);
  }
  if(done){
    r._advancing=true;
    io.to(r.code).emit('allAnswered');
    setTimeout(()=>{r._advancing=false;if(r.round>=r.total)io.to(r.code).emit('finished',view(r));else next(r)},1200);
  }
}

io.on('connection',s=>{s.on('create',({name},cb)=>{let c;do c=code();while(rooms[c]);let r=rooms[c]={code:c,host:s.id,players:{},settings:{games:['Quiz Battle'],themes:['Culture générale'],rounds:14},round:0,total:14,state:'lobby'};r.players[s.id]={id:s.id,name:name||'Hôte',score:0};s.join(c);cb({ok:true,code:c});emit(r)});
s.on('join',({code:c,name},cb)=>{c=(c||'').toUpperCase();let r=rooms[c];if(!r)return cb({ok:false});r.players[s.id]={id:s.id,name:name||'Joueur',score:0};s.join(c);cb({ok:true});emit(r)});
s.on('settings',x=>{let r=rooms[x.code];if(r&&r.host===s.id){r.settings=x.settings;emit(r)}});s.on('start',c=>{let r=rooms[c];if(r&&r.host===s.id){r.round=0;r.total=+r.settings.rounds||14;next(r)}});
s.on('answer',x=>{let r=rooms[x.code];if(!r||r.answers?.[s.id]!=null)return;r.answers=r.answers||{};r.answers[s.id]=x.value;if(r.current.game==='Quiz Battle'&&+x.value===r.current.c)r.players[s.id].score+=500;emit(r);scheduleNextIfAll(r)});
s.on('secretChoice',x=>{let r=rooms[x.code];if(!r||r.current.game!=='Tu me connais ?'||r.current.target!==s.id||r.current.phase!=='choose')return;r.secretChoice=+x.value;r.current.phase='guess';io.to(r.code).emit('tmcGuess',{q:r.current.q,a:r.current.a,target:r.current.target,targetName:r.current.targetName});});
s.on('tmcGuess',x=>{let r=rooms[x.code];if(!r||r.current.game!=='Tu me connais ?'||r.current.phase!=='guess'||s.id===r.current.target||r.guesses[s.id]!=null)return;r.guesses[s.id]=+x.value;if(+x.value===r.secretChoice)r.players[s.id].score+=500;emit(r);io.to(s.id).emit('guessResult',{correct:+x.value===r.secretChoice});scheduleNextIfAll(r)});
s.on('award',x=>{let r=rooms[x.code];if(r&&r.host===s.id&&r.players[x.id]){r.players[x.id].score+=+x.points||0;emit(r)}});s.on('next',c=>{let r=rooms[c];if(r&&r.host===s.id){if(r.round>=r.total)io.to(c).emit('finished',view(r));else next(r)}});
s.on('disconnect',()=>{for(const c in rooms){let r=rooms[c];if(r.players[s.id]){delete r.players[s.id];if(!Object.keys(r.players).length)delete rooms[c];else{if(r.host===s.id)r.host=Object.keys(r.players)[0];emit(r)}}}})});
server.listen(process.env.PORT||3000,()=>console.log('Party Arena V5 ONLINE lancé'));