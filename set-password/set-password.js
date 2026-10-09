(function(){
  'use strict';

  const SUPABASE_URL='https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
  const status=document.querySelector('#setup-status');
  const form=document.querySelector('#password-form');
  const error=document.querySelector('#form-error');
  const continueButton=document.querySelector('#password-link-confirm');

  const invalid=()=>{
    form.hidden=true;
    continueButton.hidden=true;
    status.textContent='This secure password-setup link is invalid or has expired. Please ask the research team to resend your setup email.';
  };

  function readyForPassword(client,session){
    if(!session?.user?.id)return invalid();
    continueButton.hidden=true;
    status.textContent='Choose a password for future email-and-password sign in.';
    form.hidden=false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      error.textContent='';
      const password=form.elements.password.value;
      const confirmation=form.elements.confirmation.value;
      if(password.length<12||password.length>64){
        error.textContent='Password must be 12–64 characters.';
        return;
      }
      if(password!==confirmation){
        error.textContent='Passwords do not match.';
        return;
      }
      const button=form.querySelector('button');
      button.disabled=true;
      let updateError;
      try {
        ({error:updateError}=await client.auth.updateUser({password}));
      }catch {
        updateError=new Error('Could not reach the password service');
      }
      if(updateError){
        button.disabled=false;
        error.textContent='We could not save your password. Please try again, or contact the research team.';
        return;
      }
      form.reset();
      form.hidden=true;
      try {
        const [{data:observerAccount},{data:participant},{data:profile}]=await Promise.all([
          client.from('research_observer_accounts').select('observer_id').eq('auth_user_id',session.user.id).eq('active',true).maybeSingle(),
          client.from('participants').select('id,active,case_id,is_test,qa_game_access_enabled').eq('auth_user_id',session.user.id).maybeSingle(),
          client.from('profiles').select('role,active').eq('id',session.user.id).maybeSingle()
        ]);
        if(observerAccount?.observer_id){
          status.textContent='Password created. Opening your Observer Account…';
          setTimeout(()=>location.replace('/observer/'),900);
          return;
        }
        if(profile?.role==='coach'||profile?.role==='research_admin'){
          status.textContent='Password created. Opening your Coaching Dashboard…';
          setTimeout(()=>location.replace('/coach-dashboard/'),900);
          return;
        }
        if(participant && participant.active!==true &&
            !(participant.is_test===true && participant.qa_game_access_enabled===true)){
          status.textContent='Password created. You are ready for your Mission: Reinforceable orientation. Study missions will stay locked until the research team starts your intervention.';
          return;
        }
        status.textContent='Password created. Opening Mission: Reinforceable…';
        setTimeout(()=>location.replace('/game/'),900);
      }catch{
        status.textContent='Password created successfully. You can now use your email and password at Mission: Reinforceable Teacher Login.';
      }
    });
  }

  async function start(){
    if(!window.supabase)return invalid();
    const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{detectSessionInUrl:true}});
    const search=new URLSearchParams(location.search);
    const fragment=new URLSearchParams(location.hash.slice(1));
    // A custom invitation URL never opens the Supabase /verify endpoint.
    // Email scanners can visit this static page harmlessly. Only an actual
    // click on the button sends verifyOtp to Supabase over POST.
    const tokenHash=fragment.get('token_hash')||search.get('token_hash');
    if(tokenHash!==null){
      if(!/^[A-Za-z0-9_-]{32,256}$/.test(tokenHash) ||
          (fragment.get('type')||search.get('type'))!=='recovery')return invalid();
      status.textContent='Your secure setup link is ready. Select Continue to verify it and create your password.';
      continueButton.hidden=false;
      continueButton.addEventListener('click',async()=>{
        continueButton.disabled=true;
        status.textContent='Verifying your secure link…';
        try {
          const {data,error:verifyError}=await client.auth.verifyOtp({token_hash:tokenHash,type:'recovery'});
          if(verifyError || !data?.session)return invalid();
          // Clear the recovery hash before the user enters their password.
          history.replaceState(null,'',location.pathname);
          readyForPassword(client,data.session);
        }catch{
          invalid();
        }
      },{once:true});
      return;
    }
    // Backward compatibility for already-generated Supabase recovery URLs.
    try{
      const code=search.get('code');
      if(code){
        const {error:exchangeError}=await client.auth.exchangeCodeForSession(code);
        if(exchangeError)return invalid();
      }
      const {data:{session}}=await client.auth.getSession();
      if(!session)return invalid();
      readyForPassword(client,session);
    }catch{
      invalid();
    }
  }
  start();
})();
