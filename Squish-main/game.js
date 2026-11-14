(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const W=960,H=540;
const screens=["menu","levels","gameScreen","story"];
const $=id=>document.getElementById(id);
let currentWorld=0,level=0,gameState="menu",soundOn=true,keys={},last=0,toastTimer=0;
let totalCrystals=Number(localStorage.getItem("squishCrystals")||0);
let unlocked=Number(localStorage.getItem("squishUnlocked")||0);
let worldCrystals=JSON.parse(localStorage.getItem("squishWorldCrystals")||"{}");
const worlds=[
 {name:"SLIME FOREST",short:"Slime Forest",icon:"🌳",desc:"Bouncy branches and friendly forest critters.",sky:["#b8efff","#e9fbff"],ground:"#72cf91",accent:"#39aa70"},
 {name:"CANDY KINGDOM",short:"Candy Kingdom",icon:"🍬",desc:"Sticky sweets, gumdrop hills and sugary surprises.",sky:["#ffd9eb","#fff0f7"],ground:"#f4a6c8",accent:"#df6c9d"},
 {name:"FROZEN MOUNTAINS",short:"Frozen Mountains",icon:"❄️",desc:"Slippery slopes and icy platforms.",sky:["#c7e7ff","#f1f9ff"],ground:"#a3d8ef",accent:"#64b5df"},
 {name:"LAVA LAND",short:"Lava Land",icon:"🌋",desc:"Hot jumps, fireballs and brave bounces.",sky:["#ffcfad","#ffe8c8"],ground:"#bd6954",accent:"#f18a48"},
 {name:"SKY KINGDOM",short:"Sky Kingdom",icon:"☁️",desc:"Cloud platforms and one final showdown.",sky:["#b7c8ff","#f0edff"],ground:"#aaa4ed",accent:"#776bd1"}
];
const levels=[
 {name:"First Bounce",length:1850,plats:[[250,420,130,18],[470,355,120,18],[700,300,140,18],[1020,385,130,18],[1300,320,120,18]],hazards:[[580,500,65,22],[1130,500,80,22]],coins:[[285,380],[515,315],[745,260],[1065,345],[1345,280],[1580,410]],goal:1740},
 {name:"Gummy Gap",length:2050,plats:[[210,410,130,18],[440,340,110,18],[680,400,130,18],[930,320,140,18],[1190,370,120,18],[1460,300,140,18]],hazards:[[330,500,75,22],[780,500,80,22],[1300,500,75,22]],coins:[[250,370],[480,300],[720,360],[980,280],[1230,330],[1500,260],[1770,420]],goal:1940},
 {name:"Ice, Ice, Baby",length:2200,plats:[[270,410,130,18],[520,330,110,18],[770,390,120,18],[1030,300,140,18],[1320,370,120,18],[1590,280,140,18]],hazards:[[420,500,75,22],[900,500,85,22],[1450,500,85,22]],coins:[[310,370],[560,290],[810,350],[1080,260],[1360,330],[1630,240],[1900,420]],goal:2090},
 {name:"Hot Stuff",length:2300,plats:[[240,405,120,18],[490,330,120,18],[750,390,130,18],[1010,300,120,18],[1280,370,130,18],[1550,290,140,18],[1850,360,120,18]],hazards:[[350,500,100,22],[850,500,110,22],[1400,500,100,22],[1740,500,80,22]],coins:[[280,365],[530,290],[790,350],[1050,260],[1320,330],[1590,250],[1890,320],[2110,420]],goal:2190},
 {name:"Crusher's Castle",length:2100,plats:[[260,410,130,18],[520,340,120,18],[800,400,130,18],[1080,320,140,18],[1390,380,130,18],[1660,310,140,18]],hazards:[[420,500,85,22],[920,500,90,22],[1490,500,90,22]],coins:[[300,370],[560,300],[840,360],[1130,280],[1440,340],[1710,270]],goal:1950,boss:true}
];
let player,cam=0,coins=[],enemies=[],particles=[],collected=0,lives=3,levelWon=false,boss=null,checkpoint=0;
let audioCtx=null;
function beep(freq=440,dur=.08,type="sine"){if(!soundOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.06,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch(e){}}
function showScreen(id){screens.forEach(s=>$(s).classList.toggle("active",s===id));}
function renderWorlds(){
 $("worldGrid").innerHTML="";
 worlds.forEach((w,i)=>{let card=document.createElement("div");card.className="world-card"+(i>unlocked?" locked":"");card.innerHTML=`<div class="world-num">WORLD 0${i+1}</div><div class="world-icon">${w.icon}</div><h3>${w.short}</h3><p>${w.desc}</p><div class="stars">${worldCrystals[i]||0} / ${levels[i].coins.length} ✦</div>${i>unlocked?'<div class="lock">🔒</div>':'<div class="lock">↗</div>'}`;if(i<=unlocked)card.addEventListener("click",()=>startLevel(i));$("worldGrid").appendChild(card)});
 $("crystalTotal").textContent=totalCrystals;
}
function resetPlayer(){player={x:70,y:420,vx:0,vy:0,w:42,h:38,onGround:false,squish:0,energy:0,invuln:0,face:1,stretch:0};}
function startLevel(i){currentWorld=i;level=0;loadLevel();showScreen("gameScreen");gameState="playing";$("pauseOverlay").classList.remove("show");$("winOverlay").classList.remove("show");$("gameOverOverlay").classList.remove("show");}
function loadLevel(){let data=levels[currentWorld];resetPlayer();cam=0;collected=0;lives=3;levelWon=false;coins=data.coins.map(c=>({x:c[0],y:c[1],got:false}));enemies=[{x:620,y:462,base:620,min:560,max:780,dir:1},{x:1180,y:462,base:1180,min:1080,max:1320,dir:-1}];if(currentWorld===4)enemies.push({x:1500,y:462,base:1500,min:1450,max:1750,dir:1});boss=data.boss?{x:1810,y:405,hp:3,dir:-1,hit:0}:null;checkpoint=0;$("hudWorld").textContent=worlds[currentWorld].name;$("hudCrystals").textContent="0";$("hudLives").textContent=lives;}
function toast(msg){let t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),1300)}
function restart(){loadLevel();gameState="playing";$("gameOverOverlay").classList.remove("show");$("pauseOverlay").classList.remove("show");$("winOverlay").classList.remove("show")}
function nextWorld(){if(currentWorld<4){unlocked=Math.max(unlocked,currentWorld+1);localStorage.setItem("squishUnlocked",unlocked);renderWorlds();startLevel(currentWorld+1)}else{ $("winTitle").textContent="KINGDOM SAVED!";$("winText").textContent="You bounced back, Pip! The Great Bounce Crystal is home."; $("nextBtn").textContent="PLAY AGAIN";$("winOverlay").classList.add("show");$("nextBtn").onclick=()=>{unlocked=4;localStorage.setItem("squishUnlocked",4);showScreen("levels");$("winOverlay").classList.remove("show");renderWorlds()};}}
function completeLevel(){if(levelWon)return;levelWon=true;gameState="won";let old=worldCrystals[currentWorld]||0;worldCrystals[currentWorld]=Math.max(old,collected);localStorage.setItem("squishWorldCrystals",JSON.stringify(worldCrystals));$("winTitle").textContent=currentWorld===4?"YOU DID IT, PIP!":"NICE BOUNCE!";$("winText").textContent=currentWorld===4?"The Crusher's power is gone. The kingdom is bouncing again!":"You made it through "+worlds[currentWorld].short+"!";$("winCrystals").textContent="✦ "+collected+" / "+coins.length;$("nextBtn").textContent=currentWorld===4?"FINISH ADVENTURE":"NEXT WORLD →";$("winOverlay").classList.add("show");beep(660,.16);setTimeout(()=>beep(880,.2),120)}
function loseLife(){if(player.invuln>0)return;lives--;player.invuln=1.4;player.vy=-330;player.vx=-player.face*220;player.energy=0;$("hudLives").textContent=lives;beep(130,.2,"sawtooth");toast("SPLAT! BOUNCE BACK!");if(lives<=0){gameState="over";$("gameOverOverlay").classList.add("show")}}
function burst(x,y,color,n=9){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*260,vy:-Math.random()*230-30,life:.55,max:.55,color,size:3+Math.random()*5})}
function update(dt){
 if(gameState!=="playing")return;let d=levels[currentWorld],left=keys.ArrowLeft||keys.KeyA,right=keys.ArrowRight||keys.KeyD,jump=keys.Space||keys.ArrowUp||keys.KeyW,down=keys.ArrowDown||keys.KeyS;
 let accel=1500,friction=player.onGround?11:3.5,max=300;
 if(left){player.vx-=accel*dt;player.face=-1}if(right){player.vx+=accel*dt;player.face=1}
 if(!left&&!right)player.vx*=Math.max(0,1-friction*dt);
 player.vx=Math.max(-max,Math.min(max,player.vx));
 if(down&&player.onGround){player.squish=Math.min(1,player.squish+dt*5);player.energy=Math.min(1,player.energy+dt*.8);player.vx*=.92}else{player.squish=Math.max(0,player.squish-dt*6)}
 if(jump&&player.onGround){player.vy=player.energy>.55?-650:-520;player.onGround=false;player.energy=0;player.stretch=.25;beep(360,.09);burst(player.x+player.w/2,player.y+player.h,"#b4f18b",5)}
 player.vy+=1450*dt;player.vy=Math.min(player.vy,900);
 let oldY=player.y;player.x+=player.vx*dt;player.y+=player.vy*dt;
 player.x=Math.max(0,Math.min(d.length-player.w,player.x));
 player.onGround=false;
 let floorY=490;
 if(player.y+player.h>=floorY&&oldY+player.h<=floorY+18){player.y=floorY-player.h;player.vy=0;player.onGround=true}
 for(let p of d.plats){if(player.vy>=0&&oldY+player.h<=p[1]+8&&player.y+player.h>=p[1]&&player.x+player.w>p[0]&&player.x<p[0]+p[2]){player.y=p[1]-player.h;player.vy=0;player.onGround=true}}
 if(player.y>H+100)loseLife();
 if(player.invuln>0)player.invuln-=dt;if(player.stretch>0)player.stretch-=dt;
 for(let h of d.hazards){if(rect(player.x+5,player.y+7,player.w-10,player.h-7,h[0],h[1],h[2],h[3]))loseLife()}
 for(let e of enemies){e.x+=e.dir*90*dt;if(e.x<e.min||e.x>e.max)e.dir*=-1;if(rect(player.x+5,player.y+5,player.w-10,player.h-5,e.x,e.y,38,28)){if(player.vy>100&&player.y+player.h<e.y+18){e.x=-100;player.vy=-420;burst(e.x,e.y,"#ffb6c9",12);beep(520,.1)}else loseLife()}}
 for(let c of coins){if(!c.got&&Math.hypot(player.x+player.w/2-c.x,player.y+player.h/2-c.y)<35){c.got=true;collected++;totalCrystals++;localStorage.setItem("squishCrystals",totalCrystals);$("hudCrystals").textContent=collected;beep(800,.07);burst(c.x,c.y,"#ffd45e",6)}}
 if(boss){boss.x+=boss.dir*45*dt;if(boss.x<1730||boss.x>1900)boss.dir*=-1;if(boss.hit>0)boss.hit-=dt;if(rect(player.x,player.y,player.w,player.h,boss.x,boss.y,70,82)){if(player.vy>120&&player.y+player.h<boss.y+35){boss.hp--;boss.hit=.35;player.vy=-520;burst(boss.x+35,boss.y,"#ffdf75",16);beep(220,.15,"square");if(boss.hp<=0){boss.x=9999;toast("THE CRUSHER IS DEFEATED!")}}else loseLife()}}
 cam=Math.max(0,Math.min(d.length-W,player.x-W*.34));
 if(player.x>d.goal&&(!boss||boss.hp<=0))completeLevel();
 for(let p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
}
function rect(x,y,w,h,a,b,c,d){return x<a+c&&x+w>a&&y<b+d&&y+h>b}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function draw(){
 let data=worlds[currentWorld]||worlds[0],lv=levels[currentWorld]||levels[0],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,data.sky[0]);g.addColorStop(1,data.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // distant scenery
 ctx.fillStyle="#ffffff88";for(let i=0;i<6;i++){let x=((i*220-cam*.18)%(W+180)+W+180)%(W+180)-80;cloud(x,80+(i%3)*48,1+(i%2)*.25)}
 ctx.fillStyle=data.accent+"33";for(let i=0;i<8;i++){let x=i*180-(cam*.35%180);ctx.beginPath();ctx.arc(x,500,120,Math.PI,0);ctx.fill()}
 ctx.save();ctx.translate(-cam,0);
 // floor
 ctx.fillStyle=data.ground;ctx.fillRect(0,490,lv.length,50);ctx.fillStyle="#ffffff33";for(let x=0;x<lv.length;x+=70)rounded(x,495,34,5,3,"#ffffff44");
 // platforms
 for(let p of lv.plats){rounded(p[0],p[1],p[2],p[3],9,data.accent);rounded(p[0]+5,p[1]+3,p[2]-10,4,3,"#ffffff77")}
 // hazards
 for(let h of lv.hazards){ctx.fillStyle=currentWorld===3?"#ff6b39":"#566178";ctx.beginPath();for(let x=h[0];x<h[0]+h[2];x+=22){ctx.moveTo(x,h[1]+h[3]);ctx.lineTo(x+11,h[1]);ctx.lineTo(x+22,h[1]+h[3])}ctx.fill()}
 // goal gate
 rounded(lv.goal,395,35,95,10,"#fff");rounded(lv.goal+7,405,21,85,7,data.accent);ctx.fillStyle="#fff";ctx.font="bold 24px Nunito";ctx.fillText("★",lv.goal+6,390);
 // coins
 for(let c of coins)if(!c.got){ctx.fillStyle="#ffd45e";ctx.beginPath();ctx.arc(c.x,c.y,11+Math.sin(performance.now()/160+c.x)*2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff5bf";ctx.beginPath();ctx.arc(c.x-3,c.y-4,3,0,Math.PI*2);ctx.fill()}
 // enemies
 for(let e of enemies)if(e.x>-50){rounded(e.x,e.y,38,28,12,"#fa7b9f");ctx.fillStyle="#27384b";ctx.beginPath();ctx.arc(e.x+12,e.y+11,3,0,7);ctx.arc(e.x+27,e.y+11,3,0,7);ctx.fill();ctx.strokeStyle="#27384b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x+19,e.y+14,5,.2,2.8);ctx.stroke()}
 // boss
 if(boss&&boss.hp>0){rounded(boss.x,boss.y,70,82,22,boss.hit>0?"#fff":"#67556f");ctx.fillStyle="#f9d4ea";ctx.beginPath();ctx.arc(boss.x+20,boss.y+30,6,0,7);ctx.arc(boss.x+50,boss.y+30,6,0,7);ctx.fill();ctx.fillStyle="#2e2638";ctx.beginPath();ctx.arc(boss.x+20,boss.y+30,2,0,7);ctx.arc(boss.x+50,boss.y+30,2,0,7);ctx.fill();rounded(boss.x-3,boss.y-17,76,8,4,"#fff");rounded(boss.x,boss.y-15,70*boss.hp/3,4,3,"#ff6b9a");ctx.fillStyle="#fff";ctx.font="bold 13px Nunito";ctx.fillText("THE CRUSHER",boss.x-12,boss.y-25)}
 // player
 let sx=player.x+player.w/2,sy=player.y+player.h/2;let squish=player.squish;ctx.save();ctx.translate(sx,sy);let syScale=1-squish*.38+(player.stretch>0?.22:0),sxScale=1+squish*.2;ctx.scale(sxScale,syScale);
 let slime=ctx.createLinearGradient(-20,-20,20,25);slime.addColorStop(0,"#c5ff91");slime.addColorStop(1,"#50cb87");ctx.fillStyle=slime;ctx.beginPath();ctx.ellipse(0,0,22,20,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffffff88";ctx.beginPath();ctx.ellipse(-8,-9,7,3,-.5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#244b50";ctx.beginPath();ctx.ellipse(-8,-1,2.8,5,0,0,7);ctx.ellipse(8,-1,2.8,5,0,0,7);ctx.fill();ctx.strokeStyle="#244b50";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,5,.15,Math.PI-.15);ctx.stroke();ctx.restore();
 // bounce charge ring
 if(player.energy>.05){ctx.strokeStyle="#fff7a8";ctx.lineWidth=4;ctx.beginPath();ctx.arc(sx,sy,30+player.energy*13,-Math.PI/2,-Math.PI/2+Math.PI*2*player.energy);ctx.stroke()}
 for(let p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();ctx.globalAlpha=1}
 ctx.restore();
 // progress
 rounded(20,18,170,8,5,"#ffffff77");rounded(20,18,170*Math.min(1,player.x/lv.goal),8,5,"#fff");
 ctx.fillStyle="#34445c";ctx.font="900 13px Nunito";ctx.fillText("← → MOVE   SPACE JUMP   ↓ SQUISH",22,48);
 if(currentWorld===4&&boss&&boss.hp>0){ctx.fillStyle="#34445c";ctx.font="900 15px Nunito";ctx.fillText("BOUNCE ON THE CRUSHER TO DEFEAT HIM!",W/2-160,28)}
}
function cloud(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.arc(22,-8,28,0,7);ctx.arc(50,0,20,0,7);ctx.fill();ctx.restore()}
function loop(t){let dt=Math.min(.032,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}
function setKey(e,val){let k=e.code;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k))e.preventDefault();keys[k]=val}
window.addEventListener("keydown",e=>{setKey(e,true);if(e.code==="KeyP"&&gameState==="playing"){gameState="paused";$("pauseOverlay").classList.add("show")}else if(e.code==="Escape"&&gameState==="playing"){gameState="paused";$("pauseOverlay").classList.add("show")}else if(e.code==="Enter"&&gameState==="menu")showScreen("levels")});
window.addEventListener("keyup",e=>setKey(e,false));
$("playBtn").onclick=()=>{showScreen("story")};$("storyGoBtn").onclick=()=>{renderWorlds();showScreen("levels")};
document.querySelectorAll("[data-screen]").forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
$("exitBtn").onclick=()=>{gameState="menu";$("pauseOverlay").classList.remove("show");showScreen("levels");renderWorlds()};
$("resumeBtn").onclick=()=>{gameState="playing";$("pauseOverlay").classList.remove("show")};
$("restartBtn").onclick=restart;$("retryBtn").onclick=restart;$("gameOverWorldsBtn").onclick=()=>{showScreen("levels");renderWorlds();$("gameOverOverlay").classList.remove("show")};
$("worldsBtn").onclick=()=>{showScreen("levels");renderWorlds();$("winOverlay").classList.remove("show")};
$("nextBtn").onclick=()=>{if(currentWorld<4)nextWorld();else{showScreen("levels");$("winOverlay").classList.remove("show");renderWorlds()}};
$("soundBtn").onclick=()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"♫ SOUND ON":"♫ SOUND OFF"};
// Simple touch controls for phones/tablets
let touchMap={};function touchBind(id,code){let el=document.createElement("button");el.className="touch-control";el.textContent=id==="left"?"◀":id==="right"?"▶":id==="jump"?"JUMP":"SQUISH";el.addEventListener("pointerdown",e=>{e.preventDefault();keys[code]=true});["pointerup","pointerleave","pointercancel"].forEach(ev=>el.addEventListener(ev,e=>{keys[code]=false}));document.querySelector(".controls-hint").appendChild(el)}
touchBind("left","ArrowLeft");touchBind("right","ArrowRight");touchBind("jump","Space");touchBind("down","ArrowDown");
renderWorlds();requestAnimationFrame(loop);
})();