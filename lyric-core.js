(function(root){
  function parseLyrics(raw){
    const offset=Number(raw.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0)/1000;
    const lines=[];
    for(const line of raw.split(/\r?\n/)){
      const stamps=[...line.matchAll(/\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g)];
      const text=line.replace(/\[[^\]]*\]/g,'').trim();
      for(const m of stamps)lines.push({time:Math.max(0,Number(m[1])*60+Number(m[2])+offset),text});
    }
    if(lines.length)return{synced:true,lines:lines.sort((a,b)=>a.time-b.time)};
    return{synced:false,lines:raw.split(/\r?\n/).map(text=>text.trim()).filter(text=>text&&!/^\[[^\]]*\]$/.test(text)).map(text=>({time:null,text}))};
  }
  function activeLine(lines,time,adjustment=0){
    let left=0,right=lines.length-1,result=-1;
    while(left<=right){const mid=(left+right)>>1;if(lines[mid].time<=time+adjustment){result=mid;left=mid+1}else right=mid-1}
    return result;
  }
  function calibrationOffset(lineTime,playbackTime){return Math.round((lineTime-playbackTime)*10)/10}
  const api={parseLyrics,activeLine,calibrationOffset};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NightfallLyrics=api;
})(typeof window==='undefined'?globalThis:window);
