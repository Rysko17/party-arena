const express=require('express'),http=require('http'),{Server}=require('socket.io'),fs=require('fs'),path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server),DB=JSON.parse(fs.readFileSync(path.join(__dirname,'questions.json'),'utf8')),rooms={};
app.use(express.static(path.join(__dirname,'public')));
const G=['Quiz Battle','Tu me connais ?','Majorité','La Bombe',"L’Imposteur",'Duel','Mot interdit','Défi surprise'];
function code(){let s='',a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function view(r){return{code:r.code,host:r.host,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,score:p.score})),settings:r.settings,round:r.round,total:r.total,state:r.state}}
function emit(r){io.to(r.code).emit('room',view(r))}
function q(r){let p=[];for(const t of r.settings.themes)(DB[t]||[]).forEach(x=>p.push({...x,theme:t}));if(!p.length)Object.entries(DB).forEach(([t,a])=>a.forEach(x=>p.push({...x,theme:t})));return p[Math.floor(Math.random()*p.length)]}
function next(r){
  const games=(r.settings.games&&r.settings.games.length?r.settings.games:['Quiz Battle']);
  const perGame=+[r.settings.rounds||10];
  r.gameIndex=r.gameIndex??0;
  r.gameRound=r.gameRound??0;
  if(r.gameRound>=perGame){
    r.gameIndex++;
    r.gameRound=0;
  }
  if(r.gameIndex>=games.length){
    io.to(r.code).emit('finished',view(r));
    return;
  }
  r.gameRound++;
  r.round=(r.gameIndex*perGame)+r.gameRound;
  r.total=games.length*perGame;
  r.answers={}; r.guesses={}; r.secretChoice=null;
  const forcedGame=games[r.gameIndex];
  r.current=makeRound(r,forcedGame);
  if(r.current) { r.current.game=forcedGame; r.current.gameRound=r.gameRound; r.current.gameTotal=perGame; }
  emit(r);
}

io.on('connection',s=>{s.on('create',({name},cb)=>{let c;do c=code();while(rooms[c]);let r=rooms[c]={code:c,host:s.id,players:{},settings:{games:['Quiz Battle'],themes:['Culture générale'],rounds:14},round:0,total:14,state:'lobby'};r.players[s.id]={id:s.id,name:name||'Hôte',score:0};s.join(c);cb({ok:true,code:c});emit(r)});
s.on('join',({code:c,name},cb)=>{c=(c||'').toUpperCase();let r=rooms[c];if(!r)return cb({ok:false});r.players[s.id]={id:s.id,name:name||'Joueur',score:0};s.join(c);cb({ok:true});emit(r)});
s.on('settings',x=>{let r=rooms[x.code];if(r&&r.host===s.id){r.settings=x.settings;emit(r)}});s.on('start',c=>{let r=rooms[c];if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;r.total=(r.settings.games?.length||1)*(+r.settings.rounds||10);next(r)}});
s.on('answer',x=>{let r=rooms[x.code];if(!r||r.answers?.[s.id]!=null)return;r.answers=r.answers||{};r.answers[s.id]=x.value;if(r.current.game==='Quiz Battle'&&+x.value===r.current.c)r.players[s.id].score+=500;emit(r);scheduleNextIfAll(r)});
s.on('secretChoice',x=>{let r=rooms[x.code];if(!r||r.current.game!=='Tu me connais ?'||r.current.target!==s.id||r.current.phase!=='choose')return;r.secretChoice=+x.value;r.current.phase='guess';io.to(r.code).emit('tmcGuess',{q:r.current.q,a:r.current.a,target:r.current.target,targetName:r.current.targetName});});
s.on('tmcGuess',x=>{let r=rooms[x.code];if(!r||r.current.game!=='Tu me connais ?'||r.current.phase!=='guess'||s.id===r.current.target||r.guesses[s.id]!=null)return;r.guesses[s.id]=+x.value;if(+x.value===r.secretChoice)r.players[s.id].score+=500;emit(r);io.to(s.id).emit('guessResult',{correct:+x.value===r.secretChoice});scheduleNextIfAll(r)});
s.on('award',x=>{let r=rooms[x.code];if(r&&r.host===s.id&&r.players[x.id]){r.players[x.id].score+=+x.points||0;emit(r)}});s.on('next',c=>{let r=rooms[c];if(r&&r.host===s.id){if(r.round>=r.total)io.to(c).emit('finished',view(r));else next(r)}});

  s.on('restartSame',c=>{
    const r=rooms[c];
    if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;r.players&&Object.values(r.players).forEach(p=>p.score=0);next(r)}
  });
  s.on('backToSetup',c=>{
    const r=rooms[c];
    if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;io.to(c).emit('backToSetup');emit(r)}
  });

  s.on('disconnect',()=>{for(const c in rooms){let r=rooms[c];if(r.players[s.id]){delete r.players[s.id];if(!Object.keys(r.players).length)delete rooms[c];else{if(r.host===s.id)r.host=Object.keys(r.players)[0];emit(r)}}}})});
server.listen(process.env.PORT||3000,()=>console.log('Party Arena V5 ONLINE lancé'));