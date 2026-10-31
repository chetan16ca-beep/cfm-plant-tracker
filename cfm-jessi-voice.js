/* CFM Forge V218 — Jessi Voice Assistant.
 * Browser-managed one-shot speech-to-text + browser speech synthesis.
 * No microphone streaming to ERP backend, no auto microphone, no writes.
 * Audio may be processed by the browser/platform speech service.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const Recognizer=window.SpeechRecognition||window.webkitSpeechRecognition||null;
const canSpeak=!!window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==="function";
const langCodes=["hi-IN","en-IN","gu-IN","mr-IN"];
const labels={"hi-IN":"Hindi","en-IN":"English (India)","gu-IN":"Gujarati","mr-IN":"Marathi"};
let recognizer=null,recognizing=false,speakEnabled=true,voiceReplyPending=false,setupDone=false;
let message="";let activeUtterance=null,sendQueued=false;
function info(s,mode){
 const x=$("cfmJessiVoiceState");
 if(x){x.textContent=s;x.dataset.mode=mode||""}
}
function speechText(original){
 let q=String(original||"").trim();
 if(!q)return q;
 q=q.replace(/[०-९]/g,x=>String("०१२३४५६७८९".indexOf(x)));
 q=q.replace(/^\s*(?:hey\s+)?(?:jessi|jessie|जेसी|जेस्सी|जैसी|जैसी\s+जी|જેસી|जैसी)\s*[,:\-]?\s*/i,"");
 q=q.replace(/सी\s*एफ\s*एम|सीएफएम|सी\s*एफ़\s*एम|સી\s*એફ\s*એમ/gi,"CFM");
 const words=[
  [/स्टेटस|स्थिति|स्टेटस|स्थिती|સ્ટેટસ/gi,"status"],
  [/कटिंग|काटिंग|कटिंग|કટિંગ/gi,"cutting"],
  [/स्टॉक|साठा|સ્ટોક|स्टॉक/gi,"stock"],
  [/क्लॉथ|कपड़ा|कपड़े|कपड़े|कापड|कापडाचा|કાપડ/gi,"cloth"],
  [/पेंडिंग|पैन्डिंग|बाकी|बकाया|પ્રલંબિત/gi,"pending"],
  [/सारांश|सार|रिपोर्ट|रिपोर्ट्स|અહેવાલ/gi,"summary"],
  [/कितने|कितना|कितनी|किती|કેટલા/gi,"kitne"],
  [/वर्क\s*ऑर्डर|वर्क\s*ऑर्डर्स|વર્ક\s*ઓર્ડર/gi,"work order"],
  [/मीटर|मीटर्स|મીટર/gi,"meter"]
 ];
 for(const [pat,replacement] of words)q=q.replace(pat,replacement);
 return q.trim();
}
function stopVoice(){
 voiceReplyPending=false;
 if(recognizer){
  try{recognizer.abort()}catch(_){}
 }
 recognizing=false;
 recognizer=null;
 const mic=$("cfmJessiMic");
 if(mic){mic.classList.remove("listening");mic.setAttribute("aria-pressed","false")}
 try{window.speechSynthesis?.cancel()}catch(_){}
 activeUtterance=null;
}
function pronounceLang(text){
 const input=$("cfmJessiLang")?.value||"hi-IN";
 // Browser-dependent synthesis; use selected language, never auto-send speech to other APIs.
 return langCodes.includes(input)?input:"hi-IN";
}
function getVoice(lang){
 const voices=window.speechSynthesis?.getVoices?.()||[];
 const target=lang.toLowerCase();
 return voices.find(v=>v.lang.toLowerCase()===target)||
  voices.find(v=>v.lang.toLowerCase().split("-")[0]===target.split("-")[0])||null;
}
function speak(text){
 if(!speakEnabled||!canSpeak)return;
 const clean=String(text||"").replace(/https?:\/\/\S+/g,"").replace(/[•|*_#]/g," ").trim();
 if(!clean)return;
 try{
  window.speechSynthesis.cancel();
  const voiceText=clean.length>1300?clean.slice(0,1280)+"... Baaki detail screen par dekho.":clean;
  const utterance=new SpeechSynthesisUtterance(voiceText);
  const language=pronounceLang();
  utterance.lang=language;utterance.rate=0.96;utterance.pitch=1;utterance.volume=1;
  const voice=getVoice(language);if(voice)utterance.voice=voice;
  utterance.onerror=()=>{info("Voice playback nahi ho paya. Answer screen par hai.","warn");activeUtterance=null};
  utterance.onend=()=>{activeUtterance=null;info("Jessi ready · Mic se poochho","ok")};
  activeUtterance=utterance;
  window.speechSynthesis.speak(utterance);
  info("Jessi bol rahi hai…","speaking");
 }catch(e){info("Browser speech output unavailable. Text answer shown.","warn")}
}
function lastAssistant(){
 const items=[...document.querySelectorAll("#cfmAiMessages .cfm-ai-message.assistant .cfm-ai-answer")];
 return items.length?items[items.length-1].textContent:"";
}
function submitVoice(){
 const form=$("cfmAiQuestionForm");
 if(!form)return;
 voiceReplyPending=true;sendQueued=true;
 try{
  if(typeof form.requestSubmit==="function")form.requestSubmit();
  else form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
 }catch(e){
  info("Voice recognized. Ask button dabakar question bhejo.","warn");
  voiceReplyPending=false;sendQueued=false;return;
 }
 // Existing Jessi record engine replies synchronously, but Cloud may be fetched first.
 Promise.resolve().then(()=>{
  sendQueued=false;
  if(!voiceReplyPending)return;
  voiceReplyPending=false;
  const result=lastAssistant();
  if(result)speak(result);
 });
}
function startVoice(){
 const dlg=$("cfmAiDialog");
 if(!dlg?.open){info("Open Jessi first.","warn");return}
 if(!Recognizer){info("Mic speech recognition is not supported in this browser. Chrome Android mein try karo ya type karo.","warn");return}
 if(recognizing){
  try{recognizer?.stop()}catch(_){}
  return;
 }
 // Only start on user click; never background listen.
 try{window.speechSynthesis?.cancel()}catch(_){}
 try{
  const rec=new Recognizer();
  recognizer=rec;
  rec.lang=pronounceLang();rec.interimResults=false;rec.maxAlternatives=1;rec.continuous=false;
  rec.onstart=()=>{
   recognizing=true;
   const mic=$("cfmJessiMic");if(mic){mic.classList.add("listening");mic.setAttribute("aria-pressed","true")}
   info("🎤 Jessi sun rahi hai… apna question bolo.","listening");
  };
  rec.onresult=ev=>{
   const captured=Array.from(ev.results||[]).filter(x=>x.isFinal).map(x=>x[0]?.transcript||"").join(" ").trim();
   if(!captured)return;
   const text=speechText(captured);
   const input=$("cfmAiQuestion");
   if(!input)return;
   input.value=text;
   info("Suna: "+captured+" · Jawab de rahi hoon…","ok");
   submitVoice();
  };
  rec.onerror=ev=>{
   const code=ev.error||"unknown";
   const map={
    "not-allowed":"Microphone permission denied. Browser settings mein Mic allow karo.",
    "service-not-allowed":"Browser speech service unavailable. Type karke poochho.",
    "no-speech":"Awaaz nahi mili. Mic dabakar dubara bolo.",
    "audio-capture":"Microphone available nahi hai.",
    "network":"Speech recognition ko network chahiye. Internet check karo.",
    "language-not-supported":"Selected language browser speech service mein supported nahi hai."
   };
   info(map[code]||"Mic error: "+code+". Type karke poochh sakte ho.","warn");
  };
  rec.onend=()=>{
   recognizing=false;recognizer=null;
   const mic=$("cfmJessiMic");
   if(mic){mic.classList.remove("listening");mic.setAttribute("aria-pressed","false")}
  };
  rec.start();
 }catch(e){
  recognizing=false;
  info("Is browser mein microphone start nahi hua. Chrome Android ya text input try karo.","warn");
 }
}
function controls(dlg){
 if(dlg.querySelector("#cfmJessiMic"))return;
 const form=dlg.querySelector("#cfmAiQuestionForm");
 const sourceRow=dlg.querySelector(".cfm-ai-source-row");
 const input=dlg.querySelector("#cfmAiQuestion");
 if(!form||!sourceRow||!input)return;
 const mic=document.createElement("button");
 mic.type="button";mic.id="cfmJessiMic";mic.className="cfm-jessi-mic";
 mic.textContent="🎤";mic.title="Jessi microphone (tap to speak)";
 mic.setAttribute("aria-label","Talk to Jessi");mic.setAttribute("aria-pressed","false");
 mic.addEventListener("click",startVoice);
 const send=dlg.querySelector("#cfmAiSend");form.insertBefore(mic,send||null);
 const lang=document.createElement("select");lang.id="cfmJessiLang";
 lang.setAttribute("aria-label","Jessi voice language");
 for(const code of langCodes){
  const option=document.createElement("option");option.value=code;option.textContent=labels[code];lang.append(option);
 }
 lang.value="hi-IN";lang.addEventListener("change",()=>{
  stopVoice();info(labels[lang.value]+" voice selected. Mic dabakar bolo.","ok");
 });
 const speakSwitch=document.createElement("button");
 speakSwitch.type="button";speakSwitch.id="cfmJessiSpeakToggle";
 speakSwitch.setAttribute("aria-pressed","true");speakSwitch.textContent="🔊 Reply On";
 speakSwitch.setAttribute("aria-label","Turn Jessi spoken replies off");
 speakSwitch.addEventListener("click",()=>{
  speakEnabled=!speakEnabled;
  speakSwitch.textContent=speakEnabled?"🔊 Reply On":"🔇 Reply Off";
  speakSwitch.setAttribute("aria-pressed",String(speakEnabled));
  speakSwitch.setAttribute("aria-label",speakEnabled?"Turn Jessi spoken replies off":"Turn Jessi spoken replies on");
  if(!speakEnabled)try{window.speechSynthesis?.cancel()}catch(_){}
 });
 const stop=document.createElement("button");stop.type="button";stop.id="cfmJessiStop";stop.textContent="■ Stop";
 stop.setAttribute("aria-label","Stop Jessi voice");stop.addEventListener("click",()=>{stopVoice();info("Jessi voice stopped.","ok")});
 const label=document.createElement("label");label.className="cfm-jessi-lang-label";label.textContent="Voice: ";
 label.append(lang);sourceRow.append(label,speakSwitch,stop);
 const status=document.createElement("div");status.id="cfmJessiVoiceState";status.className="cfm-jessi-status";
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const note=dlg.querySelector(".cfm-ai-note");if(note)note.before(status);
 else form.after(status);
 if(!Recognizer){
  mic.disabled=true;mic.title="Speech recognition unavailable; type questions instead";
  info("Mic not supported here. Android Chrome browser try karo, ya type karo.","warn");
 }else if(!canSpeak)info("Mic supported. Spoken reply browser mein unavailable; text answer milega.","warn");
 else info("Jessi ready · Mic dabakar bolo (Hindi, English, Gujarati, Marathi).","ok");
 // Reply readout for typed questions too when speaker is enabled.
 form.addEventListener("submit",()=>{
  if(sendQueued)return;
  Promise.resolve().then(()=>{if(!dlg.open||!speakEnabled)return;
   const result=lastAssistant();if(result)speak(result)});
 });
 dlg.addEventListener("close",stopVoice);
 dlg.addEventListener("cancel",stopVoice);
}
function initialize(){
 const dlg=$("cfmAiDialog");if(!dlg||dlg.querySelector("#cfmJessiMic"))return;
 controls(dlg);
}
function init(){
 const dlg=$("cfmAiDialog");if(dlg)initialize();
 // Original factory assistant builds the dialog only when launched.
 // Observe added dialogs, disconnect after voice controls attach.
 const observer=new MutationObserver(()=>{
  initialize();
  if($("cfmJessiMic"))observer.disconnect();
 });
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();