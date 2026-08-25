'use strict';
const server=require('./research-admin-server');
const {hashToken}=require('../server/weekly-checkin-service');
async function handler(request,response){
 if(request.method!=='POST')return server.json(response,405,{error:'Method not allowed'});
 const token=String(request.body?.token||'');
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token))return server.json(response,400,{error:'Invalid completion token'});
 try{const result=await server.supabaseFetch('/rest/v1/rpc/complete_weekly_checkin',{method:'POST',body:JSON.stringify({submitted_token_hash:hashToken(token)})});if(!result.ok)return server.json(response,404,{error:'Completion token not found or expired'});return server.json(response,200,{complete:true});}
 catch{return server.json(response,500,{error:'Completion could not be recorded'});}
}
module.exports=handler;
