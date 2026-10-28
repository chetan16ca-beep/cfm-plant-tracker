(function(){
const host='https://soluxixriexliipfnznc.supabase.co';
const key='sb_publishable_hay-tW1slhbk-QXnql7pSg_I0Lh-0N0';
const $=s=>document.getElementById(s);let session=null;let records=[];
const msg=s=>$('status').textContent=s;
function show(yes){$('workspace').classList.toggle('hidden',!yes);$('auth').classList.toggle('hidden',yes)}
async function call(path,method,body,needAuth){
const headers={'apikey':key,'Content-Type':'application/json'};
if(needAuth){if(!session)throw Error('Sign in first');headers.Authorization='Bearer '+session.access_token}
if(method==='POST'&&needAuth)headers.Prefer='return=representation';
const r=await fetch(host+path,{method:method||'GET',headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});
const text=await r.text();let data;try{data=JSON.parse(text||'null')}catch{data={message:text}}
if(!r.ok)throw Error(data.message||data.error_description||data.msg||'Cloud error '+r.status);
return data;
}
async function auth(create){const email=$('email').value.trim(),password=$('password').value;if(!email||!password)throw Error('Enter email and password');
let a=await call(create?'/auth/v1/signup':'/auth/v1/token?grant_type=password','POST',{email,password},false);
if(!a.access_token){msg('Check your email to confirm the account, then sign in');return}
session=a;session.expiresAt=Date.now()+(a.expires_in||3600)*1000;localStorage.setItem('eagle-session-v1',JSON.stringify(session));show(true);await refresh();}
async function ensure(){if(!session)throw Error('Sign in first');if(Date.now()<session.expiresAt-90000)return;
const a=await call('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token},false);
session=a;session.expiresAt=Date.now()+(a.expires_in||3600)*1000;localStorage.setItem('eagle-session-v1',JSON.stringify(session));}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function refresh(){await ensure();
records=await call('/rest/v1/eagle_work_orders?select=*&order=work_no.desc&limit=1000','GET',null,true);
const next=records.reduce((n,r)=>Math.max(n,Number(r.work_no)||684),684)+1;
$('summary').textContent=records.length+' cloud work orders | next CFM-'+next;
$('orders').innerHTML=records.map(r=>'<p><b>CFM-'+esc(r.work_no)+'</b> — '+esc(r.party)+' — '+esc(r.description)+' | Qty '+esc(r.qty)+'</p>').join('')||'No Eagle orders yet.';
msg('Cloud data loaded. Old CFM ERP has not been changed.')}
$('login').onclick=()=>auth(false).catch(e=>msg(e.message));
$('signup').onclick=()=>auth(true).catch(e=>msg(e.message));
$('reload').onclick=()=>refresh().catch(e=>msg(e.message));
$('logout').onclick=()=>{session=null;localStorage.removeItem('eagle-session-v1');show(false);msg('Signed out')};
$('form').onsubmit=async e=>{e.preventDefault();const b=$('save');b.disabled=true;const d=Object.fromEntries(new FormData(e.target));try{await ensure();const result=await call('/rest/v1/eagle_work_orders','POST',{party:d.party.trim(),po_no:d.po_no||'',description:d.description.trim(),qty:Number(d.qty),cloth:d.cloth||''},true);
if(!result?.[0]?.work_no)throw Error('Save not confirmed. Refresh cloud before retrying.');
e.target.reset();msg('Saved CFM-'+result[0].work_no);await refresh();
}catch(x){msg('Save not confirmed: '+x.message+'. Check order list before retry.')}finally{b.disabled=false}};
try{session=JSON.parse(localStorage.getItem('eagle-session-v1')||'null');if(session?.refresh_token){show(true);refresh().catch(e=>{msg(e.message);show(false)})}else{show(false);msg('Sign in to open Eagle ERP')}}catch(e){show(false);msg('Sign in required')}
})();