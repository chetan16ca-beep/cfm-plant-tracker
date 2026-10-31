/* Ask CFM AI V216 — read-only verified Cloud AI. JWT remains in memory. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const api="https://soluxixriexliipfnznc.supabase.co",fn=api+"/functions/v1/cfm-ask-ai";
let token="",expiry=0,refresh="",connected=false,working=false,history=[];
function config(){if(typeof CLOUD_ANON!=="string")throw Error("Cloud config not loaded");return CLOUD_ANON}
function elem(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x}
function feedback(message="",type=""){const x=$("cfmAiFeedback");if(x){x.textContent=message;x.dataset.mode=type;x.hidden=!message}}
function badge(message,mode="warning"){const x=$("cfmAiBadge");if(x){x.textContent=message;x.dataset.mode=mode}}
function launcher(){
 if($("cfmAiLauncher"))return;
 const home=$("cfmSapWorkspace");if(!home)return;
 const wrap=elem("section",undefined,"cfm-ai-launcher");wrap.id="cfmAiLauncher";
 const mark=elem("span","✦","cfm-ai-mark");
 const copy=elem("div",undefined,"cfm-ai-launcher-text");
 copy.append(elem("small","CFM FORGE / AI ASSISTANT"),elem("h3","Ask CFM AI"),elem("p","Chat with real Cloud Work Orders, Cutting and SRL Stock"));
 const button=elem("button","Open Ask CFM AI");button.type="button";button.addEventListener("click",open);
 wrap.append(mark,copy,button);
 const intel=$("cfmIntelLauncher");if(intel)intel.after(wrap);else home.append(wrap);
}
function dialog(){
 if($("cfmAiDialog"))return $("cfmAiDialog");
 const d=elem("dialog",undefined,"cfm-ai-dialog");d.id="cfmAiDialog";d.setAttribute("aria-label","Ask CFM AI");
 d.innerHTML=[
 '<header class="cfm-ai-header"><span class="cfm-ai-headmark">✦</span><div class="cfm-ai-titles"><small>CFM FORGE / SECURE CHAT</small><h2>Ask CFM AI</h2><p>Real Cloud records · Read-only</p></div><span id="cfmAiBadge" class="cfm-ai-badge">SETUP REQUIRED</span><button type="button" id="cfmAiExit" aria-label="Close">×</button></header>',
 '<div id="cfmAiFeedback" class="cfm-ai-feedback" role="status" aria-live="polite" hidden></div>',
 '<div class="cfm-ai-main" id="cfmAiMain"></div>',
 '<footer class="cfm-ai-footer"><span>AI cannot change orders, stock, cutting or dispatch.</span><button type="button" id="cfmAiLogout" hidden>Log out</button></footer>'
 ].join("");
 document.body.append(d);
 $("cfmAiExit").addEventListener("click",()=>d.close());
 $("cfmAiLogout").addEventListener("click",()=>{token="";refresh="";expiry=0;connected=false;history=[];loginView()});
 return d;
}
function loginView(){
 dialog();badge("SETUP REQUIRED");$("cfmAiLogout").hidden=true;
 $("cfmAiMain").innerHTML=[
 '<div class="cfm-ai-login"><h3>Secure AI Login</h3><p>New AI login is separate from the existing CFM plant sync code.</p>',
 '<form id="cfmAiAuth"><label>Email<input type="email" name="email" autocomplete="username" required placeholder="Authorized email"></label>',
 '<label>Password<input type="password" name="password" autocomplete="current-password" minlength="8" required placeholder="Minimum 8 characters"></label>',
 '<div class="cfm-ai-login-actions"><button type="submit" id="cfmAiSign">Sign in</button><button type="button" id="cfmAiCreate">Create AI account</button></div></form>',
 '<details class="cfm-ai-setup"><summary>First-time setup</summary>',
 '<p>1. Create AI account, confirm email, then sign in.</p>',
 '<p>2. Add <code>OPENAI_API_KEY</code> in <a target="_blank" rel="noopener noreferrer" href="https://supabase.com/dashboard/project/soluxixriexliipfnznc/settings/functions">CFM Supabase Edge Secrets</a>.</p>',
 '<p>3. Add <code>CFM_AI_ALLOWED_EMAILS</code> with your confirmed email address. Unapproved accounts cannot read Cloud records.</p>',
 '</details><p class="cfm-ai-note">AI stays unavailable until email approval and server key setup. Never paste API keys into the chat.</p></div>'
 ].join("");
 $("cfmAiAuth").addEventListener("submit",e=>{e.preventDefault();authenticate(false)});
 $("cfmAiCreate").addEventListener("click",()=>authenticate(true));
}
async function authenticate(create){
 if(working)return;
 const f=$("cfmAiAuth"),email=f.elements.namedItem("email").value.trim().toLowerCase(),password=f.elements.namedItem("password").value;
 if(!email||password.length<8){feedback("Enter email and password of at least 8 characters.","warning");return}
 if(create&&!confirm("Create AI login for "+email+"? Email verification and admin approval may be required."))return;
 working=true;$("cfmAiSign").disabled=true;$("cfmAiCreate").disabled=true;
 feedback(create?"Registering login…":"Signing in…");
 try{
  const url=api+(create?"/auth/v1/signup":"/auth/v1/token?grant_type=password");
  const r=await fetch(url,{method:"POST",headers:{"apikey":config(),"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.message||data.msg||data.error_description||"Auth failed");
  if(create){feedback("Account request sent. Verify your email, then sign in. Administrator approval is also required.","ok");return}
  if(!data.access_token)throw Error("No login token returned");
  token=data.access_token;refresh=data.refresh_token||"";expiry=Date.now()+(Number(data.expires_in)||3600)*1000;
  await checkStatus();chatView();
 }catch(err){feedback(String(err.message||err),"warning")}
 finally{working=false;if($("cfmAiSign"))$("cfmAiSign").disabled=false;if($("cfmAiCreate"))$("cfmAiCreate").disabled=false}
}
async function renew(){
 if(Date.now()<expiry-60000)return;
 if(!refresh)throw Error("AI_LOGIN_EXPIRED");
 const r=await fetch(api+"/auth/v1/token?grant_type=refresh_token",{method:"POST",
  headers:{"apikey":config(),"Content-Type":"application/json"},body:JSON.stringify({refresh_token:refresh})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.access_token)throw Error("AI_LOGIN_EXPIRED");
 token=d.access_token;refresh=d.refresh_token||refresh;expiry=Date.now()+(Number(d.expires_in)||3600)*1000;
}
async function call(payload){
 if(!token)throw Error("AI_LOGIN_REQUIRED");
 const r=await fetch(fn,{method:"POST",headers:{"apikey":config(),"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||"AI HTTP "+r.status);
 return d;
}
function meaning(code){
 return ({
 AI_LOGIN_REQUIRED:"Please sign in again.",
 AI_LOGIN_EXPIRED:"AI login expired; sign in again.",
 VERIFY_EMAIL_REQUIRED:"Verify AI login email first.",
 AI_ACCESS_NOT_APPROVED:"Your email is not approved. Set CFM_AI_ALLOWED_EMAILS in Supabase Edge Secrets.",
 OPENAI_API_KEY_NOT_CONFIGURED:"The backend is deployed, but OPENAI_API_KEY must be added in Supabase Edge Secrets.",
 AI_PROVIDER_ERROR:"OpenAI request failed. Check API key, billing and model access.",
 RATE_LIMIT_6_PER_MINUTE:"Too many requests. Try later.",
 CLOUD_SNAPSHOT_UNAVAILABLE:"Current Cloud production records could not be verified."
 })[code]||String(code).replace(/_/g," ");
}
async function checkStatus(){
 try{
  await renew();
  const status=await call({action:"status"});
  connected=!!status.configured;
  badge(connected?"AI CONNECTED":"API KEY REQUIRED",connected?"online":"warning");
  feedback(connected?"Approved AI login ready. Cloud data will be read on each question.":"AI login approved. Server OPENAI_API_KEY setup is still required.",connected?"ok":"warning");
 }catch(err){connected=false;badge("SETUP REQUIRED");feedback(meaning(err.message||err),"warning")}
}
function chatView(){
 $("cfmAiLogout").hidden=false;
 $("cfmAiMain").innerHTML=[
 '<div class="cfm-ai-chat"><div class="cfm-ai-prompts"><button type="button" data-prompt="CFM-722 ka status batao">CFM-722 Status</button>',
 '<button type="button" data-prompt="333 ANT cloth SRL details batao">333 ANT Stock</button>',
 '<button type="button" data-prompt="Urgent aur pending Work Orders batao">Urgent Orders</button></div>',
 '<div class="cfm-ai-messages" id="cfmAiMessages" aria-live="polite"></div>',
 '<form id="cfmAiQuestionForm" class="cfm-ai-compose"><textarea id="cfmAiQuestion" maxlength="800" rows="2" placeholder="CFM-677 mein kaunsa SRL use hua?" ',connected?"":"disabled",
 '></textarea><button type="submit" id="cfmAiSend" ',connected?"":"disabled",'>Ask AI</button></form>',
 '<p class="cfm-ai-note">Cloud records only; local unsynced entries may differ. Verify before production decisions.</p></div>'
 ].join("");
 for(const b of $("cfmAiMain").querySelectorAll("[data-prompt]")){b.disabled=!connected;b.addEventListener("click",()=>{if(connected){$("cfmAiQuestion").value=b.dataset.prompt;send()}})}
 $("cfmAiQuestionForm").addEventListener("submit",e=>{e.preventDefault();send()});
 $("cfmAiQuestion").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
 render();
}
function render(){
 const box=$("cfmAiMessages");if(!box)return;
 box.replaceChildren();
 if(!history.length)box.append(elem("div","Ask about your Work Orders, Cutting, stock or production.", "cfm-ai-empty"));
 for(const msg of history){
  const row=elem("div",undefined,"cfm-ai-message "+msg.role);
  row.append(elem("b",msg.role==="assistant"?"Ask CFM AI":"You"),elem("div",msg.text,"cfm-ai-answer"));
  if(msg.source)row.append(elem("small","Cloud v"+msg.source.version+" · "+(msg.source.updated_at||"")));
  box.append(row);
 }
 box.scrollTop=box.scrollHeight;
}
async function send(){
 if(!connected||working)return;
 const field=$("cfmAiQuestion"),question=field.value.trim();
 if(question.length<3)return feedback("Ask a question of at least 3 characters.","warning");
 history.push({role:"user",text:question});history=history.slice(-24);
 field.value="";working=true;$("cfmAiSend").disabled=true;$("cfmAiSend").textContent="Thinking…";
 feedback("Reading authorized Cloud records…");render();
 try{
  await renew();const result=await call({action:"ask",question});
  history.push({role:"assistant",text:result.answer||"No answer returned",source:result.source});
  feedback("AI replied using live Cloud records. ERP not modified.","ok");
 }catch(err){
  history.push({role:"assistant",text:"AI unavailable: "+meaning(err.message||err)});
  feedback(meaning(err.message||err),"warning");badge("CHECK CONNECTION");
  if(["AI_LOGIN_EXPIRED","AI_LOGIN_REQUIRED"].includes(err.message)){token="";refresh="";connected=false}
 }finally{working=false;if($("cfmAiSend")){$("cfmAiSend").disabled=!connected;$("cfmAiSend").textContent="Ask AI"}render()}
}
function open(){const d=dialog();if(!d.open)d.showModal();if(token)chatView();else loginView()}
function init(){
 launcher();
 if(!$("cfmAiLauncher")){
  const parent=$("view-dashboard");
  if(parent){const observer=new MutationObserver(()=>{launcher();if($("cfmAiLauncher"))observer.disconnect()});observer.observe(parent,{childList:true,subtree:true})}
 }
 window.cfmOpenAskAi=open;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();