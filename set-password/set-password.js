(function(){
  'use strict';
  const SUPABASE_URL='https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NDQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
  const status=document.querySelector('#setup-status'),form=document.querySelector('#password-form'),error=document.querySelector('#form-error');
  const invalid=()=>{form.hidden=true;status.textContent='This secure link is invalid or has expired. Please contact the research team for a new login email.';};
  async function start(){
    if(!window.supabase)return invalid();
    const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    try{
      const code=new URL(location.href).searchParams.get('code');
      if(code){const {error:exchangeError}=await client.auth.exchangeCodeForSession(code);if(exchangeError)return invalid();}
      const {data:{session}}=await client.auth.getSession();
      if(!session)return invalid();
      status.textContent='Choose a password for future email-and-password sign in.';form.hidden=false;
      form.addEventListener('submit',async event=>{
        event.preventDefault();error.textContent='';const password=form.password.value,confirmation=form.confirmation.value;
        if(password.length<12||password.length>64){error.textContent='Password must be 12–64 characters.';return;}
        if(password!==confirmation){error.textContent='Passwords do not match.';return;}
        const button=form.querySelector('button');button.disabled=true;
        const {error:updateError}=await client.auth.updateUser({password});
        if(updateError){button.disabled=false;invalid();return;}
        form.reset();form.hidden=true;status.textContent='Password created. Opening Mission: Reinforceable…';setTimeout(()=>location.replace('/game/'),900);
      });
    }catch{invalid();}
  }
  start();
})();
