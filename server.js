const express=require('express'),http=require('http'),{Server}=require('socket.io'),fs=require('fs'),path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server),DB=JSON.parse(fs.readFileSync(path.join(__dirname,'questions.json'),'utf8')),rooms={};
app.use(express.static(path.join(__dirname,'public')));
function code(){let s='',a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function view(r){return{code:r.code,host:r.host,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,score:p.score})),settings:r.settings,round:r.round,total:r.total,state:r.state,gameIndex:r.gameIndex,gameRound:r.gameRound}}
function emit(r){io.to(r.code).emit('room',view(r))}
function question(r){let p=[];for(const t of r.settings.themes)(DB[t]||[]).forEach(x=>p.push({...x,theme:t}));if(!p.length)Object.entries(DB).forEach(([t,a])=>a.forEach(x=>p.push({...x,theme:t})));return p[Math.floor(Math.random()*p.length)]}
function gameLimit(r){const g=r.settings.games[r.gameIndex];return +(r.settings.gameRounds?.[g]||5)}
function totalRounds(r){return (r.settings.games||[]).reduce((n,g)=>n+(+(r.settings.gameRounds?.[g]||5)),0)}
function makeRound(r,g){
 let c={game:g};
 if(g==='Quiz Battle'){let x=question(r);c={game:g,q:x.q,a:x.a,c:x.c,image:x.image||null,theme:x.theme,difficulty:x.difficulty||'simple',points:({simple:250,moyen:500,dur:1000}[x.difficulty]||250)}}
 else if(g==='Tu me connais ?'){let ps=Object.values(r.players),target=ps[(r.gameRound-1)%ps.length];r.secretChoice=null;r.guesses={};let tq=[
['Tu préfères quelle soirée ?',['Soirée maison','Boîte','Restaurant','Cinéma']],
['Quel voyage tu choisis ?',['Tokyo','New York','Dubaï','Bali']],
['Quel repas tu choisis ?',['Pizza','Burger','Sushi','Tacos']],
['Quel pouvoir tu voudrais ?',['Voler','Téléportation','Invisibilité','Lire les pensées']],
['Quel univers tu préfères ?',['Musique','Films/Séries','Jeux vidéo','Voyage']],
['Quel animal tu préfères ?',['Chien','Chat','Lion','Dauphin']],
['Quel réseau tu garderais ?',['TikTok','Instagram','YouTube','Snapchat']],
['Quel style de film tu préfères ?',['Action','Comédie','Horreur','Science-fiction']],
['Quel sport tu préfères ?',['Football','Basket','Boxe','Tennis']],
['Quel anime tu choisirais ?',['One Piece','Naruto','Bleach','Dragon Ball']],
['Quel luxe tu choisis ?',['Belle voiture','Grande maison','Voyages','Vêtements']],
['Tu préfères vivre où ?',['Grande ville','Campagne','Bord de mer','Montagne']],
['Quel moment tu préfères ?',['Matin','Après-midi','Soir','Nuit']],
['Quel dessert tu prends ?',['Glace','Gâteau','Crêpe','Fruit']],
['Quel type de musique tu choisis ?',['Rap','Afro','Pop','R&B']],
['Quel défaut te dérange le plus ?',['Mensonge','Jalousie','Égoïsme','Retard']],
['Quel cadeau te ferait le plus plaisir ?',['Argent','Voyage','Téléphone','Surprise']],
['Si tu pouvais changer de vie 24h ?',['Star','Sportif pro','Milliardaire','Aventurier']],
['Quel climat tu préfères ?',['Très chaud','Doux','Froid','Neige']],
['Tu préfères gagner quoi ?',['10 000 €','Voyage illimité','Voiture','1 an sans travailler']]
][Math.floor(Math.random()*20)];c={game:g,phase:'choose',target:target.id,targetName:target.name,q:tq[0],a:tq[1]}}
 else if(g==='Majorité'){let mq=[
['Soirée maison ou sortie ?',['Maison','Sortie']],['Sucré ou salé ?',['Sucré','Salé']],['Film ou série ?',['Film','Série']],
['iPhone ou Android ?',['iPhone','Android']],['Mer ou montagne ?',['Mer','Montagne']],['Été ou hiver ?',['Été','Hiver']],
['Rap ou R&B ?',['Rap','R&B']],['Pizza ou tacos ?',['Pizza','Tacos']],['PlayStation ou Xbox ?',['PlayStation','Xbox']],
['Netflix ou YouTube ?',['Netflix','YouTube']],['Appel ou message ?',['Appel','Message']],['Chien ou chat ?',['Chien','Chat']],
['Voyager ou acheter une voiture ?',['Voyager','Voiture']],['Matin ou nuit ?',['Matin','Nuit']],['Argent ou célébrité ?',['Argent','Célébrité']],
['Anime ou série ?',['Anime','Série']],['Football ou basket ?',['Football','Basket']],['Ville ou campagne ?',['Ville','Campagne']],
['Restaurant ou livraison ?',['Restaurant','Livraison']],['TikTok ou Instagram ?',['TikTok','Instagram']],
['Être riche ou célèbre ?',['Riche','Célèbre']],['Vacances entre amis ou en couple ?',['Amis','Couple']],['PC ou console ?',['PC','Console']],
['Musique avec écouteurs ou enceinte ?',['Écouteurs','Enceinte']],['Douche matin ou soir ?',['Matin','Soir']]
][Math.floor(Math.random()*25)];c={game:g,q:mq[0],a:mq[1]}}
 else if(g==='La Bombe'){let qs=['Donne un rappeur français','Donne un anime','Donne un club de football','Donne un jeu vidéo','Donne un pays commençant par A','Donne un film Marvel','Donne un animal à quatre pattes','Donne une marque de voiture'];c={game:g,q:qs[Math.floor(Math.random()*qs.length)]+' avant la fin !',oral:true}}
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
 if(r.gameRound>=limit){r.gameIndex++;r.gameRound=0;if(r.gameIndex>=r.settings.games.length){io.to(r.code).emit('finished',view(r));return}limit=gameLimit(r)}
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
 s.on('start',(c,cb)=>{let r=rooms[c];if(!r||r.host!==s.id)return cb&&cb({ok:false});if(!r.settings.games?.length)return cb&&cb({ok:false});r.round=0;r.gameIndex=0;r.gameRound=0;r.total=totalRounds(r);Object.values(r.players).forEach(p=>p.score=0);cb&&cb({ok:true});next(r)});
 s.on('answer',x=>{let r=rooms[x.code];if(!r||r.answers?.[s.id]!=null)return;r.answers=r.answers||{};r.answers[s.id]=x.value;if((r.current.game==='Quiz Battle'||r.current.game==='Trouve l’intrus')&&+x.value===r.current.c)r.players[s.id].score+=(r.current.points||500);emit(r);scheduleNextIfAll(r)});
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
 s.on('restartSame',c=>{let r=rooms[c];if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;r.total=totalRounds(r);Object.values(r.players).forEach(p=>p.score=0);next(r)}});
 s.on('backToSetup',c=>{let r=rooms[c];if(r&&r.host===s.id){r.round=0;r.gameIndex=0;r.gameRound=0;r.state='lobby';io.to(c).emit('backToSetup');emit(r)}});
 s.on('disconnect',()=>{for(const c in rooms){let r=rooms[c];if(r.players[s.id]){delete r.players[s.id];if(!Object.keys(r.players).length)delete rooms[c];else{if(r.host===s.id)r.host=Object.keys(r.players)[0];emit(r)}}}})
});
server.listen(process.env.PORT||3000,()=>console.log('Party Arena V5.12 lancé'));