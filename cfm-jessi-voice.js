/* CFM Forge V226 — Jessi Voice Assistant.
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
let recognizer=null,recognizing=false,speakEnabled=true,voiceReplyPending=false;
let activeUtterance=null,sendQueued=false,utteranceSeq=0,lastSpokenText="";
let selectedVoiceKey="",voicesReady=false,femaleOnly=true;
const FEMALE_ONLY_HELP="Phone/browser mein confirmed female-name voice nahi mili. Jessi male voice mein nahi bolegi. Android Settings → Text-to-speech output → available female voice install/choose karo, ya Jessi Voice list mein female voice dekho.";
const femaleNameHint=/(?:\bfemale\b|\bwoman\b|\bwomens?\b|\bzira\b|\bheera\b|\bswara\b|\bneerja\b|\bpriya\b|\baditi\b|\bananya\b|\bsamantha\b|\bvictoria\b|\bkaren\b|\bmoira\b|\btessa\b|\bfiona\b|\bsusan\b|\ballison\b|\bava\b|\bserena\b|\bveena\b|\blekha\b|\bmeera\b|\braveena\b|\bjenny\b|\baria\b|\bsonia\b|\bnatasha\b|\barohi\b|\baarohi\b|\bdhwani\b)/i;
const probableFemale=v=>femaleNameHint.test(String(v?.name||""));
const voiceKey=v=>String(v?.voiceURI||v?.name||"")+"|"+String(v?.lang||"");
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
function cancelPlayback(){
 ++utteranceSeq;
 try{window.speechSynthesis?.cancel()}catch(_){}
 activeUtterance=null;
}
function stopVoice(){
 voiceReplyPending=false;
 if(recognizer){try{recognizer.abort()}catch(_){}}
 recognizing=false;recognizer=null;
 const mic=$("cfmJessiMic");
 if(mic){mic.classList.remove("listening");mic.setAttribute("aria-pressed","false")}
 cancelPlayback();
}
function pronounceLang(text){
 const input=$("cfmJessiLang")?.value||"hi-IN";
 // Browser-dependent synthesis; use selected language, never auto-send speech to other APIs.
 return langCodes.includes(input)?input:"hi-IN";
}
function voiceList(){
 return (window.speechSynthesis?.getVoices?.()||[]).filter(v=>v&&v.name&&v.lang);
}
function sameLanguage(voice,lang){
 const a=String(voice?.lang||"").toLowerCase(),b=String(lang||"").toLowerCase();
 return a===b||a.split("-")[0]===b.split("-")[0];
}
function pickVoice(lang){
 const voices=voiceList();
 const explicitlyChosen=selectedVoiceKey?voices.find(v=>voiceKey(v)===selectedVoiceKey):null;
 if(explicitlyChosen&&(!femaleOnly||probableFemale(explicitlyChosen)))return explicitlyChosen;
 const same=voices.filter(v=>sameLanguage(v,lang));
 const exact=same.filter(v=>String(v.lang).toLowerCase()===String(lang).toLowerCase());
 // Female-only is the default. Do NOT quietly fall back to the phone's male
 // default when the selected language has no recognizable female voice.
 // A female English voice may mispronounce Hindi words; tell the user.
 const candidate=exact.find(probableFemale)||
   same.find(probableFemale)||
   voices.find(v=>/^en-in$/i.test(v.lang)&&probableFemale(v))||
   voices.find(v=>/^en-/i.test(v.lang)&&probableFemale(v))||
   voices.find(probableFemale);
 if(candidate||femaleOnly)return candidate||null;
 return explicitlyChosen||exact.find(v=>v.default)||same.find(v=>v.default)||
   exact[0]||same[0]||voices.find(v=>/^en-in$/i.test(v.lang))||
   voices.find(v=>/^en-/i.test(v.lang))||voices[0]||null;
}
function getVoice(lang){return pickVoice(lang)}
function voiceStatus(lang){
 const voices=voiceList(),voice=getVoice(lang);
 if(!voices.length)return femaleOnly
  ?"Phone ki voice list abhi loading hai. Female Voice Only ON. "+FEMALE_ONLY_HELP
  :"Phone ne abhi voice list load nahi ki. 🎧 Test Voice dabao.";
 if(!voice)return FEMALE_ONLY_HELP;
 const chosen=selectedVoiceKey&&voiceKey(voice)===selectedVoiceKey;
 const fallback=!sameLanguage(voice,lang);
 const name=voice.name+" ("+voice.lang+")";
 if(femaleOnly){
  return (chosen?"Selected: ":"♀ Female-preferred voice: ")+name+
    (fallback?" · Is language mein female voice nahi mili; doosri language se Hindi uchcharan alag ho sakta hai.":"")+
    " · 🎧 Test Voice se awaaz confirm karo.";
 }
 return "Selected voice: "+name+". ♀ Female Only OFF hai. 🎧 Test Voice dabao.";
}
function fillVoiceSelector(){
 const select=$("cfmJessiSpeaker");
 if(!select)return;
 const previously=selectedVoiceKey,language=pronounceLang(),voices=voiceList();
 select.replaceChildren();
 const auto=document.createElement("option");auto.value="";auto.textContent="♀ Auto · Female Only (when ON)";select.append(auto);
 const ordered=voices.slice().sort((a,b)=>{
  const rank=v=>(sameLanguage(v,language)?0:10)+(probableFemale(v)?0:1);
  return rank(a)-rank(b)||String(a.lang).localeCompare(String(b.lang))||String(a.name).localeCompare(String(b.name));
 });
 for(const voice of ordered){
  const option=document.createElement("option");
  option.value=voiceKey(voice);
  option.textContent=(probableFemale(voice)?"♀ Possible female · ":"🔊 Other · ")+voice.name+" ("+voice.lang+")";
  select.append(option);
 }
 select.value=previously&&ordered.some(v=>voiceKey(v)===previously)?previously:"";
 if(previously&&select.value!==previously)selectedVoiceKey="";
 voicesReady=voices.length>0;
}
function speak(text,manual=false){
 const clean=String(text||"").replace(/https?:\/\/\S+/g,"").replace(/[•|*_#]/g," ").trim();
 if(!clean)return false;
 lastSpokenText=clean;
 if(!manual&&!speakEnabled)return false;
 if(!canSpeak){info("Is browser mein voice output available nahi hai. Chrome browser mein kholkar try karo.","warn");return false}
 const language=pronounceLang(),voice=getVoice(language);
 if(femaleOnly&&!voice){
  cancelPlayback();
  info(FEMALE_ONLY_HELP,"warn");
  return false;
 }
 const synth=window.speechSynthesis;
 const seq=++utteranceSeq;
 try{
  // Ignore 'interrupted' errors from the previous utterance cancelled on purpose.
  synth.cancel();
  const excerpt=clean.length>650?clean.slice(0,640)+"... Baaki detail screen par hai.":clean;
  const utterance=new SpeechSynthesisUtterance(excerpt);
  utterance.lang=voice?.lang||language;
  if(voice)utterance.voice=voice;
  utterance.rate=0.93;
  // A slightly higher pitch softens generic voices but cannot turn a
  // male speech engine into a real female voice.
  utterance.pitch=1.03;
  utterance.volume=1;
  utterance.onstart=()=>{if(seq!==utteranceSeq)return;info("🔊 Jessi bol rahi hai · "+(voice?.name||"Phone default")+" ("+(voice?.lang||language)+")","speaking")};
  utterance.onend=()=>{if(seq!==utteranceSeq)return;activeUtterance=null;info("Jessi ready · "+voiceStatus(language),"ok")};
  utterance.onerror=event=>{
   if(seq!==utteranceSeq)return;
   activeUtterance=null;
   const code=String(event?.error||"unknown");
   if(["interrupted","canceled","cancelled"].includes(code))return;
   info("Voice error: "+code+". 🔊 Suno dabao; Chrome mein na chale toh phone Text-to-speech settings check karo.","warn");
  };
  activeUtterance=utterance;
  if(synth.paused)try{synth.resume()}catch(_){}
  synth.speak(utterance);
  info("Jessi voice start ho rahi hai…","speaking");
  return true;
 }catch(err){
  if(seq===utteranceSeq)info("Voice start nahi hui ("+String(err?.message||"browser blocked")+"). 🔊 Suno dabao ya Chrome mein kholkar try karo.","warn");
  return false;
 }
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
  info("Voice recognized but form submit failed. Ask dabakar question bhejo.","warn");
  voiceReplyPending=false;sendQueued=false;return;
 }
 // Important: do NOT start speech while the microphone recognition is still active.
 // The recognition onend event releases audio focus before Jessi speaks.
 lastSpokenText=lastAssistant();
 Promise.resolve().then(()=>{sendQueued=false});
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
 cancelPlayback();
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
   if(voiceReplyPending){
    voiceReplyPending=false;
    // Reading the finished message after recognition ends avoids Android audio-focus collisions.
    Promise.resolve().then(()=>{
     const reply=lastAssistant();
     if(!reply)return info("Question suna, lekin jawab screen par nahi aaya.","warn");
     if(speakEnabled)speak(reply);
     else info("Jawab screen par hai. Sunne ke liye 🔊 Suno dabao.","ok");
    });
   }
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
  stopVoice();fillVoiceSelector();
  info(labels[lang.value]+" selected · "+voiceStatus(lang.value),"ok");
 });
 const voiceLabel=document.createElement("label");
 voiceLabel.className="cfm-jessi-speaker-label";
 voiceLabel.textContent="Jessi Voice: ";
 const voiceSelect=document.createElement("select");
 voiceSelect.id="cfmJessiSpeaker";
 voiceSelect.setAttribute("aria-label","Choose Jessi speaker voice");
 voiceLabel.append(voiceSelect);
 voiceSelect.addEventListener("change",()=>{
  const candidate=voiceList().find(v=>voiceKey(v)===voiceSelect.value);
  if(femaleOnly&&candidate&&!probableFemale(candidate)){
   selectedVoiceKey="";
   voiceSelect.value="";
   cancelPlayback();
   info("♀ Female Only ON: "+candidate.name+" ka female voice hona confirm nahi hai. "+FEMALE_ONLY_HELP,"warn");
   return;
  }
  selectedVoiceKey=voiceSelect.value;
  cancelPlayback();
  info(voiceStatus(pronounceLang()),"ok");
 });
 const synth=window.speechSynthesis;
 if(synth?.addEventListener){
  synth.addEventListener("voiceschanged",()=>{
   fillVoiceSelector();
   info(voiceStatus(pronounceLang()),"ok");
  });
 }
 const femaleMode=document.createElement("button");
 femaleMode.type="button";femaleMode.id="cfmJessiFemaleOnly";
 femaleMode.textContent="♀ Female Only · ON";
 femaleMode.setAttribute("aria-pressed","true");
 femaleMode.setAttribute("aria-label","Require a female named speech voice");
 femaleMode.addEventListener("click",()=>{
  femaleOnly=!femaleOnly;
  femaleMode.textContent=femaleOnly?"♀ Female Only · ON":"♀ Female Only · OFF";
  femaleMode.setAttribute("aria-pressed",String(femaleOnly));
  if(femaleOnly){
   const chosen=voiceList().find(v=>voiceKey(v)===selectedVoiceKey);
   if(chosen&&!probableFemale(chosen))selectedVoiceKey="";
  }
  cancelPlayback();
  fillVoiceSelector();
  info(voiceStatus(pronounceLang()),getVoice(pronounceLang())?"ok":"warn");
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
  if(!speakEnabled)cancelPlayback();
  info(speakEnabled?"Auto voice reply ON. Jawab repeat karne ke liye 🔊 Suno.":"Auto voice reply OFF. Manual 🔊 Suno phir bhi chalega.","ok");
 });
 const replay=document.createElement("button");replay.type="button";replay.id="cfmJessiReplay";
 replay.textContent="🔊 Suno";replay.setAttribute("aria-label","Play Jessi last answer");
 replay.addEventListener("click",()=>{
  const answer=lastAssistant()||lastSpokenText;
  if(answer)speak(answer,true);
  else info("Pehle Jessi se sawaal poochho ya 🎧 Test Voice dabao.","warn");
 });
 const test=document.createElement("button");test.type="button";test.id="cfmJessiTestVoice";
 test.textContent="🎧 Test Voice";test.setAttribute("aria-label","Test Jessi voice on this device");
 test.addEventListener("click",()=>speak("Namaste. Main Jessi hoon. Voice assistant ki awaaz test ho rahi hai.",true));
 const stop=document.createElement("button");stop.type="button";stop.id="cfmJessiStop";stop.textContent="■ Stop";
 stop.setAttribute("aria-label","Stop Jessi voice");stop.addEventListener("click",()=>{stopVoice();info("Jessi voice stopped.","ok")});
 const label=document.createElement("label");label.className="cfm-jessi-lang-label";label.textContent="Voice: ";
 label.append(lang);sourceRow.append(label,voiceLabel,femaleMode,speakSwitch,replay,test,stop);
 fillVoiceSelector();
 const status=document.createElement("div");status.id="cfmJessiVoiceState";status.className="cfm-jessi-status";
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const note=dlg.querySelector(".cfm-ai-note");if(note)note.before(status);
 else form.after(status);
 if(!Recognizer){
  mic.disabled=true;mic.title="Speech recognition unavailable; type questions instead";
  info("Mic not supported here. Android Chrome browser try karo, ya type karo.","warn");
 }else if(!canSpeak)info("Mic supported. Spoken reply browser mein unavailable; text answer milega.","warn");
 else info("Jessi ready · "+voiceStatus(pronounceLang()),getVoice(pronounceLang())?"ok":"warn");
 // Typed Ask: one speech attempt only after the answer has been rendered.
 // For microphone Ask, rec.onend is responsible for speaking after mic releases.
 form.addEventListener("submit",()=>{
  if(sendQueued)return;
  const before=document.querySelectorAll("#cfmAiMessages .cfm-ai-message.assistant .cfm-ai-answer").length;
  Promise.resolve().then(()=>{
   if(!dlg.open)return;
   const after=document.querySelectorAll("#cfmAiMessages .cfm-ai-message.assistant .cfm-ai-answer").length;
   if(after<=before)return;
   const reply=lastAssistant();if(reply){lastSpokenText=reply;if(speakEnabled)speak(reply)}
  });
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