/* EFPPL authentic eagle head traced from user-supplied corporate artwork, V361.
 * Monochrome printable vector; no image upscaling, no external network dependency.
 */
(function(){
'use strict';
const path="M93,99L85,103L74,113L71,114L69,110L72,106L75,96L80,87L78,87L56,104L23,134L25,136L28,135L32,136L35,135L37,136L62,136L63,135L71,136L79,125L80,121Z M148,57L145,56L143,59L146,60Z M111,48L123,58L126,58L130,54L131,55L135,54L123,48L119,47Z M173,19L169,21L164,29L166,38L172,44L182,45L184,44L184,38L181,34L183,31L183,28L180,25L178,26L173,23L175,21L181,21L184,23L184,21L181,19Z M176,33L182,39L182,42L179,44L175,43L173,40L175,38L174,35Z M176,26L178,26L180,29L178,31L174,29Z M170,23L172,24L172,39L171,40L167,36L167,27Z M167,60L163,54L153,46L152,39L146,33L130,22L118,17L105,14L95,14L94,13L81,14L80,20L78,22L55,28L53,30L50,30L27,45L16,57L6,74L2,89L0,91L1,92L0,116L2,118L3,131L5,135L7,135L36,109L62,88L82,67L81,65L72,67L69,69L65,67L85,49L84,48L63,49L61,45L83,33L91,32L97,34L118,35L140,43L143,46L145,51L150,52L161,61L162,67L164,69L165,77L163,80L154,73L137,71L134,68L138,64L136,64L131,70L124,73L132,76L134,79L120,86L111,95L110,99L99,113L87,133L88,136L90,135L115,136L116,135L115,133L116,108L123,96L136,85L146,82L157,83L162,88L163,95L164,95L167,90L170,79L170,72Z";
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
function symbol(width=70,height=54,color='#111'){
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 142" width="'+width+'" height="'+height+'" aria-label="Eagle corporate head logo"><path d="'+path+'" fill="'+esc(color)+'" fill-rule="evenodd"/></svg>';
}
function draw(ctx,x,y,width,height,color='#111'){
 if(!ctx||typeof Path2D==='undefined')return;
 ctx.save();ctx.translate(x,y);ctx.scale(width/185,height/142);ctx.fillStyle=color;
 ctx.fill(new Path2D(path),'evenodd');ctx.restore();
}
window.CFM_EAGLE_BRAND=Object.freeze({logoPath:path,logoSvg:symbol,drawLogo:draw,name:'EAGLE FILTRATION PRODUCT PVT. LTD.',mail:'info@eaglefiltrations.com',web:'www.eaglefiltrations.com',phone:'+91 70416 70091',since:'1992'});
})();
