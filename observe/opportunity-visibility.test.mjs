import test from "node:test";
import assert from "node:assert/strict";
import { revealTrainingOpportunity } from "./opportunity-visibility.mjs";

function setup({overflowY="auto",scrollHeight=1100,clientHeight=300,scrollTop=150,top=100,entryTop=690,found=true}={}){
  const calls={focus:0,scrollIntoView:0,options:null};
  const entry={
    getBoundingClientRect(){return {top:entryTop}},
    querySelector(selector){
      if(selector!==".fidelity-choice")return null;
      return {focus(opts){calls.focus++;calls.options=opts}};
    },
    scrollIntoView(opts){calls.scrollIntoView++;calls.scrollOpts=opts}
  };
  const row={
    dataset:{trainingTargetId:"nora_01"},
    querySelector(selector){return selector===".training-opportunity-entry"?entry:null}
  };
  const list={
    scrollHeight,clientHeight,scrollTop,
    ownerDocument:{defaultView:{getComputedStyle(){return {overflowY}}}},
    querySelectorAll(selector){return found&&selector==="[data-training-target-id]"?[row]:[]},
    getBoundingClientRect(){return {top}}
  };
  return {list,calls};
}

test("Desktop: add opportunity scrolls the fidelity panel to its new scoring buttons",()=>{
 const {list,calls}=setup();
 assert.equal(revealTrainingOpportunity(list,"nora_01"),true);
 assert.equal(list.scrollTop,728);
 assert.equal(calls.scrollIntoView,0,"must not scroll the whole page on desktop");
 assert.equal(calls.focus,1);
 assert.deepEqual(calls.options,{preventScroll:true});
});

test("Desktop: deep opportunity clamps at the end of the internal list",()=>{
 const {list,calls}=setup({scrollHeight:780,clientHeight:300,scrollTop:450,entryTop:1250});
 assert.equal(revealTrainingOpportunity(list,"nora_01"),true);
 assert.equal(list.scrollTop,480);
 assert.equal(calls.scrollIntoView,0);
});

test("Mobile: the training list scrolls with the page, so reveal the entry on screen",()=>{
 const {list,calls}=setup({overflowY:"visible",scrollHeight:1200,clientHeight:1200});
 assert.equal(revealTrainingOpportunity(list,"nora_01"),true);
 assert.equal(calls.scrollIntoView,1);
 assert.deepEqual(calls.scrollOpts,{behavior:"auto",block:"center",inline:"nearest"});
 assert.equal(calls.focus,1);
});

test("Missing or unrelated target does not move scroll or focus",()=>{
 const {list,calls}=setup({found:false});
 assert.equal(revealTrainingOpportunity(list,"nora_01"),false);
 assert.equal(list.scrollTop,150);
 assert.equal(calls.focus,0);
});
