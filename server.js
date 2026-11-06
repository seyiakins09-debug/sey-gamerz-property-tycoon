const express=require('express'); const http=require('http'); const {Server}=require('socket.io');
const app=express(), server=http.createServer(app), io=new Server(server); app.use(express.static('public'));
const rooms={};
const LAND={
 Rural:{price:1000000,landIncome:100000,constructionMultiplier:1,saleBonus:.05,rentRate:.01},
 Suburban:{price:3000000,landIncome:250000,constructionMultiplier:1.25,saleBonus:.10,rentRate:.015},
 Commercial:{price:4000000,landIncome:500000,constructionMultiplier:1.75,saleBonus:.20,rentRate:.02},
 Luxury:{price:10000000,landIncome:1000000,constructionMultiplier:2.5,saleBonus:.30,rentRate:.025}
};
const MATERIALS={block:500,cement:1000,iron:3000,sand:5000,roof:2000000,doors:300000,windows:300000,finishing:3000000};
const BLUEPRINTS={
 'Bungalow':{block:600,cement:250,iron:100,sand:30,roof:1,doors:1,windows:1,finishing:1},
 'Duplex':{block:1500,cement:600,iron:250,sand:75,roof:1,doors:2,windows:2,finishing:2},
 'Apartment Building':{block:5000,cement:2000,iron:800,sand:250,roof:2,doors:8,windows:8,finishing:4},
 'Luxury Mansion':{block:4000,cement:1800,iron:700,sand:200,roof:2,doors:5,windows:6,finishing:4},
 'Hotel':{block:12000,cement:5000,iron:2500,sand:700,roof:5,doors:30,windows:30,finishing:15},
 'Shopping Mall':{block:20000,cement:8000,iron:4000,sand:1200,roof:8,doors:50,windows:60,finishing:25}
};
function code(){return Math.random().toString(36).slice(2,7).toUpperCase()}
function snapshot(room){return {key:room.key,host:room.host,players:Object.values(room.players).map(p=>({id:p.id,name:p.name,cash:p.cash,profit:p.profit||0,loss:p.loss||0,startCapital:p.startCapital,properties:p.properties,landIncomeTotal:p.landIncomeTotal,rentTotal:p.rentTotal,online:p.online!==false})),started:room.started,endsAt:room.endsAt,set:room.set,log:room.log.slice(-100),land:LAND,materials:MATERIALS,blueprints:BLUEPRINTS}}
function materialPrice(prop,material){return Math.round(MATERIALS[material]*(LAND[prop.district]?.constructionMultiplier||1))}
function saleValue(prop){return Math.floor((prop.investment||0)*(1+(LAND[prop.district]?.saleBonus||0)))}
function expireUnsoldProperties(room){for(const p of Object.values(room.players)){if(!p.properties.length)continue;const total=p.properties.reduce((sum,prop)=>sum+(prop.investment||0),0);p.loss=(p.loss||0)+total;const count=p.properties.length;p.properties=[];log(room,`${p.name} lost ${count} unsold property/properties at timer expiry. Original investment loss: ₦${total.toLocaleString()}.`);}}
function log(room,msg){room.log.push({time:new Date().toLocaleTimeString(),msg}); if(room.log.length>300)room.log.shift()}
function broadcast(room){io.to(room.key).emit('state',snapshot(room))}
function tick(){for(const room of Object.values(rooms)){if(!room.started)continue; const now=Date.now(); if(now>=room.endsAt){room.started=false;expireUnsoldProperties(room);log(room,`Set ${room.set} ended. Unsold properties were converted to losses.`);broadcast(room);continue;}
 if(now-room.lastLand>=60*1000){room.lastLand=now;for(const p of Object.values(room.players)){let inc=p.properties.reduce((s,x)=>s+x.landIncome,0);p.profit=(p.profit||0)+inc;p.landIncomeTotal+=inc;if(inc)log(room,`${p.name} received ₦${inc.toLocaleString()} land income.`)} }
 if(now-room.lastRent>=30*1000){room.lastRent=now;for(const p of Object.values(room.players)){let inc=p.properties.reduce((s,x)=>s+(x.completed?Math.floor(x.investment*x.rentRate):0),0);p.profit=(p.profit||0)+inc;p.rentTotal+=inc;if(inc)log(room,`${p.name} received ₦${inc.toLocaleString()} rental income.`)} }
 broadcast(room);}}
setInterval(tick,5000);
io.on('connection',socket=>{
 socket.on('createRoom',({name,capital})=>{const key=code();const room={key,host:socket.id,players:{},started:false,endsAt:null,set:1,lastLand:Date.now(),lastRent:Date.now(),log:[]};rooms[key]=room;socket.join(key);socket.emit('created',{key});log(room,`${name||'Host'} created the room.`);broadcast(room);});
 socket.on('joinRoom',({key,name,capital})=>{
  const room=rooms[(key||'').trim().toUpperCase()];
  if(!room)return socket.emit('errorMsg','Room key not found.');
  const cleanName=(name||'').trim().slice(0,24);
  if(!cleanName)return socket.emit('errorMsg','Enter your player name.');
  // A returning player is identified by the same room key + player name.
  // Their existing game record is moved to the new socket ID, not recreated.
  const existing=Object.values(room.players).find(p=>p.name.toLowerCase()===cleanName.toLowerCase());
  if(existing){
    if(existing.online!==false)return socket.emit('errorMsg','That player name is already connected to this room.');
    const oldId=existing.id;
    delete room.players[oldId];
    existing.id=socket.id; existing.online=true;
    room.players[socket.id]=existing;
    socket.data.roomKey=room.key; socket.data.playerId=socket.id;
    socket.join(room.key);
    socket.emit('joined',{key:room.key,rejoined:true,name:existing.name});
    log(room,`${existing.name} reconnected and restored their existing game.`);
    broadcast(room); return;
  }
  if(room.started)return socket.emit('errorMsg','This set has already started. Only players who previously joined can reconnect during a live set.');
  const cash=Number(capital);
  if(!Number.isFinite(cash)||cash<=0)return socket.emit('errorMsg','Enter a valid starting capital.');
  const p={id:socket.id,name:cleanName,cash,startCapital:cash,profit:0,loss:0,properties:[],landIncomeTotal:0,rentTotal:0,online:true};
  room.players[socket.id]=p; socket.data.roomKey=room.key; socket.data.playerId=socket.id; socket.join(room.key);
  socket.emit('joined',{key:room.key,rejoined:false,name:p.name});
  log(room,`${p.name} joined with ₦${cash.toLocaleString()}.`);broadcast(room);
 });
 socket.on('startSet',()=>{const room=Object.values(rooms).find(r=>r.host===socket.id);if(!room)return;room.started=true;room.endsAt=Date.now()+40*60*1000;room.lastLand=Date.now();room.lastRent=Date.now();log(room,`Set ${room.set} started — 40 minutes.`);broadcast(room);});
 socket.on('nextSet',()=>{const room=Object.values(rooms).find(r=>r.host===socket.id);if(!room)return;room.started=false;room.set++;room.endsAt=null;log(room,`Host opened Set ${room.set}. Players retain cash and properties.`);broadcast(room);});
 socket.on('buyLand',({district})=>{const room=rooms[socket.data.room]||Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p)return;const d=LAND[district];if(!room.started)return socket.emit('errorMsg','The host must start the set first.');if(!d)return;if(p.cash<d.price)return socket.emit('errorMsg','Not enough cash for this land.');p.cash-=d.price;p.properties.push({id:Date.now()+Math.random(),district,landPrice:d.price,landIncome:d.landIncome,type:null,materials:{},constructionCost:0,completed:false,plannedType:'Bungalow',investment:d.price,rentRate:d.rentRate,saleBonus:d.saleBonus,constructionMultiplier:d.constructionMultiplier});log(room,`${p.name} purchased ${district} land for ₦${d.price.toLocaleString()}.`);broadcast(room);});
 socket.on('buyMaterial',({propertyId,material,quantity})=>{const room=Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p||!room.started)return;const prop=p.properties.find(x=>String(x.id)===String(propertyId));const q=Math.floor(Number(quantity));if(!prop||prop.completed)return socket.emit('errorMsg','Invalid property or construction already completed.');const price=materialPrice(prop,material);if(!price||q<=0||q>100000)return socket.emit('errorMsg','Invalid material purchase.');const cost=price*q;if(p.cash<cost)return socket.emit('errorMsg','Not enough cash.');p.cash-=cost;prop.materials[material]=(prop.materials[material]||0)+q;prop.constructionCost+=cost;prop.investment+=cost;log(room,`${p.name} bought ${q} ${material} for ₦${cost.toLocaleString()}.`);broadcast(room);});
 socket.on('selectBlueprint',({propertyId,type})=>{const room=Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p||!room.started)return;const prop=p.properties.find(x=>String(x.id)===String(propertyId));if(!prop||prop.completed||!BLUEPRINTS[type])return;prop.plannedType=type;log(room,`${p.name} selected ${type} blueprint for ${prop.district} land.`);broadcast(room);});
 socket.on('buyRequiredMaterials',({propertyId})=>{const room=Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p||!room.started)return;const prop=p.properties.find(x=>String(x.id)===String(propertyId));const bp=prop&&BLUEPRINTS[prop.plannedType||'Bungalow'];if(!prop||prop.completed||!bp)return;const missing=Object.entries(bp).map(([m,q])=>[m,Math.max(0,q-(prop.materials[m]||0))]).filter(([,q])=>q>0);const cost=missing.reduce((sum,[m,q])=>sum+materialPrice(prop,m)*q,0);if(!missing.length)return socket.emit('errorMsg','You already have all required materials for this blueprint.');if(p.cash<cost)return socket.emit('errorMsg',`Not enough cash. Remaining materials cost ${cost.toLocaleString()}.`);p.cash-=cost;for(const [m,q] of missing){prop.materials[m]=(prop.materials[m]||0)+q;prop.constructionCost+=materialPrice(prop,m)*q;prop.investment+=materialPrice(prop,m)*q;}log(room,`${p.name} purchased all remaining materials for ${prop.plannedType} (${cost.toLocaleString()}).`);broadcast(room);});
 socket.on('build',({propertyId,type})=>{const room=Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p||!room.started)return;const prop=p.properties.find(x=>String(x.id)===String(propertyId));type=type||prop?.plannedType;const bp=BLUEPRINTS[type];if(!prop||prop.completed||!bp)return;const missing=Object.entries(bp).filter(([m,q])=>(prop.materials[m]||0)<q);if(missing.length)return socket.emit('errorMsg','Missing materials: '+missing.map(([m,q])=>`${m} ${q-(prop.materials[m]||0)}`).join(', '));prop.completed=true;prop.type=type;log(room,`${p.name} completed a ${type} in ${prop.district} District. Rental income begins.`);broadcast(room);});
 socket.on('sellProperty',({propertyId})=>{const room=Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p||!room.started)return;const i=p.properties.findIndex(x=>String(x.id)===String(propertyId));if(i<0)return;const prop=p.properties[i];const investment=Math.max(0,Math.floor(prop.investment||0));const payout=saleValue(prop);const saleProfit=Math.max(0,payout-investment);p.cash+=investment;p.profit=(p.profit||0)+saleProfit;p.properties.splice(i,1);log(room,`${p.name} sold ${prop.type||'undeveloped land'} for ₦${payout.toLocaleString()}: ₦${investment.toLocaleString()} original investment returned to Cash Balance and ₦${saleProfit.toLocaleString()} sale profit added to Profit.`);broadcast(room);});
 socket.on('convertProfit',({amount})=>{const room=Object.values(rooms).find(r=>r.players[socket.id]);const p=room&&room.players[socket.id];if(!room||!p)return;const requested=Math.floor(Number(amount));if(!Number.isFinite(requested)||requested<=0)return socket.emit('errorMsg','Enter a valid amount of profit to convert.');const available=Math.floor(p.profit||0);if(requested>available)return socket.emit('errorMsg',`You only have ${available.toLocaleString()} profit available.`);const penalty=Math.floor(requested*0.30);const cashReceived=requested-penalty;p.profit-=requested;p.cash+=cashReceived;p.loss=(p.loss||0)+penalty;log(room,`${p.name} converted ₦${requested.toLocaleString()} profit: received ₦${cashReceived.toLocaleString()} Cash Balance; ₦${penalty.toLocaleString()} conversion penalty recorded as Loss.`);broadcast(room);});
 socket.on('disconnect',()=>{for(const room of Object.values(rooms)){if(room.players[socket.id]){const p=room.players[socket.id];p.online=false;log(room,`${p.name} disconnected. Their progress is saved; they can rejoin with room key ${room.key} and the same player name.`);broadcast(room)}if(room.host===socket.id){room.host=null;log(room,'Host disconnected. Room remains open.')}}});
});
// Track room key per socket for compatibility
io.use((socket,next)=>{socket.data.room=null;next()});
const oldJoin=io; // room lookup is by player socket in action handlers
const port=process.env.PORT||3000;server.listen(port,()=>console.log('Property Tycoon running on '+port));
