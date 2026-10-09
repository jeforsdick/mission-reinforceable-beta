'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const {passwordSetupLandingLink}=require('../server/password-setup-link');
const AUTH='https://vyiwwwmcoahwkgiictmc.supabase.co';
const SETUP='https://www.missionreinforceable.com/set-password/';
const TOKEN='a'.repeat(64);
const generate=(token=TOKEN)=>({
  action_link:AUTH+'/auth/v1/verify?token='+token+
    '&type=recovery&redirect_to='+encodeURIComponent(SETUP),
  hashed_token:token
});

test('recovery email opens our static setup page, not the one-use verification URL',()=>{
  const link=passwordSetupLandingLink(generate(),SETUP,AUTH);
  const url=new URL(link);
  assert.equal(url.origin,'https://www.missionreinforceable.com');
  assert.equal(url.pathname,'/set-password/');
  assert.equal(url.search,'');
  assert.equal(url.hash,'#token_hash='+TOKEN+'&type=recovery');
  assert.doesNotMatch(link,/auth\/v1\/verify/);
});

test('wrong origin, token mismatch, and non-recovery links are rejected',()=>{
  assert.throws(()=>passwordSetupLandingLink(
    {...generate(),action_link:generate().action_link.replace('vyiwwwmcoahwkgiictmc.supabase.co','evil.example')},
    SETUP,AUTH));
  assert.throws(()=>passwordSetupLandingLink({...generate(),hashed_token:'b'.repeat(64)},SETUP,AUTH));
  assert.throws(()=>passwordSetupLandingLink(
    {...generate(),action_link:generate().action_link.replace('type=recovery','type=invite')},
    SETUP,AUTH));
});

const controller=fs.readFileSync(path.join(__dirname,'..','set-password','set-password.js'),'utf8');

function mockPage(verifyOutcome={data:{session:{user:{id:'test-user'}}},error:null}){
  const elements={};
  const listeners={};
  for(const id of ['#setup-status','#password-form','#form-error','#password-link-confirm']){
    elements[id]={hidden:id!=='#setup-status'&&id!=='#form-error',textContent:'',disabled:false,addEventListener:(event,fn)=>{listeners[id+':'+event]=fn;}};
  }
  elements['#password-form'].querySelector=()=>({disabled:false});
  let verifyCalls=0;
  const client={
    auth:{
      verifyOtp:async args=>{verifyCalls++;assert.equal(args.token_hash,TOKEN);assert.equal(args.type,'recovery');return verifyOutcome;},
      getSession:async()=>({data:{session:null}}),
      exchangeCodeForSession:async()=>({error:null}),
      updateUser:async()=>({error:null})
    }
  };
  const sandbox={
    window:{supabase:{createClient:()=>client}},
    document:{querySelector:id=>elements[id]},
    location:{hash:'#token_hash='+TOKEN+'&type=recovery',search:'',pathname:'/set-password/',replace:()=>{}},
    history:{replaceState:()=>{}},
    URLSearchParams,
    setTimeout
  };
  vm.runInNewContext(controller,sandbox);
  return {elements,listeners,verifyCalls:()=>verifyCalls};
}

test('email-scanner page load does not consume the one-time token',async()=>{
  const page=mockPage();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(page.verifyCalls(),0);
  assert.equal(page.elements['#password-link-confirm'].hidden,false);
  assert.equal(page.elements['#password-form'].hidden,true);
});

test('only clicking Continue verifies recovery token and exposes password form',async()=>{
  const page=mockPage();
  await new Promise(resolve=>setImmediate(resolve));
  await page.listeners['#password-link-confirm:click']();
  assert.equal(page.verifyCalls(),1);
  assert.equal(page.elements['#password-form'].hidden,false);
});

test('expired token keeps password form locked and explains next step',async()=>{
  const page=mockPage({data:{session:null},error:{message:'expired'}});
  await new Promise(resolve=>setImmediate(resolve));
  await page.listeners['#password-link-confirm:click']();
  assert.equal(page.verifyCalls(),1);
  assert.equal(page.elements['#password-form'].hidden,true);
  assert.match(page.elements['#setup-status'].textContent,/ask the research team to resend/);
});
