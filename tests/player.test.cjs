const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=fs.existsSync(path.join(__dirname,'../player-core.js'))?require('../player-core.js'):{};
test('YouTube identity and referrer policy are set before iframe navigation',()=>{
  assert.equal(typeof core.createYouTubeFrame,'function');
  const writes=[],frame={setAttribute(k,v){writes.push([k,v]);this[k]=v},set src(v){writes.push(['src',v]);this.url=v}};
  const doc={createElement(tag){assert.equal(tag,'iframe');return frame}};
  core.createYouTubeFrame(doc,'4NRXx6U8ABQ','Test video','https://sovi11.github.io','https://sovi11.github.io/nightfall/');
  const policy=writes.findIndex(w=>w[0]==='referrerpolicy'),navigation=writes.findIndex(w=>w[0]==='src');
  assert.ok(policy>=0&&policy<navigation);
  assert.equal(frame.referrerpolicy,'strict-origin-when-cross-origin');
  const url=new URL(frame.url);assert.equal(url.searchParams.get('origin'),'https://sovi11.github.io');assert.equal(url.searchParams.get('enablejsapi'),'1');
});
test('153 produces a referrer-specific explanation instead of a generic failure',()=>{
  assert.equal(typeof core.videoError,'function');
  assert.match(core.videoError(153),/browser|referrer/i);
  assert.match(core.videoError(101),/embedding|embedded/i);
});
