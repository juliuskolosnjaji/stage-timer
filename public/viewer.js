const screens=document.querySelector('#screens'),connection=document.querySelector('#connection');
const format=value=>{const sign=value<0?'−':'';value=Math.ceil(Math.abs(value));return sign+[Math.floor(value/3600),Math.floor(value/60)%60,value%60].map(part=>String(part).padStart(2,'0')).join(':');};
function draw(state){
 const key=state.screens.map(screen=>`${screen.id}:${screen.name}:${screen.icon}`).join('|');
 if(screens.dataset.key!==key){
  screens.replaceChildren(...state.screens.map(screen=>{const link=document.createElement('a');link.href='/display?screen='+encodeURIComponent(screen.id);link.target='_blank';link.dataset.screen=screen.id;const icon=document.createElement('b'),info=document.createElement('div'),name=document.createElement('h2'),status=document.createElement('span'),time=document.createElement('strong'),open=document.createElement('i');icon.className='icon';icon.textContent=screen.icon;name.textContent=screen.name;status.className='status';time.className='time';open.textContent='Ausgabe öffnen ↗';info.append(name,status);link.append(icon,info,time,open);return link;}));
  screens.dataset.key=key;
 }
 for(const screen of state.screens){const card=screens.querySelector(`[data-screen="${CSS.escape(screen.id)}"]`),status=card.querySelector('.status');card.classList.toggle('running',screen.running);card.querySelector('.time').textContent=format(screen.remaining);status.textContent=screen.running?'Läuft':screen.scheduleAt?'Geplant · '+new Date(screen.scheduleAt).toLocaleString('de-DE'):'Bereit';}
}
const events=new EventSource('/events');events.onmessage=event=>{connection.textContent='● Verbunden';connection.className='online';draw(JSON.parse(event.data));};events.onerror=()=>{connection.textContent='● Verbindung unterbrochen';connection.className='';};
