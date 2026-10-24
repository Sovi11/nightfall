const $=s=>document.querySelector(s);
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{toast('Browser storage is full. This session still works, but changes may not be saved.')}}
let known=new Set(read('nightfall-known',[])),filter='all',active=0,yt=null,selectedVideo;
let source='youtube',localAudioUrl=null,playing=false,lyrics={synced:false,lines:[]},lineIndex=-1,manualLine=0,adjustment=0,lastDrawnLine=-999;
let audioCtx,audioAnalyser,audioNode,audioBins;
let lyricsRequest=null,lyricsGeneration=0,lookupBlockedUntil=0,lyricCredit='',lookupMessage='';
const lyricCache=new Map();
let companionOffset=0,companionStart=0,companionRunning=false,embedGeneration=0;
let localSignature='local';
const audio=$('#localSong');
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3800)}
function companionTime(){return companionOffset+(companionRunning?(performance.now()-companionStart)/1000:0)}
function time(){return source==='companion'?companionTime():source==='local'?audio.currentTime:yt?.getCurrentTime?.()||0}
function format(t){return Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0')}
function offsetKey(){return'nightfall-alignment-'+active+'-'+(source==='youtube'?selectedVideo:source==='local'?localSignature:'external')}
function restoreAlignment(){adjustment=Number(read(offsetKey(),0));$('#lyricOffset').value=adjustment;$('#offsetValue').textContent=adjustment.toFixed(1)+'s';lastDrawnLine=-999}
function setAlignment(value){adjustment=Math.max(-600,Math.min(600,Math.round(value*10)/10));$('#lyricOffset').value=adjustment;$('#offsetValue').textContent=adjustment.toFixed(1)+'s';save(offsetKey(),adjustment);lastDrawnLine=-999;drawLyrics()}
function seek(t){if(source==='companion'){companionOffset=Math.max(0,t);companionStart=performance.now()}else if(source==='local'){audio.currentTime=Math.max(0,Math.min(t,audio.duration||0))}else yt?.seekTo?.(Math.max(0,t),true)}
function render(){
  const q=$('#search').value.toLowerCase();$('#songs').replaceChildren();
  tracks.forEach((t,i)=>{
    if((filter==='essential'&&!t[3])||(filter==='learned'&&!known.has(i))||!(t[0]+' '+t[1]).toLowerCase().includes(q))return;
    const b=document.createElement('button');b.className='song';b.innerHTML=`<span class="cover" style="--c:${t[4]}">${t[1]==='After Hours'?'AH':t[1]==='Dawn FM'?'103.5':'XO'}</span><span class="meta"><strong>${t[0]}</strong><small>${t[1]}</small><span class="tag">${known.has(i)?'✓ LEARNED':t[3]?'START HERE · ESSENTIAL':'EXPAND YOUR ROTATION'}</span></span><span class="play">▶</span>`;b.onclick=()=>openSong(i);$('#songs').append(b);
  });
  if(!$('#songs').children.length)$('#songs').innerHTML='<p class="empty">No tracks here yet. Try another filter or search.</p>';
  $('#learnedCount').textContent=known.size+' / '+tracks.length;
}
function updateLearned(){ $('#markLearned').textContent=known.has(active)?'✓ Learned — mark for practice':'✓ I know this one' }
function destroyVideo(){embedGeneration++;if(yt){try{yt.destroy()}catch{}yt=null}$('#video').replaceChildren()}
function connectVideo(){
  if(!window.YT?.Player||yt||!$('#ytFrame')||source!=='youtube')return;
  const generation=embedGeneration;
  yt=new YT.Player('ytFrame',{events:{
    onReady:()=>{if(generation===embedGeneration)$('#playbackNotice').hidden=true},
    onStateChange:e=>{if(source==='youtube'&&generation===embedGeneration)playing=e.data===1},
    onError:e=>{if(generation!==embedGeneration)return;playing=false;$('#playbackError').textContent=NightfallPlayer.videoError(e.data);$('#playbackNotice').hidden=false;}
  }});
}
function embed(){
  audio.pause();source='youtube';playing=false;companionRunning=false;$('#startClock').textContent='▶ Start lyric clock';$('#player').classList.remove('local-source','companion-source');audio.hidden=true;$('#playbackNotice').hidden=true;
  destroyVideo();$('#youtubeLink').href='https://www.youtube.com/watch?v='+selectedVideo;
  const frame=NightfallPlayer.createYouTubeFrame(document,selectedVideo,tracks[active][0],location.origin,location.href);$('#video').append(frame);connectVideo();
  restoreAlignment();
}
function releaseAudio(){audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;if(localAudioUrl)URL.revokeObjectURL(localAudioUrl);localAudioUrl=null;$('#audioName').textContent='';$('#practiceAudio').value=''}
function openSong(i){
  lyricsGeneration++;lyricsRequest?.abort();lyricCredit='';lookupMessage='';$('#fetchLyrics').disabled=false;$('#fetchLyrics').textContent='↻ Find lyrics automatically';$('#lyricProvider').textContent='Lyrics provided by LRCLIB';
  active=(i+tracks.length)%tracks.length;releaseAudio();source='youtube';playing=false;companionOffset=0;companionRunning=false;$('#companionHelp').open=false;selectedVideo=lyricVideos[active]||tracks[active][2];
  $('#playingTitle').textContent=tracks[active][0];$('#songTip').textContent=tracks[active][5];updateLearned();
  $('#lyricInput').value=read('nightfall-lyrics-'+active,'');restoreAlignment();
  loadLyrics($('#lyricInput').value,false);$('#lyricFile').value='';
  if(!$('#player').open)$('#player').showModal();setMode(read('nightfall-mode','concert'));embed();if(!$('#lyricInput').value)lookupLyrics();
}
function stopSession(){lyricsGeneration++;lyricsRequest?.abort();playing=false;companionRunning=false;audio.pause();destroyVideo();releaseAudio();if(document.fullscreenElement=== $('#player'))document.exitFullscreen?.().catch(()=>{})}
$('#closePlayer').onclick=()=>{stopSession();$('#player').close()};$('#player').addEventListener('cancel',stopSession);
$('#start').onclick=()=>openSong(0);$('#previousSong').onclick=()=>openSong(active-1);$('#nextSong').onclick=()=>openSong(active+1);
$('#officialBtn').onclick=()=>{selectedVideo=tracks[active][2];embed()};
$('#lyricsBtn').onclick=()=>{if(lyricVideos[active]){selectedVideo=lyricVideos[active];embed()}else window.open('https://www.youtube.com/results?search_query='+encodeURIComponent('The Weeknd '+tracks[active][0]+' lyrics'),'_blank','noopener')};
$('#retryVideo').onclick=embed;
$('#copySite').onclick=async()=>{try{await navigator.clipboard.writeText('https://sovi11.github.io/nightfall/?v=4');toast('Site link copied. Paste it into Chrome or Safari.')}catch{toast('Open https://sovi11.github.io/nightfall/?v=4 in Chrome or Safari.')}};
function useCompanion(){yt?.pauseVideo?.();audio.pause();audio.hidden=true;source='companion';playing=false;companionRunning=false;companionOffset=0;$('#player').classList.remove('local-source');$('#player').classList.add('companion-source');$('#startClock').textContent='▶ Start lyric clock';$('#companionHelp').open=true;$('#playbackNotice').hidden=true;restoreAlignment()}
$('#useCompanion').onclick=()=>{useCompanion();window.open($('#youtubeLink').href,'_blank','noopener');toast('Play the song on YouTube, then start the lyric clock here at the same moment.')};
$('#startClock').onclick=()=>{if(source!=='companion')useCompanion();if(companionRunning){companionOffset=companionTime();companionRunning=false}else{companionStart=performance.now();companionRunning=true}playing=companionRunning;$('#startClock').textContent=companionRunning?'Ⅱ Pause lyric clock':'▶ Start lyric clock'};
$('#resetClock').onclick=()=>{if(source!=='companion')return;companionRunning=false;companionOffset=0;playing=false;$('#startClock').textContent='▶ Start lyric clock';lastDrawnLine=-999;drawLyrics()};
$('#clockBack').onclick=()=>{if(source==='companion')seek(time()-5)};$('#clockForward').onclick=()=>{if(source==='companion')seek(time()+5)};
$('#markLearned').onclick=()=>{known.has(active)?known.delete(active):known.add(active);save('nightfall-known',[...known]);updateLearned();render()};
$('#search').oninput=render;$('#planNav').onclick=()=>$('#plan').scrollIntoView();
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render()});

function setMode(mode){if(!['concert','karaoke','practice'].includes(mode))mode='concert';$('#player').dataset.mode=mode;document.querySelectorAll('.mode-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('#sceneLabel').textContent=mode==='karaoke'?'YOUR VOICE. CENTRE STAGE.':mode==='practice'?'LEARN IT BY HEART':'LIVE FROM YOUR ROOM';save('nightfall-mode',mode)}
document.querySelectorAll('.mode-switch button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#stageTheme').value=read('nightfall-theme','crimson');$('#player').dataset.theme=$('#stageTheme').value;
$('#stageTheme').onchange=e=>{$('#player').dataset.theme=e.target.value;save('nightfall-theme',e.target.value)};
let motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setMotion(){ $('#player').classList.toggle('no-motion',!motion);$('#motionBtn').textContent=motion?'Motion on':'Motion off';$('#motionBtn').setAttribute('aria-pressed',String(motion)) }setMotion();
$('#motionBtn').onclick=()=>{motion=!motion;setMotion()};$('#crowdBtn').onclick=()=>{const off=$('#player').classList.toggle('no-crowd');$('#crowdBtn').textContent=off?'Crowd off':'Crowd on';$('#crowdBtn').setAttribute('aria-pressed',String(!off))};
$('#fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('#player').requestFullscreen)await $('#player').requestFullscreen();else toast('Full screen isn’t available in this browser. Concert view already fills the screen on phones.')}catch{toast('Full screen isn’t available here. You can still use Concert and Karaoke modes.')}};

function loadLyrics(raw,persist=true){
  if(persist){lyricsGeneration++;lyricsRequest?.abort();lyricCredit='YOUR LYRICS';lookupMessage='';$('#fetchLyrics').disabled=false;$('#fetchLyrics').textContent='↻ Find lyrics automatically';$('#lyricProvider').textContent=raw?'Using your imported / pasted lyrics':'Lyrics provided by LRCLIB'}
  lyrics=NightfallLyrics.parseLyrics(raw);manualLine=0;lineIndex=-1;lastDrawnLine=-999;$('#lyricDisplay').replaceChildren();
  $('#syncLine').replaceChildren();lyrics.lines.forEach((line,i)=>{if(!line.text)return;const option=document.createElement('option');option.value=i;option.textContent=line.text;$('#syncLine').append(option)});$('#syncLine').disabled=!lyrics.synced;$('#matchLine').disabled=!lyrics.synced;
  $('#lyricsLoadState').textContent=lyrics.lines.length?`${lyrics.synced?'✓ Synced lyrics ready':'✓ Lyrics ready'} · ${lyrics.lines.length} lines`:'No lyrics loaded yet. Automatic lookup starts when you choose a song.';
  lyrics.lines.forEach((line,i)=>{const b=document.createElement('button');b.textContent=line.text||'♪';b.onclick=()=>{if(lyrics.synced)seek(line.time-adjustment);else manualLine=i;drawLyrics()};$('#lyricDisplay').append(b)});
  $('#prevLine').disabled=lyrics.synced||!lyrics.lines.length;$('#nextLine').disabled=lyrics.synced||!lyrics.lines.length;$('#lyricOffset').disabled=!lyrics.synced;
  if(persist){save('nightfall-lyrics-'+active,raw);$('#lyricInput').value=raw;toast(lyrics.lines.length?(lyrics.synced?'Synced lyrics ready. Press play.':'Lyrics ready. Use Next line as you sing.'):'Lyrics cleared. You can still use a lyric video.')}drawLyrics();
}
function drawLyrics(){
  if(!lyrics.lines.length){$('#lyricPrev').textContent='';$('#lyricCurrent').textContent=$('#player').dataset.mode==='karaoke'?'YOUR VOICE. YOUR SPOTLIGHT.':'THE NIGHT IS YOURS.';$('#lyricNext').textContent=lookupMessage||'Play the lyric video, or add your lyrics below.';$('#lyricStatus').textContent='LYRICS WHEN AVAILABLE · YOUR OWN LRC / TXT ALSO WORKS';return}
  lineIndex=lyrics.synced?NightfallLyrics.activeLine(lyrics.lines,time(),adjustment):manualLine;
  $('#lyricStatus').textContent=(lyrics.synced?(source==='companion'?(companionRunning?'MANUAL CLOCK RUNNING':'MANUAL CLOCK PAUSED'):playing?'FOLLOWING '+(source==='local'?'YOUR AUDIO':'YOUTUBE'):'LYRICS READY · WAITING FOR PLAYBACK'):'MANUAL LYRICS · USE NEXT LINE')+(lyricCredit?' · '+lyricCredit:'');
  if(lastDrawnLine===lineIndex)return;lastDrawnLine=lineIndex;
  $('#lyricPrev').textContent=lyrics.lines[lineIndex-1]?.text||'';$('#lyricCurrent').textContent=lineIndex<0?'GET READY TO SING…':lyrics.lines[lineIndex].text||'♪';$('#lyricNext').textContent=lyrics.lines[lineIndex+1]?.text||'';
  [...$('#lyricDisplay').children].forEach((b,i)=>{b.classList.toggle('current',i===lineIndex);if(i===lineIndex&&$('#player').dataset.mode==='practice')b.scrollIntoView({block:'nearest',behavior:motion?'smooth':'instant'})});
}
$('#lyricFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>500000){toast('Choose a lyric file under 500 KB.');return}try{loadLyrics(await f.text())}catch{toast('Could not read that lyric file. Try pasting the text.')}};
$('#applyLyrics').onclick=()=>loadLyrics($('#lyricInput').value);$('#clearLyrics').onclick=()=>{loadLyrics('');$('#lyricFile').value=''};
$('#prevLine').onclick=()=>{manualLine=Math.max(0,manualLine-1);drawLyrics()};$('#nextLine').onclick=()=>{manualLine=Math.min(lyrics.lines.length-1,manualLine+1);drawLyrics()};
$('#lyricOffset').oninput=e=>setAlignment(Number(e.target.value));
$('#lyricsEarlier').onclick=()=>setAlignment(adjustment+.5);$('#lyricsLater').onclick=()=>setAlignment(adjustment-.5);$('#resetAlignment').onclick=()=>setAlignment(0);
$('#matchLine').onclick=()=>{if(!playing){toast('Start playback first. For external YouTube, start the manual lyric clock here.');return}const line=lyrics.lines[Number($('#syncLine').value)];if(!line||line.time===null)return;setAlignment(NightfallLyrics.calibrationOffset(line.time,time()));toast('Aligned this line with the current audio. Saved for this recording.')};
$('#lyricSize').oninput=e=>$('#player').style.setProperty('--lyric-size',e.target.value+'px');
async function lookupLyrics(){
  lyricsRequest?.abort();const controller=new AbortController();lyricsRequest=controller;const generation=++lyricsGeneration,track=active;
  if(Date.now()<lookupBlockedUntil){lookupMessage='Lyrics service is busy. Try again shortly, or import your own.';return}
  $('#fetchLyrics').disabled=true;$('#fetchLyrics').textContent='Finding lyrics…';lookupMessage='Finding lyrics for your track…';$('#lyricsLoadState').textContent='Loading lyrics automatically…';
  const timeout=setTimeout(()=>controller.abort(),14000);
  try{
    let record=lyricCache.get(track);
    if(!record){const params=new URLSearchParams({artist_name:'The Weeknd',track_name:tracks[track][0].replaceAll('’',"'")});
      const response=await fetch('https://lrclib.net/api/get?'+params,{headers:{'Lrclib-Client':'Nightfall/2.0 (https://github.com/Sovi11/nightfall)'},signal:controller.signal});
      if(response.status===429||response.status===503){let seconds=Number(response.headers.get('Retry-After'));lookupBlockedUntil=Date.now()+(Number.isFinite(seconds)&&seconds>0?seconds:30)*1000;throw new Error('busy')}
      if(!response.ok)throw new Error('missing');record=await response.json();lyricCache.set(track,record);
    }
    if(generation!==lyricsGeneration||active!==track||!$('#player').open)return;
    const text=record.syncedLyrics||record.plainLyrics;if(!text)throw new Error('missing');lyricCredit='LRCLIB';lookupMessage='';loadLyrics(text,false);
    $('#lyricProvider').textContent='Lyrics via LRCLIB · timing may vary by recording';
  }catch(error){if(generation===lyricsGeneration){lookupMessage=error.message==='busy'?'Lyrics service is busy. Retry shortly, or import your own lyrics.':'Automatic lyrics unavailable. Retry lookup or use a lyric video.';$('#lyricProvider').textContent=lookupMessage;$('#lyricsLoadState').textContent=lookupMessage}}
  finally{clearTimeout(timeout);if(generation===lyricsGeneration){$('#fetchLyrics').disabled=false;$('#fetchLyrics').textContent='↻ Find lyrics automatically';drawLyrics()}}
}
$('#fetchLyrics').onclick=lookupLyrics;

audio.addEventListener('play',()=>{playing=true;source='local';yt?.pauseVideo?.();if(audioCtx?.state==='suspended')audioCtx.resume().catch(()=>{})});audio.addEventListener('pause',()=>{if(source==='local')playing=false});audio.addEventListener('ended',()=>{if(source==='local')playing=false});audio.addEventListener('error',()=>{if(source==='local'&&audio.getAttribute('src'))toast('This audio format could not play. Try MP3 or WAV.')});
$('#practiceAudio').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;playing=false;companionRunning=false;yt?.pauseVideo?.();audio.pause();source='local';localSignature=f.name+'-'+f.size+'-'+f.lastModified;restoreAlignment();$('#playbackNotice').hidden=true;$('#player').classList.remove('companion-source');
  if(localAudioUrl)URL.revokeObjectURL(localAudioUrl);localAudioUrl=URL.createObjectURL(f);audio.src=localAudioUrl;audio.hidden=false;$('#audioName').textContent=f.name;$('#player').classList.add('local-source');
  try{if(!audioCtx){audioCtx=new AudioContext();audioAnalyser=audioCtx.createAnalyser();audioAnalyser.fftSize=256;audioBins=new Uint8Array(audioAnalyser.frequencyBinCount);audioNode=audioCtx.createMediaElementSource(audio);audioNode.connect(audioAnalyser);audioAnalyser.connect(audioCtx.destination)}await audioCtx.resume()}catch{ /* Plain audio playback remains available if analysis is unsupported. */ }
  lastDrawnLine=-999;try{await audio.play()}catch{toast('Your audio is ready. Press play in the audio controls.')}
};

// Native artwork: slow moving spotlights, glitter and phone lights. No flashing or strobing.
const audience=$('#audience');for(let i=0;i<34;i++){const fan=document.createElement('span');fan.className='fan';fan.setAttribute('aria-hidden','true');fan.innerHTML='<i class="arm"></i><i class="arm right"></i>'+(i%3===0?'<i class="phone"></i>':'');audience.append(fan)}
const canvas=$('#glitter'),g=canvas.getContext('2d'),particles=Array.from({length:95},(_,i)=>({x:((i*73)%997)/997,y:((i*127)%991)/991,r:.5+(i%5)*.3,s:.4+(i%7)*.12}));let lastFrame=0;
function animate(ms){
  requestAnimationFrame(animate);if(!$('#player').open||document.hidden||ms-lastFrame<40)return;lastFrame=ms;
  const rect=$('#arena').getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height),ratio=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==w*ratio||canvas.height!==h*ratio){canvas.width=w*ratio;canvas.height=h*ratio}g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,w,h);
  let energy=0;if(source==='local'&&audioAnalyser&&playing){audioAnalyser.getByteFrequencyData(audioBins);energy=audioBins.reduce((a,v)=>a+v,0)/audioBins.length/255}
  $('#visualStatus').textContent=source==='local'?'AUDIO-REACTIVE LIGHTS':source==='companion'?'EXTERNAL YOUTUBE · MANUAL LYRIC CLOCK':'AMBIENT LIGHT SHOW';
  const colors=$('#player').dataset.theme==='gold'?'255,213,133':$('#player').dataset.theme==='violet'?'207,169,255':'255,156,189';
  for(const p of particles){const t=motion?ms/1000:0;const x=(p.x*w+Math.sin(t*.14+p.y*12)*12),y=(p.y*h+(motion?t*p.s*3:0))%h;const alpha=.2+(motion?(Math.sin(t*p.s+p.x*20)+1)*.22:.3)+energy*.15;g.fillStyle=`rgba(${colors},${Math.min(.85,alpha)})`;g.shadowColor=`rgba(${colors},.7)`;g.shadowBlur=6+energy*8;g.beginPath();g.arc(x,y,p.r+energy,0,Math.PI*2);g.fill();if(p.r>1.4){g.fillRect(x-4,y-.4,8,.8);g.fillRect(x-.4,y-4,.8,8)}}
  $('#clock').textContent=format(time());drawLyrics();
}requestAnimationFrame(animate);

const plan=[['The big three','Blinding Lights · Starboy · The Hills'],['Find your chorus','Save Your Tears · Can’t Feel My Face'],['Slow it down','Die For You · Call Out My Name'],['Into the night','After Hours · In Your Eyes'],['Starboy deep dive','I Feel It Coming · Reminder'],['Tune to Dawn FM','Take My Breath · Sacrifice · Out of Time'],['The newer rotation','Popular · Timeless · São Paulo'],['Recognition round','Shuffle your rotation. Name each song in 10 seconds.'],['Sing without looking','Revisit every track you haven’t marked learned.'],['Your dress rehearsal','Dim the lights. Play your essentials. Sing it all back.']];let done=read('nightfall-days',[]);
plan.forEach((p,i)=>{const l=document.createElement('label');l.className='day';l.innerHTML=`<input type="checkbox" ${done.includes(i)?'checked':''}><span>${String(i+1).padStart(2,'0')}</span><div><strong>${p[0]}</strong><small>${p[1]}</small></div>`;l.querySelector('input').onchange=e=>{done=e.target.checked?[...new Set([...done,i])]:done.filter(x=>x!==i);save('nightfall-days',done)};$('#planDays').append(l)});
$('#concertDate').value=localStorage.getItem('nightfall-date')||'2026-11-06';function countdown(){const n=Math.ceil((new Date($('#concertDate').value+'T00:00:00+08:00')-Date.now())/86400000);$('#days').textContent=Number.isFinite(n)?Math.max(0,n):'—'}$('#concertDate').onchange=()=>{localStorage.setItem('nightfall-date',$('#concertDate').value);countdown()};countdown();render();
window.onYouTubeIframeAPIReady=connectVideo;const ys=document.createElement('script');ys.src='https://www.youtube.com/iframe_api';document.head.append(ys);
document.addEventListener('keydown',e=>{if(!$('#player').open||/INPUT|TEXTAREA|SELECT|BUTTON|AUDIO/.test(e.target.tagName))return;if(e.code==='Space'&&source==='local'){e.preventDefault();audio.paused?audio.play().catch(()=>{}):audio.pause()}if(!lyrics.synced&&lyrics.lines.length&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();manualLine=Math.max(0,Math.min(lyrics.lines.length-1,manualLine+(e.key==='ArrowRight'?1:-1)));drawLyrics()}});
window.addEventListener('beforeunload',()=>{audio.pause();if(localAudioUrl)URL.revokeObjectURL(localAudioUrl);audioCtx?.close()});
