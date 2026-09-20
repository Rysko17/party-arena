const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const app=express(), server=http.createServer(app), io=new Server(server);
app.use(express.static("public"));
const rooms={};
const code=()=>{let s="";const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";for(let i=0;i<4;i++)s+=c[Math.floor(Math.random()*c.length)];return s};
const questions=[
 {theme:"Culture générale",q:"Quelle planète est surnommée la planète rouge ?",a:["Mars","Vénus","Jupiter","Mercure"],ok:0},
 {theme:"Football",q:"Combien de joueurs une équipe aligne-t-elle au coup d’envoi ?",a:["9","10","11","12"],ok:2},
 {theme:"Anime",q:"Dans Naruto, quel animal est associé à Kurama ?",a:["Renard","Loup","Dragon","Tigre"],ok:0},
 {theme:"Jeux vidéo",q:"Dans Minecraft, quel outil sert principalement à miner la pierre ?",a:["Pioche","Arc","Bouclier","Canne à pêche"],ok:0},
 {theme:"Musique",q:"Comment appelle-t-on la partie répétée et mémorable d’une chanson ?",a:["Refrain","Chapitre","Scène","Générique"],ok:0},
 {theme:"Cinéma",q:"Quel métier dirige principalement le tournage d’un film ?",a:["Réalisateur","Projectionniste","Cascadeur","Compositeur"],ok:0}
];
function cleanRoom(r){return {code:r.code,host:r.host,started:r.started,round:r.round,total:r.total,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,score:p.score,answered:!!p.answered}))}}
function emit(r){io.to(r.code).emit("room",cleanRoom(r))}
function next(r){
 r.round++; if(r.round>r.total){r.started=false;io.to(r.code).emit("gameOver",cleanRoom(r));return}
 r.current=questions[Math.floor(Math.random()*questions.length)]; Object.values(r.players).forEach(p=>p.answered=false);
 io.to(r.code).emit("question",{round:r.round,total:r.total,theme:r.current.theme,q:r.current.q,a:r.current.a}); emit(r);
}
io.on("connection",s=>{
 s.on("create",name=>{let c;do c=code();while(rooms[c]);rooms[c]={code:c,host:s.id,started:false,round:0,total:8,current:null,players:{}};rooms[c].players[s.id]={id:s.id,name:(name||"Hôte").slice(0,16),score:0,answered:false};s.join(c);s.data.room=c;emit(rooms[c]);});
 s.on("join",({code:c,name})=>{c=(c||"").toUpperCase().trim();let r=rooms[c];if(!r)return s.emit("errorMsg","Salle introuvable.");if(r.started)return s.emit("errorMsg","La partie a déjà commencé.");r.players[s.id]={id:s.id,name:(name||"Joueur").slice(0,16),score:0,answered:false};s.join(c);s.data.room=c;emit(r)});
 s.on("start",()=>{let r=rooms[s.data.room];if(!r||r.host!==s.id)return;if(Object.keys(r.players).length<2)return s.emit("errorMsg","Il faut au moins 2 joueurs.");r.started=true;r.round=0;next(r)});
 s.on("answer",i=>{let r=rooms[s.data.room],p=r?.players[s.id];if(!r||!p||!r.started||p.answered)return;p.answered=true;if(Number(i)===r.current.ok)p.score+=500;s.emit("answerResult",{correct:Number(i)===r.current.ok,correctIndex:r.current.ok});emit(r);if(Object.values(r.players).every(x=>x.answered))setTimeout(()=>next(r),1400)});
 s.on("disconnect",()=>{let r=rooms[s.data.room];if(!r)return;delete r.players[s.id];if(!Object.keys(r.players).length){delete rooms[r.code];return}if(r.host===s.id)r.host=Object.keys(r.players)[0];emit(r)});
});
server.listen(process.env.PORT||3000,"0.0.0.0",()=>console.log("Party Arena ONLINE lancé"));