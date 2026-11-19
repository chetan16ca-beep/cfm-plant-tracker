/* CFM V371 label-design freeze. Read-only: never touches Work Orders or stock.
 * Changes to the approved 85 x 45 mm printed label or logo require a conscious
 * user-approved replacement of the pin in this test before deployment can pass.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root=new URL('../',import.meta.url);
const exactApproved={
  'cfm-workorder-stitch-label-v352.js':'4a8e1e6be17baff42c4e39ca1bba6e27f7a0238f',
  'cfm-eagle-brand-v361.js':'9489736fe0488b71efa17409064c40ff2bfc74a6'
};
function gitBlobSha(buffer){
 return createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');
}
test('Approved Eagle Bag Label V371: artwork, layout, font and brand are locked',()=>{
 for(const [file,approvedSha] of Object.entries(exactApproved)){
  const content=readFileSync(new URL(file,root));
  assert.equal(gitBlobSha(content),approvedSha,
    file+' was modified after the approved V371 design freeze. Revert unauthorized artwork changes.');
 }
});
test('The ERP still loads the approved 85 x 45 mm label',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 const label=readFileSync(new URL('cfm-workorder-stitch-label-v352.js',root),'utf8');
 assert.ok(html.includes('cfm-workorder-stitch-label-v352.js?v=371'),'Approved label script URL must remain');
 assert.ok(html.includes('cfm-eagle-brand-v361.js?v=370'),'Approved logo script URL must remain');
 assert.ok(label.includes('@page{size:85mm 45mm;margin:0}'),'True 85x45 mm printing must remain');
 assert.ok(label.includes('const art=pasted?')&&label.includes('vectorLabel()'),'SVG vector printing must remain');
});
