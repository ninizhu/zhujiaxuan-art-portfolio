import { createViewerUI } from './viewer-ui.js';
const A='../assets/';
const VIDEO_BASE_URL=(window.INNER_CITY_MEDIA_CONFIG?.r2PublicBaseUrl||'').trim().replace(/\/+$/,'');
const works={mountains:{n:'01',place:'MOUNTAINS',title:'STONE IS THE ROOT OF CLOUD',video:'v3/stone-is-the-root-of-cloud.mp4',cover:'covers/stone-is-the-root-of-cloud-v3-cover.png',ratio:'16/9'},bus:{n:'02',place:'BUS STOP',title:'XIAO NAN',video:'v2/xiao-nan.mp4',cover:'covers/Xiao Nan-cover.jpg',ratio:'16/9'},banquet:{n:'03',place:'BANQUET HALL',title:'THE FLOCK',video:'v2/the-flock.mp4',cover:'covers/The Flock-cover.png',ratio:'9/16'},apartment:{n:'04',place:'APARTMENT 03',title:'ME',video:'me.mp4',cover:'covers/Me-cover.png',ratio:'16/9'},archive:{n:'05',place:'ARCHIVE',title:'IMAGE ARCHIVE'}};
const css=document.createElement('style');css.textContent=`.entry{position:fixed;z-index:4;left:7vw;top:25vh;width:310px;display:none}.entry.show{display:block}body.place-selected .copy{opacity:0;pointer-events:none}.legend{left:auto;right:4vw}.entry button{pointer-events:auto}.actions button{color:#e6e4db!important}@media(max-width:700px){.copy{top:13vh!important;left:5vw!important;width:min(88vw,340px)!important}.copy h1{font-size:clamp(34px,10vw,52px)!important}.actions{max-height:29vh!important;display:grid!important;grid-template-columns:1fr 1fr}.world-label{display:none!important}.entry{left:5vw;top:auto;bottom:5vh;width:90vw}}`;
css.textContent+=`.entry .work-description{max-height:min(25vh,220px);overflow:auto;margin:10px 0 12px;padding-right:5px;color:#c5ceca;font:10px/1.65 'DM Sans',sans-serif;letter-spacing:.01em;overscroll-behavior:contain}.entry .description-subtitle,.entry .description-paragraph{display:block}.entry .description-subtitle{margin-bottom:5px;color:#dfb776;font:10px 'DM Mono',monospace;letter-spacing:.08em}.entry .description-paragraph+.description-paragraph{margin-top:8px}.entry .work-description[hidden]{display:none}.entry.entry--bus{left:auto;right:7vw;top:14vh;width:min(320px,30vw)}.entry.entry--banquet{left:calc(7vw + 80px)}@media(max-width:700px){.entry .work-description{max-height:22vh;font-size:10px;line-height:1.55}.entry.entry--bus{left:auto;right:5vw;top:13vh;width:min(90vw,360px)}.entry.entry--banquet{left:5vw;top:auto;bottom:5vh;width:min(90vw,310px)}}`;
document.head.append(css);
const entry=document.createElement('aside');entry.className='entry';entry.innerHTML='<p class="eyebrow">SELECTED WORK</p><strong></strong><p class="work-description" hidden></p><br><button class="enter">ENTER THE WORK ↗</button>';document.body.append(entry);
const room = document.createElement('section');
room.className = 'workroom viewer';
room.inert = true;
room.setAttribute('role', 'dialog');
room.setAttribute('aria-modal', 'true');
room.setAttribute('aria-labelledby', 'viewer-title');
room.innerHTML = `
  <header class="viewer-bar">
    <div class="viewer-heading">
      <p class="viewer-brand"></p>
      <h2 id="viewer-title"></h2>
      <p class="eyebrow viewer-location"></p>
    </div>
    <button type="button" class="close">← Back to space</button>
  </header>
  <video playsinline preload="metadata"></video>
  <div class="controls" aria-label="Playback controls">
    <input class="seek" type="range" min="0" max="100" value="0" step="any" aria-label="Seek">
    <div class="control-row">
      <button type="button" class="play">Play</button>
      <div class="viewer-time"><span class="now">0:00</span><span aria-hidden="true"> / </span><span class="end">—</span></div>
      <span class="playback-state" role="status"></span>
      <button type="button" class="mute" aria-pressed="false">Mute</button>
      <input class="vol" type="range" min="0" max="100" value="100" aria-label="Volume">
      <button type="button" class="fs">Fullscreen</button>
    </div>
  </div>
  <div class="filters" aria-label="Exhibition categories"></div>
  <section class="exhibition-copy" aria-labelledby="exhibition-work-title" hidden>
    <h3 id="exhibition-work-title"></h3>
    <p class="exhibition-medium"></p>
    <p class="exhibition-status" hidden></p>
    <div class="exhibition-description"></div>
  </section>
  <div class="gallery"></div>`;
document.body.append(room);
const viewer = createViewerUI(room, entry);
let selected=null,mediaGeneration=0,dragging=false,metadataReady=false,activeMediaUrl='';
const descriptions={mountains:{subtitle:'Poem Notes',paragraphs:['“Clouds are born from stone; hence the name Yungen.” Poets of the Tang and Song dynasties referred to rocks as “cloud roots.”','In the story, stones and clouds symbolize a son and mother who are not related by blood. While searching for the secret behind his mother\'s blessing, the son accidentally kills another mother who is praying for her own child. The obsessions we pursue are ultimately destined to become illusions.']},bus:{paragraphs:['A late-night phone call on the last bus exposes the double suffocation experienced by a young woman living far from her hometown, trapped between workplace conditioning and the emotional constraints of her family.']},banquet:{paragraphs:['People imitate, follow, and move forward, only to find themselves returning to where they began. Unknowingly swept along by the crowd, we repeat the same decisions over and over again.']}};
descriptions.apartment = {
  subtitle: 'Experimental Short Film',
  paragraphs: ["On her birthday, Isabelle finds herself trapped between social expectations and her inner exhaustion. As the celebration unfolds, her forced smile gradually becomes a mask of suffocation. Through distorted expressions and shifting emotions, the film explores the fragile boundary between social performance and one's authentic self."]
};

const exhibitionCopy = {
  PHOTO: {
    title: 'BLACK & WHITE FILM PHOTOGRAPHY',
    medium: 'Analog Photography',
    paragraphs: ['A series of black-and-white film photographs exploring the relationship between the human body and urban space. Through veiled portraits, fragmented compositions, and architectural forms, the work examines visibility, concealment, and the subtle tension between individuals and their surroundings.']
  },
  ANIMATION: {
    title: 'CLAMOR',
    medium: 'Experimental Animation Concept',
    status: 'Concept Development — Screenplay, Storyboards & Atmospheric Studies',
    paragraphs: [
      ['Set in a surreal and distorted city, ', 'Clamor', ' explores how prolonged social pressure shapes collective behavior and individual identity. Through unsettling imagery, absurd rituals, and the gradual transformation of its protagonist, the work reflects on the tension between conformity and self-awareness.'],
      'Developed through a screenplay, storyboards, and atmospheric visual studies, the project uses experimental animation as a means of questioning the boundaries between the individual and the collective.'
    ]
  },
  'INSTALLATION ART': {
    title: 'FIVE HUNDRED METERS OF MIRRORINY',
    medium: 'Installation Art',
    paragraphs: ["Coal lies five hundred meters beneath our feet, yet the consequences of its extraction reach the surface. Through an installation inspired by mining-induced ground subsidence, the work makes invisible ecological damage tangible. It invites viewers to reflect on humanity's relationship with nature and our willingness to take part in its restoration."]
  }
};
const exhibition = room.querySelector('.exhibition-copy');

function showExhibitionCopy(category) {
  const item = exhibitionCopy[category];
  const title = exhibition.querySelector('h3');
  title.textContent = item.title;
  exhibition.querySelector('.exhibition-medium').textContent = item.medium;
  const status = exhibition.querySelector('.exhibition-status');
  status.textContent = item.status || '';
  status.hidden = !item.status;
  const paragraphs = item.paragraphs.map(text => {
    const paragraph = document.createElement('p');
    if (Array.isArray(text)) {
      const [before, name, after] = text;
      const emphasis = document.createElement('em');
      emphasis.textContent = name;
      paragraph.append(before, emphasis, after);
    } else {
      paragraph.textContent = text;
    }
    return paragraph;
  });
  exhibition.querySelector('.exhibition-description').replaceChildren(...paragraphs);
}
const descriptionEl=entry.querySelector('.work-description');let arrivedKey=null;
function setDescription(key,visible){const item=descriptions[key];descriptionEl.replaceChildren();if(!item||!visible){descriptionEl.hidden=true;return}if(item.subtitle){const subtitle=document.createElement('strong');subtitle.className='description-subtitle';subtitle.textContent=item.subtitle;descriptionEl.append(subtitle)}for(const paragraph of item.paragraphs){const p=document.createElement('span');p.className='description-paragraph';p.textContent=paragraph;descriptionEl.append(p)}descriptionEl.hidden=false}
document.addEventListener('innercity:scene-arrived',event=>{arrivedKey=event.detail?.key;if(arrivedKey===selected&&!room.classList.contains('open'))setDescription(selected,true)});
const video=room.querySelector('video'),seek=room.querySelector('.seek'),timeLabel=room.querySelector('.now'),durationLabel=room.querySelector('.end');
const videoFrame=document.createElement('div');videoFrame.className='video-frame';video.parentNode.insertBefore(videoFrame,video);videoFrame.append(video);
const coverLayer=document.createElement('img');coverLayer.className='work-cover';coverLayer.alt='';coverLayer.hidden=true;videoFrame.append(coverLayer);
function hideCover(){coverLayer.hidden=true}
video.addEventListener('play',hideCover);
seek.addEventListener('input',hideCover);
seek.disabled=true;
function mediaStatus(message,kind='status'){
  let el=room.querySelector('.media-status');
  if(!el){el=document.createElement('p');el.className='media-status';room.querySelector('.controls').after(el)}
  el.dataset.kind=kind;el.textContent=message;
}
function clearMediaStatus(){room.querySelector('.media-status')?.remove()}
function resetMediaUI(){
  dragging=false;metadataReady=false;seek.value='0';seek.disabled=true;
  timeLabel.textContent='0:00';durationLabel.textContent='—';
}
function unloadVideo(){
  video.pause();
  try{video.currentTime=0}catch{}
  video.removeAttribute('src');video.removeAttribute('poster');video.load();
  coverLayer.hidden=true;coverLayer.removeAttribute('src');
  activeMediaUrl='';resetMediaUI();
}
function currentGeneration(g,url){return g===mediaGeneration&&url===activeMediaUrl&&video.src===url&&(!video.currentSrc||video.currentSrc===url)}
function seekRanges(){
  const ranges=[];try{for(let i=0;i<video.seekable.length;i++)ranges.push([video.seekable.start(i),video.seekable.end(i)])}catch{}
  return ranges;
}
function updateSeekAvailability(g,url){
  if(!currentGeneration(g,url)||!metadataReady)return;
  const durationAvailable=Number.isFinite(video.duration)&&video.duration>0;
  seek.disabled=!durationAvailable;
  if(durationAvailable&&seekRanges().length===0)mediaStatus('Media timeline loaded; browser is still resolving seek ranges.');
  else if(room.querySelector('.media-status')?.dataset.kind==='status')clearMediaStatus();
}
function timeFromSlider(){
  if(!metadataReady||!Number.isFinite(video.duration)||video.duration<=0)return null;
  // An empty seekable list may be temporary while the browser resolves its
  // byte ranges. Finite metadata still provides a legal target on this timeline.
  const percent=Math.max(0,Math.min(100,Number(seek.value)||0));
  return video.duration*percent/100;
}
function commitSeek(){
  const target=timeFromSlider();
  if(target===null){mediaStatus(metadataReady?'Cannot seek: media duration is not available yet.':'Cannot seek yet: video metadata has not loaded.');return false}
  try{
    video.currentTime=target;
    timeLabel.textContent=fmt(target);
    return true;
  }catch(error){mediaStatus(`Seek failed: ${error.message||error}`,'error');return false}
}
const openWork=()=>{
  if(!selected)return;
  clearTimeout(idleTimer);
  setDescription(selected,false);
  const w=works[selected],g=++mediaGeneration;
  room.querySelector('.eyebrow').textContent=`${w.n} / ${w.place}`;
  room.querySelector('h2').textContent=w.title;
  room.querySelector('.filters').innerHTML='';room.querySelector('.gallery').innerHTML='';
  clearMediaStatus();unloadVideo();
  const archiveView=selected==='archive',videoControls=room.querySelector('.controls');
  room.querySelector('.viewer-brand').textContent = archiveView ? 'INNER CITY / EXHIBITION INDEX' : 'INNER CITY / CINEMA';
  room.classList.remove('controls-idle');
  exhibition.hidden = !archiveView;
  videoFrame.style.display=archiveView?'none':'block';
  videoControls.hidden=archiveView;videoControls.style.display=archiveView?'none':'';
  if(selected==='archive'){
    const data={PHOTO:['Photo1.jpg','Photo2.jpg','Photo3.jpg','Photo4.jpg','Photo5.jpg'],ANIMATION:['Animation1.jpg','Animation2.jpg','Animation3.jpg','Animation4.jpg','Animation5.jpg'],'INSTALLATION ART':['installation art1.JPG','installation art2.JPG']};
    room.querySelector('.filters').innerHTML=['PHOTO','ANIMATION','INSTALLATION ART'].map(x=>`<button data-cat="${x}">${x}</button>`).join('');
    const draw=cat=>{
      showExhibitionCopy(cat);
      room.querySelectorAll('[data-cat]').forEach(button => {
        const active = button.dataset.cat === cat;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      const items = data[cat].map((file, index) => ({
        src: `${A}images/${encodeURIComponent(file)}`,
        alt: `${cat} ${index + 1}`,
        caption: `${cat} ${String(index + 1).padStart(2, '0')}`
      }));
      const gallery = room.querySelector('.gallery');
      gallery.replaceChildren(...items.map((item, index) => {
        const figure = document.createElement('figure');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gallery-artwork';
        const img = new Image();
        img.src = item.src;
        img.alt = item.alt;
        img.loading = 'lazy';
        const caption = document.createElement('figcaption');
        caption.textContent = item.caption;
        button.append(img);
        button.setAttribute('aria-label', item.caption);
        button.onclick = () => viewer.openArtwork(items, index, button);
        figure.append(button, caption);
        return figure;
      }));
    };
    room.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>draw(b.dataset.cat));draw('PHOTO');
  }else{
    video.poster=new URL(`${A}${w.cover}`,document.baseURI).href;coverLayer.src=video.poster;coverLayer.hidden=false;video.style.aspectRatio=w.ratio;
    if(!VIDEO_BASE_URL){activeMediaUrl='';mediaStatus('Video delivery is awaiting the R2 public URL.')}else{
      const url=new URL(`${VIDEO_BASE_URL}/${w.video}`).href;activeMediaUrl=url;
    mediaStatus('Loading media…');
    const isCurrent=()=>currentGeneration(g,url);
    const refreshMetadata=()=>{
      if(!isCurrent()||video.readyState<1)return;
      metadataReady=Number.isFinite(video.duration)&&video.duration>0;
      durationLabel.textContent=metadataReady?fmt(video.duration):'—';
      if(metadataReady){timeLabel.textContent=fmt(video.currentTime);if(!dragging)seek.value=String(video.currentTime/video.duration*100)}
      updateSeekAvailability(g,url);
    };
    video.onloadedmetadata=()=>{
      if(!isCurrent())return;
      refreshMetadata();
    };
    video.ondurationchange=refreshMetadata;
    video.onloadeddata=()=>{if(isCurrent())clearMediaStatus()};
    video.onprogress=()=>updateSeekAvailability(g,url);
    video.oncanplay=()=>{refreshMetadata();updateSeekAvailability(g,url)};
    video.ontimeupdate=()=>{
      if(!isCurrent()||dragging)return;
      timeLabel.textContent=fmt(video.currentTime);
      if(metadataReady&&video.duration>0)seek.value=String(video.currentTime/video.duration*100);
    };
    video.onseeking=()=>{if(isCurrent())timeLabel.textContent=fmt(video.currentTime)};
    video.onseeked=()=>{
      if(!isCurrent())return;
      if(!dragging){timeLabel.textContent=fmt(video.currentTime);if(video.duration>0)seek.value=String(video.currentTime/video.duration*100)}
    };
    video.onerror=()=>{
      if(!isCurrent())return;
      const code=video.error?.code??'unknown',message=video.error?.message||'No browser detail';
      mediaStatus(`Media load failed (${code}): ${message} — ${video.currentSrc||url}`,'error');
    };
    // Register source-specific handlers before src/load to avoid missing early events.
    video.src=url;video.load();
    }
  }
  viewer.open(archiveView ? 'exhibition' : 'cinema');
  updatePlayback();
};
function fmt(t){return Number.isFinite(t)?`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`:'0:00'}
entry.querySelector('.enter').onclick=openWork;
function closeWork() {
  if (!room.classList.contains('open')) return;
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  mediaGeneration++;unloadVideo();clearMediaStatus();
  clearTimeout(idleTimer);
  viewer.close();
  if(arrivedKey===selected)setDescription(selected,true);
}
room.querySelector('.close').onclick = closeWork;

const play = room.querySelector('.play'), mute = room.querySelector('.mute');
const volume = room.querySelector('.vol'), fs = room.querySelector('.fs');
let idleTimer;

function wakeControls() {
  clearTimeout(idleTimer);
  room.classList.remove('controls-idle');
  if (!video.paused && !video.ended && room.dataset.mode === 'cinema') {
    idleTimer = setTimeout(() => {
      if (!room.querySelector('.controls :focus-visible') && !dragging) room.classList.add('controls-idle');
    }, 2500);
  }
}

function updatePlayback() {
  const ended = video.ended, playing = !video.paused && !ended;
  play.textContent = ended ? 'Replay' : playing ? 'Pause' : 'Play';
  room.querySelector('.playback-state').textContent = ended ? 'Ended' : playing ? 'Playing' :
    video.currentTime > 0 ? 'Paused' : 'Ready';
  wakeControls();
}

function togglePlayback() {
  if (!activeMediaUrl) return;
  if (video.paused || video.ended) {
    const generation = mediaGeneration, url = activeMediaUrl;
    if (video.ended) video.currentTime = 0;
    video.play().catch(error => {
      if (currentGeneration(generation, url)) mediaStatus(`Playback failed: ${error.message || error}`, 'error');
    });
  } else {
    video.pause();
  }
}
function toggleMute() {
  const silent = video.muted || video.volume === 0;
  if (silent && video.volume === 0) video.volume = .5;
  video.muted = !silent;
}
function syncVolume() {
  volume.value = String(Math.round(video.volume * 100));
  const silent = video.muted || video.volume === 0;
  mute.textContent = silent ? 'Unmute' : 'Mute';
  mute.setAttribute('aria-pressed', String(silent));
}
play.onclick = togglePlayback;
mute.onclick = toggleMute;
volume.oninput = () => {
  video.volume = Number(volume.value) / 100;
  if (video.volume > 0) video.muted = false;
};
fs.onclick = () => viewer.fullscreen(room);
function syncFullscreen() {
  fs.textContent = viewer.fullscreenLabel(room);
  wakeControls();
}
document.addEventListener('fullscreenchange', syncFullscreen);
room.addEventListener('innercity:fullscreen-change', syncFullscreen);
for (const type of ['play', 'pause', 'ended', 'emptied']) video.addEventListener(type, updatePlayback);
video.addEventListener('volumechange', syncVolume);
for (const type of ['pointermove', 'pointerdown', 'focusin', 'focusout']) room.addEventListener(type, wakeControls);
videoFrame.addEventListener('dblclick', () => viewer.fullscreen(room));
viewer.connect(closeWork, event => {
  switch (event.key.toLowerCase()) {
    case ' ':
      togglePlayback();
      break;
    case 'arrowleft':
    case 'arrowright':
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const offset = event.key === 'ArrowLeft' ? -5 : 5;
        seek.value = String(Math.max(0, Math.min(video.duration, video.currentTime + offset)) / video.duration * 100);
        hideCover();
        commitSeek();
      }
      break;
    case 'm':
      toggleMute();
      break;
    case 'f':
      viewer.fullscreen(room);
      break;
    default:
      return;
  }
  event.preventDefault();
  wakeControls();
});
syncVolume();
seek.addEventListener('pointerdown',()=>{if(!seek.disabled)dragging=true});
seek.addEventListener('input',commitSeek);
seek.addEventListener('change',()=>{commitSeek();dragging=false});
seek.addEventListener('pointerup',()=>{commitSeek();dragging=false});
seek.addEventListener('pointercancel',()=>{dragging=false});
document.querySelectorAll('[data-location],.world-label').forEach(el=>el.addEventListener('click',()=>{const key=el.dataset.location||el.id.replace('label-','');selected=key;arrivedKey=null;entry.classList.remove('entry--bus','entry--banquet');if(key==='bus')entry.classList.add('entry--bus');if(key==='banquet')entry.classList.add('entry--banquet');setDescription(key,false);const w=works[key];if(w){entry.querySelector('strong').textContent=`${w.n} — ${w.place} / ${w.title}`;entry.classList.add('show');document.body.classList.add('place-selected')}}));document.querySelector('#overview').addEventListener('click',()=>{arrivedKey=null;setDescription(selected,false);entry.classList.remove('entry--bus','entry--banquet','show');document.body.classList.remove('place-selected')});

const workIndex=document.querySelector('#workIndex'),indexTrigger=document.querySelector('#viewAllWorks'),indexClose=document.querySelector('#closeWorkIndex');
function closeWorkIndex(){workIndex.classList.remove('open');workIndex.setAttribute('aria-hidden','true');workIndex.inert=true;indexTrigger.focus()}
indexTrigger.addEventListener('click',()=>{workIndex.inert=false;workIndex.setAttribute('aria-hidden','false');workIndex.classList.add('open');indexClose.focus()});
indexClose.addEventListener('click',closeWorkIndex);
workIndex.addEventListener('click',e=>{if(e.target===workIndex)closeWorkIndex()});
workIndex.querySelectorAll('[data-work-index]').forEach(item=>item.addEventListener('click',()=>{const key=item.dataset.workIndex;closeWorkIndex();const destination=Array.from(document.querySelectorAll('[data-location]')).find(button=>button.dataset.location===key);if(destination){destination.click();entry.querySelector('.enter').click()}}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&workIndex.classList.contains('open'))closeWorkIndex()});
