const express=require('express'),http=require('http'),{Server}=require('socket.io'),fs=require('fs'),path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server),DB=JSON.parse(fs.readFileSync(path.join(__dirname,'questions.json'),'utf8')),rooms={};
app.use(express.static(path.join(__dirname,'public')));
function code(){let s='',a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function view(r){return{code:r.code,host:r.host,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,score:p.score})),settings:r.settings,round:r.round,total:r.total,state:r.state,gameIndex:r.gameIndex,gameRound:r.gameRound}}
function emit(r){io.to(r.code).emit('room',view(r))}
function question(r){
 let p=[];for(const t of r.settings.themes)(DB[t]||[]).forEach((x,i)=>p.push({...x,theme:t,_id:t+'::'+i}));
 if(!p.length)Object.entries(DB).forEach(([t,a])=>a.forEach((x,i)=>p.push({...x,theme:t,_id:t+'::'+i})));
 r.used=r.used||{};r.used.quiz=r.used.quiz||[];
 let a=p.filter(x=>!r.used.quiz.includes(x._id));
 if(!a.length){r.used.quiz=[];a=p}
 let x=a[Math.floor(Math.random()*a.length)];r.used.quiz.push(x._id);return x;
}
function gameLimit(r){const g=r.settings.games[r.gameIndex];return +(r.settings.gameRounds?.[g]||5)}
function totalRounds(r){return (r.settings.games||[]).reduce((n,g)=>n+(+(r.settings.gameRounds?.[g]||5)),0)}

const MAJORITY_BANK=(()=>{
 const A=['Ichigo Kurosaki','Naruto Uzumaki','Monkey D. Luffy','Goku','Satoru Gojo','Eren Yeager','Saitama','Tanjiro Kamado',
 'Spider-Man','Batman','Iron Man','Jack Sparrow','Wednesday Addams','Harry Potter','Darth Vader','Rocky Balboa',
 'Mario','Sonic','Kratos','Link','Lara Croft','Jinx','Pikachu','Steve (Minecraft)',
 'Kylian Mbappé','Cristiano Ronaldo','Lionel Messi','Zinédine Zidane','Aya Nakamura','Soprano','The Weeknd','Rihanna'];
 const qs=[];
 for(let i=0;i<A.length;i+=4)qs.push({q:'Lequel de ces personnages/célébrités le groupe préfère ?',a:A.slice(i,i+4)});
 const cats=[
 ['Quel voyage choisissez-vous ?',['Tokyo','New York','Dubaï','Bali']],['Quel repas gagne ?',['Pizza','Burger','Sushi','Tacos']],
 ['Quel pouvoir choisissez-vous ?',['Voler','Téléportation','Invisibilité','Lire les pensées']],['Quel réseau gardez-vous ?',['TikTok','Instagram','YouTube','Snapchat']],
 ['Quel genre de film choisissez-vous ?',['Action','Comédie','Horreur','Science-fiction']],['Quel sport préférez-vous ?',['Football','Basket','Boxe','Tennis']],
 ['Quel anime gagne ?',['One Piece','Naruto','Bleach','Dragon Ball']],['Quel jeu choisissez-vous ?',['GTA','Minecraft','Fortnite','EA Sports FC']],
 ['Quel luxe choisissez-vous ?',['Voiture','Maison','Voyages','Vêtements']],['Quel dessert gagne ?',['Glace','Gâteau','Crêpe','Tiramisu']],
 ['Quel style musical choisissez-vous ?',['Rap','Afro','Pop','R&B']],['Quel climat préférez-vous ?',['Très chaud','Doux','Froid','Neige']],
 ['Quelle plateforme choisissez-vous ?',['Netflix','Disney+','Prime Video','YouTube']],['Quel animal préférez-vous ?',['Chien','Chat','Lion','Dauphin']]
 ]; qs.push(...cats);
 const out=[];for(let n=0;n<10;n++)for(const x of qs)out.push({q:x.q+(n?` — choix ${n+1}`:''),a:[...x.a].sort((a,b)=>(a.charCodeAt(0)+n)%7-(b.charCodeAt(0)+n)%7)});
 return out;
})();
const TMC_BANK=(()=>{
 const sets=[
 ['Quelle célébrité/personnage te ressemble le plus ?',['Ichigo Kurosaki','Spider-Man','Mario','Kylian Mbappé']],
 ['Avec qui partirais-tu en voyage ?',['Luffy','Gojo','Batman','Lara Croft']],
 ['Quel personnage choisirais-tu comme meilleur ami ?',['Naruto','Goku','Sonic','Harry Potter']],
 ['Quel personnage voudrais-tu incarner 24 h ?',['Ichigo','Iron Man','Kratos','Messi']],
 ['Quel voyage tu choisis ?',['Tokyo','New York','Dubaï','Bali']],['Quel repas tu choisis ?',['Pizza','Burger','Sushi','Tacos']],
 ['Quel pouvoir tu voudrais ?',['Voler','Téléportation','Invisibilité','Lire les pensées']],['Quel réseau tu garderais ?',['TikTok','Instagram','YouTube','Snapchat']],
 ['Quel anime tu choisirais ?',['One Piece','Naruto','Bleach','Dragon Ball']],['Quel jeu tu garderais ?',['GTA','Minecraft','Fortnite','EA Sports FC']],
 ['Quel style de film tu préfères ?',['Action','Comédie','Horreur','Science-fiction']],['Quel sport tu préfères ?',['Football','Basket','Boxe','Tennis']],
 ['Quel cadeau tu préfères ?',['Argent','Voyage','Téléphone','Surprise']],['Quel défaut te dérange le plus ?',['Mensonge','Jalousie','Égoïsme','Retard']],
 ['Quel type de musique tu choisis ?',['Rap','Afro','Pop','R&B']],['Quel dessert tu prends ?',['Glace','Gâteau','Crêpe','Tiramisu']],
 ['Où voudrais-tu vivre ?',['Paris','Tokyo','New York','Dubaï']],['Quel véhicule rêves-tu d’avoir ?',['Supercar','Moto','4x4','Voiture électrique']],
 ['Quel animal te représente ?',['Lion','Loup','Aigle','Dauphin']],['Quelle qualité compte le plus ?',['Loyauté','Humour','Ambition','Gentillesse']]
 ]; const out=[];for(let n=0;n<10;n++)for(const x of sets)out.push({q:x[0]+(n?` — situation ${n+1}`:''),a:[...x[1]].sort((a,b)=>(a.length+n)%5-(b.length+n)%5)});return out;
})();
const ORAL_BANK=(()=>{
 const base=['un pays','une capitale','un anime','un personnage d’anime','un film','une série','un acteur','une célébrité','un rappeur','un chanteur',
 'un club de football','un footballeur','un jeu vidéo','un personnage de jeu vidéo','un animal','un fruit','une marque de voiture','une ville','un métier','un sport'];
 const out=[];for(let i=0;i<10;i++)for(const x of base)out.push(`Donne ${x}${i?` correspondant au défi n°${i+1}`:''}`);return out;
})();
function unusedPick(r,key,arr){
 r.used=r.used||{};r.used[key]=r.used[key]||[];
 let available=arr.map((x,i)=>i).filter(i=>!r.used[key].includes(i));
 if(!available.length){r.used[key]=[];available=arr.map((x,i)=>i)}
 const i=available[Math.floor(Math.random()*available.length)];r.used[key].push(i);return arr[i];
}

function makeRound(r,g){
 let c={game:g};
 if(g==='Quiz Battle'){let x=question(r);c={game:g,q:x.q,a:x.a,c:x.c,image:x.image||null,theme:x.theme,difficulty:x.difficulty||'simple',points:({simple:250,moyen:500,dur:1000}[x.difficulty]||250)}}
 else if(g==='Tu me connais ?'){let ps=Object.values(r.players),target=ps[(r.gameRound-1)%ps.length];r.secretChoice=null;r.guesses={};let tq=unusedPick(r,'tmc',TMC_BANK);c={game:g,phase:'choose',target:target.id,targetName:target.name,q:tq.q,a:tq.a}}
 else if(g==='Majorité'){let mq=unusedPick(r,'majority',MAJORITY_BANK);c={game:g,q:mq.q,a:mq.a}}
 else if(g==='La Bombe'){c={game:g,q:unusedPick(r,'bomb',ORAL_BANK)+' avant la fin !',oral:true}}
 else if(g==="L’Imposteur"){let w=[['Pizza','Burger'],['Paris','Londres'],['Naruto','One Piece'],['Football','Basket'],['Chat','Chien'],['Netflix','YouTube']][Math.floor(Math.random()*6)],ps=Object.values(r.players),imp=ps[Math.floor(Math.random()*ps.length)];r.secret={imp:imp.id,n:w[0],o:w[1]};c={game:g,q:"Décris ton mot sans le dire, puis trouvez l’imposteur !",oral:true}}
 else if(g==='Duel'){let d=[
 ['Quelle est la capitale du Japon ?','Tokyo'],['Combien font 7 × 8 ?','56'],['Quel animal est surnommé le roi de la jungle ?','Lion'],
 ['Quel club joue au Parc des Princes ?','PSG'],['Dans quel manga trouve-t-on Luffy ?','One Piece'],['Quelle planète est la plus proche du Soleil ?','Mercure'],
 ['Qui est le héros principal de Dragon Ball ?','Goku'],['Combien y a-t-il de continents ?','7'],['Quel pays a la forme d’une botte ?','Italie'],
 ['Quel sport pratique Kylian Mbappé ?','Football'],['Quelle est la capitale de l’Italie ?','Rome'],['Qui est le héros de One Piece ?','Luffy'],['Combien font 9 × 9 ?','81'],['Quel Pokémon jaune accompagne Sacha ?','Pikachu'],['Quel est le plus grand océan ?','Pacifique'],['Quel héros est Bruce Wayne ?','Batman'],['Dans Naruto, quel est le village de Naruto ?','Konoha'],['Quel pays a gagné la Coupe du monde 2018 ?','France'],['Quel animal est le plus grand mammifère ?','Baleine bleue'],['Quelle planète est surnommée planète rouge ?','Mars']][Math.floor(Math.random()*20)];c={game:g,q:d[0],answer:d[1],oral:true}}
 else if(g==='Mot interdit'){let m=[['Plage','mer'],['Football','ballon'],['Pizza','fromage'],['TikTok','vidéo'],['Chat','miaou'],['Paris','Eiffel']][Math.floor(Math.random()*6)];c={game:g,q:`Fais deviner « ${m[0]} » sans dire « ${m[1]} ».`,oral:true}}
 else if(g==='Trouve l’intrus'){let sets=[
 {q:'Trouve l’intrus : un seul n’est PAS un animal.',items:[['🐶','Chien'],['🐱','Chat'],['🍎','Pomme'],['🐰','Lapin']],c:2,why:'La pomme n’est pas un animal.'},
 {q:'Trouve l’intrus : un seul n’est PAS un fruit.',items:[['🍎','Pomme'],['🍌','Banane'],['⚽','Ballon'],['🍓','Fraise']],c:2,why:'Le ballon n’est pas un fruit.'},
 {q:'Trouve l’intrus : lequel n’a PAS les cheveux jaunes ?',items:[['👱','Blond 1'],['👱‍♀️','Blond 2'],['👨‍🦰','Roux'],['👱‍♂️','Blond 3']],c:2,why:'Le troisième personnage est roux.'},
 {q:'Trouve l’intrus : un seul n’est PAS un moyen de transport.',items:[['🚗','Voiture'],['✈️','Avion'],['🚲','Vélo'],['🎸','Guitare']],c:3,why:'La guitare n’est pas un moyen de transport.'},
 {q:'Trouve l’intrus : un seul n’est PAS lié au Japon.',items:[['🗾','Japon'],['🍣','Sushi'],['🗼','Tokyo'],['🗽','Statue de la Liberté']],c:3,why:'La Statue de la Liberté est à New York.'},
 {q:'Trouve l’intrus : trois sont des sports avec ballon.',items:[['⚽','Football'],['🏀','Basket'],['🎾','Tennis'],['🏊','Natation']],c:3,why:'La natation ne se joue pas avec un ballon.'},
 {q:'Trouve l’intrus : trois sont des moyens de transport terrestres.',items:[['🚗','Voiture'],['🚌','Bus'],['🚲','Vélo'],['🚁','Hélicoptère']],c:3,why:'L’hélicoptère vole.'},
 {q:'Trouve l’intrus : trois sont jaunes.',items:[['🍌','Banane'],['🌞','Soleil'],['⭐','Étoile'],['🍓','Fraise']],c:3,why:'La fraise est rouge.'},
 {q:'Trouve l’intrus : trois vivent principalement dans l’eau.',items:[['🐟','Poisson'],['🐬','Dauphin'],['🐙','Pieuvre'],['🐘','Éléphant']],c:3,why:'L’éléphant est terrestre.'},
 {q:'Trouve l’intrus : trois sont associés à la musique.',items:[['🎸','Guitare'],['🎹','Piano'],['🎤','Micro'],['⚽','Ballon']],c:3,why:'Le ballon n’est pas un objet musical.'},
 {q:'Trouve l’intrus : trois sont des fruits.',items:[['🍉','Pastèque'],['🍇','Raisin'],['🍍','Ananas'],['🥕','Carotte']],c:3,why:'La carotte est un légume.'},
 {q:'Trouve l’intrus : trois sont des animaux.',items:[['🦁','Lion'],['🐯','Tigre'],['🐻','Ours'],['🚗','Voiture']],c:3,why:'La voiture n’est pas un animal.'},
 {q:'Trouve l’intrus : trois peuvent voler.',items:[['✈️','Avion'],['🚁','Hélicoptère'],['🦅','Aigle'],['🚂','Train']],c:3,why:'Le train reste au sol.'},
 {q:'Trouve l’intrus : trois sont des boissons.',items:[['☕','Café'],['🥛','Lait'],['🧃','Jus'],['🍕','Pizza']],c:3,why:'La pizza n’est pas une boisson.'},
 {q:'Trouve l’intrus : trois sont liés au jeu vidéo.',items:[['🎮','Manette'],['🕹️','Joystick'],['👾','Alien pixel'],['🎻','Violon']],c:3,why:'Le violon est un instrument de musique.'}
 ][Math.floor(Math.random()*15)];c={game:g,q:sets.q,a:sets.items.map(x=>x[1]),images:sets.items.map(x=>x[0]),c:sets.c,why:sets.why,intruder:true}}
 else c={game:g,q:['Imite une célébrité sans parler.','Fais deviner un film en 3 mots.','Donne 5 animaux en 10 secondes.','Fais une imitation choisie par les autres joueurs.','Cite 4 pays en moins de 10 secondes.'][Math.floor(Math.random()*5)],oral:true};
 return c;
}
function next(r){
 if(r.gameIndex==null)r.gameIndex=0;
 if(r.gameRound==null)r.gameRound=0;
 if(r.gameIndex>=r.settings.games.length){io.to(r.code).emit('finished',view(r));return}
 let limit=gameLimit(r);
 if(r.gameRound>=limit){
   const ranking=Object.values(r.players).sort((a,b)=>b.score-a.score);
   if(ranking.length>=2 && !r.afterGameDuel){
     r.afterGameDuel=true;r.duelFirst=ranking[0].id;r.duelLast=ranking[ranking.length-1].id;
     const x=question(r);r.current={game:'⚡ Duel de classement',q:x.q,a:x.a,c:x.c,image:x.image||null,points:500,specialDuel:true,first:r.duelFirst,last:r.duelLast};
     r.answers={};io.to(r.code).emit('gameRanking',{ranking:ranking.map(p=>({id:p.id,name:p.name,score:p.score})),nextGame:r.settings.games[r.gameIndex+1]||null});
     setTimeout(()=>io.to(r.code).emit('round',{round:r.round,total:r.total,gameRound:1,gameTotal:1,gameIndex:r.gameIndex,current:r.current}),2200);
     return;
   }
   r.afterGameDuel=false;r.gameIndex++;r.gameRound=0;
   if(r.gameIndex>=r.settings.games.length){io.to(r.code).emit('finished',view(r));return}
   limit=gameLimit(r)
 }
 r.gameRound++;r.round++;r.answers={};r.guesses={};r.oralDecisions={};r._advancing=false;
 const g=r.settings.games[r.gameIndex],c=makeRound(r,g);r.current=c;
 io.to(r.code).emit('round',{round:r.round,total:r.total,gameRound:r.gameRound,gameTotal:limit,gameIndex:r.gameIndex,current:c});
 if(g==="L’Imposteur")for(const p of Object.values(r.players))io.to(p.id).emit('secret',{word:p.id===r.secret.imp?r.secret.o:r.secret.n});
 emit(r);
}
function scheduleNextIfAll(r){
 if(!r||r._advancing)return;
 const ids=Object.keys(r.players);let done=false;
 if(r.current?.game==='Tu me connais ?'&&r.current.phase==='guess'){const e=ids.filter(id=>id!==r.current.target);done=e.length>0&&e.every(id=>r.guesses?.[id]!=null)}
 else if(r.current?.a){done=ids.length>0&&ids.every(id=>r.answers?.[id]!=null)}
 if(done){r._advancing=true;io.to(r.code).emit('allAnswered');setTimeout(()=>next(r),1100)}
}
io.on('connection',s=>{
 s.on('create',({name},cb)=>{let c;do c=code();while(rooms[c]);let r=rooms[c]={code:c,host:s.id,players:{},settings:{games:['Quiz Battle'],themes:['Culture générale'],gameRounds:{'Quiz Battle':5}},round:0,total:5,state:'lobby'};r.players[s.id]={id:s.id,name:name||'Hôte',score:0};s.join(c);cb({ok:true,code:c});emit(r)});
 s.on('join',({code:c,name},cb)=>{c=(c||'').toUpperCase();let r=rooms[c];if(!r)return cb({ok:false});r.players[s.id]={id:s.id,name:name||'Joueur',score:0};s.join(c);cb({ok:true});emit(r)});
 s.on('settings',(x,cb)=>{let r=rooms[x.code];if(!r||r.host!==s.id)return cb&&cb({ok:false});r.settings=x.settings;r.total=totalRounds(r);emit(r);cb&&cb({ok:true})});
 s.on('start',(c,cb)=>{let r=rooms[c];if(!r||r.host!==s.id)return cb&&cb({ok:false});if(!r.settings.games?.length)return cb&&cb({ok:false});r.round=0;r.gameIndex=0;r.gameRound=0;r.used={};r.total=totalRounds(r);Object.values(r.players).forEach(p=>p.score=0);cb&&cb({ok:true});next(r)});
 s.on('answer',x=>{let r=rooms[x.code];if(!r||r.answers?.[s.id]!=null)return;
 if(r.current?.specialDuel){
   if(s.id!==r.duelFirst&&s.id!==r.duelLast)return;
   r.answers=r.answers||{};r.answers[s.id]=x.value;
   if(+x.value===r.current.c){
     if(s.id===r.duelLast){let steal=Math.min(500,r.players[r.duelFirst].score);r.players[r.duelFirst].score-=steal;r.players[r.duelLast].score+=steal;io.to(r.code).emit('duelResult',{winner:r.players[s.id].name,stolen:steal})}
     else io.to(r.code).emit('duelResult',{winner:r.players[s.id].name,stolen:0});
     r.afterGameDuel=true;setTimeout(()=>{r.afterGameDuel=false;r.gameIndex++;r.gameRound=0;if(r.gameIndex>=r.settings.games.length)io.to(r.code).emit('finished',view(r));else next(r)},1800);emit(r);return;
   }
   return;
 }
 r.answers=r.answers||{};r.answers[s.id]=x.value;if((r.current.game==='Quiz Battle'||r.current.game==='Trouve l’intrus')&&+x.value===r.current.c)r.players[s.id].score+=(r.current.points||500);emit(r);scheduleNextIfAll(r)});
 s.on('secretChoice',x=>{let r=rooms[x.code];if(!r||r.current.game!=='Tu me connais ?'||r.current.target!==s.id||r.current.phase!=='choose')return;r.secretChoice=+x.value;r.current.phase='guess';io.to(r.code).emit('tmcGuess',{q:r.current.q,a:r.current.a,target:r.current.target,targetName:r.current.targetName})});
 s.on('tmcGuess',x=>{let r=rooms[x.code];if(!r||r.current.game!=='Tu me connais ?'||r.current.phase!=='guess'||s.id===r.current.target||r.guesses[s.id]!=null)return;r.guesses[s.id]=+x.value;if(+x.value===r.secretChoice)r.players[s.id].score+=500;emit(r);io.to(s.id).emit('guessResult',{correct:+x.value===r.secretChoice});scheduleNextIfAll(r)});
 s.on('award',x=>{let r=rooms[x.code];if(r&&r.host===s.id&&r.players[x.id]){
   if(r.oralDecisions?.[x.id]!=null)return;
   r.oralDecisions=r.oralDecisions||{};r.oralDecisions[x.id]=+x.points>0?'ok':'no';
   r.players[x.id].score+=+x.points||0;emit(r);
   if(r.current?.oral&&Object.keys(r.players).every(id=>r.oralDecisions[id]!=null)){
     r._advancing=true;io.to(r.code).emit('allAnswered');setTimeout(()=>next(r),900)
   }
 }});
 s.on('next',c=>{let r=rooms[c];if(r&&r.host===s.id)next(r)});
 s.on('restartSame',c=>{let r=rooms[c];if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;r.used={};r.total=totalRounds(r);Object.values(r.players).forEach(p=>p.score=0);next(r)}});
 s.on('backToSetup',c=>{let r=rooms[c];if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;r.state='lobby';io.to(c).emit('backToSetup');emit(r)}});
 s.on('disconnect',()=>{for(const c in rooms){let r=rooms[c];if(r.players[s.id]){delete r.players[s.id];if(!Object.keys(r.players).length)delete rooms[c];else{if(r.host===s.id)r.host=Object.keys(r.players)[0];emit(r)}}}})
});
server.listen(process.env.PORT||3000,()=>console.log('Party Arena V5.12 lancé'));