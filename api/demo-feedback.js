'use strict';

function json(response,status,body){return response.status(status).json(body);}
function safe(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

module.exports=async function handler(request,response){
  if(request.method!=='POST'){
    response.setHeader('Allow','POST');
    return json(response,405,{error:'Method not allowed'});
  }
  try{
    const body=request.body||{};
    if(Object.keys(body).some(key=>!['category','message','website','screen','page'].includes(key)))return json(response,400,{error:'Invalid feedback request.'});
    if(String(body.website||'').trim())return json(response,200,{ok:true});
    const category=String(body.category||'other').trim().toLowerCase();
    const allowed=new Set(['idea','confusing','bug','liked','other']);
    if(!allowed.has(category))return json(response,400,{error:'Choose a feedback category.'});
    const message=String(body.message||'').trim();
    if(message.length<3||message.length>2000)return json(response,400,{error:'Feedback must be between 3 and 2000 characters.'});
    const screen=String(body.screen||'unknown').slice(0,80);
    const page=String(body.page||'/demo-game/').slice(0,200);
    const apiKey=process.env.RESEND_API_KEY;
    const from=process.env.TEACHER_REMINDER_FROM_EMAIL;
    if(!apiKey||!from)return json(response,503,{error:'Feedback delivery is temporarily unavailable.'});
    const subject='Mission: Reinforceable Demo Feedback — '+category.replace(/^./,c=>c.toUpperCase());
    const text='Demo feedback\n\nCategory: '+category+'\nScreen: '+screen+'\nPage: '+page+'\n\n'+message;
    const html='<h2>Mission: Reinforceable Demo Feedback</h2><p><strong>Category:</strong> '+safe(category)+'</p><p><strong>Screen:</strong> '+safe(screen)+'</p><p><strong>Page:</strong> '+safe(page)+'</p><hr><p style="white-space:pre-wrap">'+safe(message)+'</p>';
    const sent=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        from,
        to:['jess.olson@utah.edu'],
        subject,
        text,
        html
      })
    });
    const provider=await sent.json().catch(()=>null);
    if(!sent.ok||!provider?.id)return json(response,502,{error:'Feedback could not be sent. Please try again.'});
    return json(response,200,{ok:true});
  }catch(error){
    console.error('Demo feedback failed',error);
    return json(response,500,{error:'Feedback could not be sent. Please try again.'});
  }
};