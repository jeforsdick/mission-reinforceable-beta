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
      const category=String(data.get('category')||'other');
      const screen=activeScreen();
      const subject='Mission: Reinforceable Demo Feedback — '+category;
      const body=[
        'Hi Jess,',
        '',
        'I tried the Mission: Reinforceable public demo and wanted to share some feedback:',
        '',
        message,
        '',
        'Feedback type: '+category,
        'Demo screen: '+screen,
        'Page: '+location.pathname
      ].join('\n');
      const mailto='mailto:jess.olson@utah.edu?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      form.reset();
      status.textContent='Opening your email app with your feedback filled in...';
      button.textContent='Opening...';
      window.location.href=mailto;
      window.setTimeout(()=>{button.disabled=false;button.textContent='Send Feedback';status.textContent='';},1200);
    });
  }
  document.addEventListener('DOMContentLoaded',init);
})();