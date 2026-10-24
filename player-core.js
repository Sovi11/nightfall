(function(root){
  function createYouTubeFrame(doc,videoId,title,origin,pageUrl){
    const frame=doc.createElement('iframe');
    frame.setAttribute('id','ytFrame');frame.setAttribute('title',title+' — YouTube player');
    frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
    frame.setAttribute('allowfullscreen','');frame.setAttribute('width','640');frame.setAttribute('height','360');
    const params=new URLSearchParams({enablejsapi:'1',playsinline:'1',rel:'0',origin,widget_referrer:pageUrl});
    frame.src='https://www.youtube.com/embed/'+encodeURIComponent(videoId)+'?'+params;
    return frame;
  }
  function videoError(code){
    if(Number(code)===153)return'Error 153: YouTube cannot identify this browser’s referrer. Open this site in regular Chrome or Safari. If playback is still blocked, open the song on YouTube and use the manual lyric clock here.';
    if([101,150].includes(Number(code)))return'YouTube is refusing embedded playback for this video here. Try Lyric video, or open the song on YouTube.';
    if(Number(code)===100)return'This video is unavailable or private. Try Official video, or open the song on YouTube.';
    return'YouTube playback failed'+(code?' (code '+code+')':'')+'. Retry the player, try Official video, or open the song on YouTube.';
  }
  const api={createYouTubeFrame,videoError};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NightfallPlayer=api;
})(typeof window==='undefined'?globalThis:window);
