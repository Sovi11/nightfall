const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=fs.existsSync(require('node:path').join(__dirname,'../lyric-core.js'))?require('../lyric-core.js'):{};

test('LRC supports repeated timestamps, metadata, and file offset',()=>{
  assert.equal(typeof core.parseLyrics,'function');
  const p=core.parseLyrics('[ar:Original test]\n[offset:500]\n[00:02.00][00:04.50]A test line\n[00:01.20]Another line');
  assert.equal(p.synced,true);
  assert.deepEqual(p.lines,[{time:1.7,text:'Another line'},{time:2.5,text:'A test line'},{time:5,text:'A test line'}]);
});
test('line selection follows backward seeks, boundaries, and timing adjustment',()=>{
  assert.equal(typeof core.activeLine,'function');
  const lines=[{time:2},{time:4},{time:9}];
  assert.equal(core.activeLine(lines,0,0),-1);
  assert.equal(core.activeLine(lines,4,0),1);
  assert.equal(core.activeLine(lines,3.5,.5),1);
  assert.equal(core.activeLine(lines,2,0),0);
  assert.equal(core.activeLine([],50,0),-1);
});
test('plain text remains manually advanceable and markup remains text',()=>{
  assert.equal(typeof core.parseLyrics,'function');
  const p=core.parseLyrics('One original line\n\n<img src=x onerror=alert(1)>');
  assert.equal(p.synced,false);
  assert.deepEqual(p.lines.map(l=>l.text),['One original line','<img src=x onerror=alert(1)>']);
});
