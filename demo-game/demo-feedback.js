(function(){
  'use strict';
  function activeScreen(){
    const active=document.querySelector('.screen.is-active');
    return active?.id || 'unknown';
  }
  function setOpen(open){
    const modal=document.querySelector('#demo-feedback-modal');
    if(!modal)return;
    modal.hidden=!open;
    if(open){
      window.requestAnimationFrame(()=>document.querySelector('#demo-feedback-form textarea')?.focus());
    }else{
      document.querySelector('#demo-feedback-open')?.focus();
    }
  }
  function init(){
    const open=document.querySelector('#demo-feedback-open');
    const close=document.querySelector('#demo-feedback-close');
    const backdrop=document.querySelector('.demo-feedback-backdrop');
    const form=document.querySelector('#demo-feedback-form');
    const status=document.querySelector('#demo-feedback-status');
    if(!open||!close||!backdrop||!form||!status)return;

    open.addEventListener('click',()=>setOpen(true));
    close.addEventListener('click',()=>setOpen(false));
    backdrop.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!document.querySelector('#demo-feedback-modal').hidden)setOpen(false);
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      status.textContent='';
      const button=form.querySelector('button[type="submit"]');
      const data=new FormData(form);
      const message=String(data.get('message')||'').trim();
      if(message.length<3){status.textContent='Please add a little more detail.';return;}
      button.disabled=true;
      button.textContent='Sending...';
      try{
        const response=await fetch('/api/demo-feedback',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            category:String(data.get('category')||'other'),
            message,
            website:String(data.get('website')||''),
            screen:activeScreen(),
            page:location.pathname
          })
        });
        const body=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(body.error||'Feedback could not be sent.');
        form.reset();
        status.textContent='Thank you! Your feedback was sent.';
        button.textContent='Sent ✓';
        window.setTimeout(()=>{setOpen(false);button.disabled=false;button.textContent='Send Feedback';status.textContent='';},1400);
      }catch(error){
        status.textContent=error.message||'Feedback could not be sent. Please try again.';
        button.disabled=false;
        button.textContent='Send Feedback';
      }
    });
  }
  document.addEventListener('DOMContentLoaded',init);
})();