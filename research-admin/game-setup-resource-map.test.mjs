import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RESOURCE_SECTIONS, captureResourceOpenSections, hasUnsupportedResourceBlocks, normalizeResourceMap, renderGameCreation, resetMissionAuthoringState, restoreResourceOpenSections, setupFromWorkspace } from './game-creation-ui.mjs';
const admin = await readFile(new URL('./admin.js', import.meta.url), 'utf8');
const workspace = { case_id:'a', case_code:'CASE-001', student_alias:'Sky', mission_drafts:[], setup_draft:{setup:{schemaVersion:1,bipBriefing:'Saved plan'}}, resource_draft:{resources:{schemaVersion:1,sections:{bip:{title:'Old title',blocks:[{type:'paragraph',text:'Plan'}]}}}} };

test('Game Setup loads saved briefing above Mission Bank and saves through the existing RPC',()=>{const html=renderGameCreation(workspace);assert.ok(html.indexOf('class="builder-section game-setup"')<html.indexOf('class="mission-bank"'));assert.match(html,/id="bip-briefing"[\s\S]*Saved plan/);assert.deepEqual(setupFromWorkspace(workspace),{schemaVersion:1,bipBriefing:'Saved plan',weeklyTeacherReport:{targetBehavior:'',replacementBehavior:'',targetRoutine:''}});assert.match(admin,/research_admin_save_game_setup_draft/);assert.match(admin,/target_setup: state\.setupDraft/);});
test('Resource Map normalizes all canonical sections and preserves valid and unsupported blocks',()=>{const resources=normalizeResourceMap(workspace.resource_draft.resources);assert.deepEqual(Object.keys(resources.sections),Object.keys(RESOURCE_SECTIONS));assert.equal(resources.sections.bip.title,'BIP at a Glance');assert.deepEqual(resources.sections.bip.blocks,[{type:'paragraph',text:'Plan'}]);resources.sections.coaching.blocks.push({type:'legacyThing',payload:{keep:true}});assert.equal(hasUnsupportedResourceBlocks(resources),true);const html=renderGameCreation(workspace,null,null,undefined,'',{},'',undefined,resources);for(const [key,[title]] of Object.entries(RESOURCE_SECTIONS)){assert.match(html,new RegExp(`data-section-key="${key}"`));assert.match(html,new RegExp(title));}assert.match(html,/Unsupported legacy Resource Map content/);});
test('all supported blocks and accessible editing controls render while incomplete drafts remain saveable',()=>{const resources=normalizeResourceMap();resources.sections.bip.blocks=[{type:'paragraph',text:''},{type:'list',items:['']},{type:'definitionList',items:[{term:'',definition:''}]},{type:'callout',label:'',text:''}];const html=renderGameCreation(workspace,null,null,undefined,'',{},'',undefined,resources);for(const text of ['Paragraph','Bullet List','Definition List','Callout','Move Up','Move Down','Remove Block','Add item','Add row','Save Resource Map Draft'])assert.match(html,new RegExp(text));assert.match(admin,/research_admin_save_resource_map_draft/);assert.match(admin,/target_resources: state\.resourceDraft/);assert.doesNotMatch(admin,/localStorage|case_game_content/);});
test('case reset clears setup, resource, and temporary accordion state',()=>{const state={setupDraft:{bipBriefing:'A'},resourceDraft:{private:'A'},resourceOpenSections:['bip']};resetMissionAuthoringState(state);assert.equal(state.setupDraft,null);assert.equal(state.resourceDraft,null);assert.deepEqual(state.resourceOpenSections,[]);});

test('Resource Map open keys are captured and restored without browser or database persistence',()=>{
  const sections = ['bip','prevention','coaching'].map((key,index)=>({dataset:{sectionKey:key},open:index!==1}));
  const root={querySelectorAll(selector){return selector==='.resource-section[open]'?sections.filter(section=>section.open):sections;}};
  assert.deepEqual(captureResourceOpenSections(root),['bip','coaching']);
  sections.forEach(section=>{section.open=false;});
  restoreResourceOpenSections(root,['bip','coaching']);
  assert.deepEqual(sections.filter(section=>section.open).map(section=>section.dataset.sectionKey),['bip','coaching']);
  assert.match(admin,/state\.resourceOpenSections = captureResourceOpenSections\(panel\)[\s\S]*panel\.innerHTML[\s\S]*bindSetupAndResources\(\)[\s\S]*restoreResourceOpenSections\(panel, state\.resourceOpenSections\)/);
  assert.doesNotMatch(admin,/localStorage|sessionStorage/);
});

test('all Resource Map editing and save redraws use the accordion-preserving redraw path',()=>{
  const controls=admin.slice(admin.indexOf('function bindSetupAndResources'),admin.indexOf('function bindMissionBuilder'));
  assert.match(controls,/\[data-add-block\][\s\S]*redrawGameCreation\(\)/);
  for(const selector of ['data-block-action','data-item-add','data-item-remove']) assert.match(controls,new RegExp(`\\[${selector}\\][\\s\\S]*redrawGameCreation\\(\\)`));
  const save=admin.slice(admin.indexOf('async function saveResourceMap'),admin.indexOf('function fidelityPanel'));
  assert.match(save,/redrawGameCreation\(\)/);
});

test('protected game chrome and briefing never expose case code or Jordan fallback',async()=>{const [app,engine]=await Promise.all([readFile(new URL('../game/js/app.js',import.meta.url),'utf8'),readFile(new URL('../game/js/engine.js',import.meta.url),'utf8')]);assert.match(app,/textContent = `Study ID: \$\{MR\.participantCode\}`/);assert.doesNotMatch(app,/Study ID:[^\n]*Case:/);assert.match(engine,/configuredBriefing \|\| publicDemoBriefing \|\| UNCONFIGURED_BIP_BRIEFING/);assert.match(engine,/fixtureId === 'fictional-public-demo'/);});

const functionBody = name => {
  const start = admin.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const tail = admin.slice(start + 10);
  const boundary = tail.search(/\n(?:async )?function /);
  const next = boundary < 0 ? -1 : start + 10 + boundary;
  return admin.slice(start, next < 0 ? admin.length : next);
};
test('initial bindDetail and every redraw bind setup and Resource Map controls',()=>{assert.match(functionBody('bindDetail'),/bindMissionBuilder\(\);[\s\S]*bindSetupAndResources\(\);/);assert.match(functionBody('redrawGameCreation'),/bindMissionBuilder\(\);[\s\S]*bindSetupAndResources\(\);/);});
test('one non-recursive preservation path captures mission, setup, and Resource Map forms',()=>{const preserve=functionBody('preserveAllAuthoringForms');assert.match(preserve,/captureMission\(root, state\.missionDraft, state\.missionNav\)/);assert.match(preserve,/captureSetupAndResourceForms\(\)/);assert.doesNotMatch(functionBody('captureSetupAndResourceForms'),/preserveAllAuthoringForms/);});
test('Resource Map redraw actions and mission navigation preserve all authoring forms first',()=>{const resources=functionBody('bindSetupAndResources'),missions=functionBody('bindMissionBuilder');assert.equal((resources.match(/preserveAllAuthoringForms\(\)/g)||[]).length,4);assert.doesNotMatch(resources,/preserveSetupAndResources|preserveMissionForm/);assert.equal((missions.match(/preserveAllAuthoringForms\(\)/g)||[]).length,3);assert.match(missions,/preserveAllAuthoringForms\(\); state\.missionNav\.decision/);assert.match(missions,/preserveAllAuthoringForms\(\); state\.missionNav\.branch/);});
test('each save preserves all forms and replaces only its own reloaded draft state',()=>{const mission=functionBody('saveMissionDraft'),setup=functionBody('saveGameSetup'),resources=functionBody('saveResourceMap');for(const body of [mission,setup,resources])assert.match(body,/preserveAllAuthoringForms\(\)/);assert.match(mission,/state\.missionDraft = normalizeMission/);assert.doesNotMatch(mission,/state\.(?:setupDraft|resourceDraft)\s*=/);assert.match(setup,/state\.setupDraft = setupFromWorkspace/);assert.doesNotMatch(setup,/state\.(?:missionDraft|resourceDraft)\s*=/);assert.match(resources,/state\.resourceDraft = resourcesFromWorkspace/);assert.doesNotMatch(resources,/state\.(?:missionDraft|setupDraft)\s*=/);});
test('Check Full Draft preserves unsaved browser forms but validates only its temporary saved RPC response',()=>{const check=functionBody('checkFullDraft');assert.match(check,/preserveAllAuthoringForms\(\)[\s\S]*research_admin_game_authoring_workspace/);assert.match(check,/validateFullDraft\(data\)/);assert.doesNotMatch(check,/validateFullDraft\(state\./);assert.match(check,/validateFullDraft\(data\)[\s\S]*redrawGameCreation\(\)/);});
