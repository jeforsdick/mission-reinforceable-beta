'use strict';
const research=require('../server/research-weekly-digest');
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 if(!research.authorized(req))return res.status(401).json({error:'Unauthorized'});
 const testCase=typeof req.query?.test_case==='string'?req.query.test_case:null;
 const dryRun=req.query?.preview==='1'||Boolean(testCase);
 if(testCase&&!['CASE-069','CASE-100'].includes(testCase))return res.status(400).json({error:'Invalid QA case'});
 if(!dryRun&&process.env.RESEARCH_WEEKLY_DIGEST_ENABLED!=='true')return res.status(200).json({enabled:false,sent:false});
 if(!dryRun&&new Date().toLocaleDateString('en-US',{timeZone:'America/Denver',weekday:'short'})!=='Fri')return res.status(200).json({enabled:true,sent:false,reason:'not_friday'});
 try{
  const data=await research.digest(new Date(),testCase);
  if(dryRun)return res.status(200).json({preview:true,recipient:research.RECIPIENT,...data,email:research.compose(data).text});
  if(!process.env.RESEND_API_KEY)return res.status(503).json({error:'Email provider not configured'});
  const result=await research.send(data);
  return res.status(200).json({enabled:true,recipient:research.RECIPIENT,week:data.week.week_start,...result});
 }catch(e){console.error('Research weekly digest failed',e.message);return res.status(502).json({error:'Research weekly digest unavailable'});}
};