(function(){
  const LABELS={
    daily_prompt_delivered:"Weekday prompt delivered",
    mission_available:"Mission available",
    functional_access_available:"Teacher access available",
    weekly_usage_summary_delivered:"Weekly recap delivered",
    weekly_teacher_checkin_distributed:"Weekly Teacher Report distributed"
  };

  function evidenceText(value){
    return value?.suggestion_basis || value?.message || value?.interpretation || "System evidence is incomplete.";
  }
  function suggestion(value){
    if(value?.suggested_status==="yes") return {status:"yes",label:"System supports Yes",cls:"ready"};
    if(value?.suggested_status==="no") return {status:"no",label:"System flags an exception",cls:"needs"};
    return {status:null,label:"Researcher review needed",cls:"off"};
  }
  function prettifyEvidence(root){
    root.querySelectorAll("[data-evidence]").forEach(box=>{
      const small=box.querySelector("small");
      if(!small || !small.textContent.includes("System record:")) return;
      const raw=small.textContent.replace(/^System record:\s*/,"");
      let value;
      try{ value=JSON.parse(raw); }catch{return;}
      const s=suggestion(value);
      box.innerHTML='<span class="evidence-status '+s.cls+'">'+s.label+'</span><small>'+escapeHtml(evidenceText(value))+'</small>';
      if(s.status){
        const key=box.dataset.evidence;
        const radio=root.querySelector('[name="fidelity-'+key+'"][value="'+s.status+'"]');
        if(radio && !root.querySelector('[name="fidelity-'+key+'"]:checked')) radio.checked=true;
      }
    });
  }
  function escapeHtml(value){
    return String(value??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  }
  function updateNoteVisibility(fieldset){
    const checked=fieldset.querySelector('input[type="radio"]:checked')?.value;
    const label=[...fieldset.querySelectorAll("label")].find(x=>x.textContent.trim().startsWith("Note"));
    if(!label) return;
    label.classList.add("fidelity-note-field");
    label.hidden=checked==="yes";
  }
  function compactComponents(root){
    root.querySelectorAll(".fidelity-component").forEach(fieldset=>{
      fieldset.classList.add("fidelity-component-compact");
      const legend=fieldset.querySelector("legend");
      const key=[...fieldset.querySelectorAll('input[type="radio"]')][0]?.name?.replace("fidelity-","");
      if(legend && key && LABELS[key]) legend.textContent=LABELS[key];
      const evidence=fieldset.querySelector("[data-evidence]");
      if(evidence) evidence.classList.add("fidelity-component-evidence");
      const options=fieldset.querySelector(".criterion-options");
      if(options) options.classList.add("fidelity-compact-options");
      fieldset.querySelectorAll('input[type="radio"]').forEach(r=>r.addEventListener("change",()=>updateNoteVisibility(fieldset)));
      updateNoteVisibility(fieldset);
    });
  }
  function wrapReviewTool(section){
    if(section.querySelector(".fidelity-review-tool")) return;
    const scope=section.querySelector("#fidelity-scope");
    const wrap=section.querySelector("#fidelity-form-wrap");
    if(!scope || !wrap) return;
    const label=scope.closest("label");
    const details=document.createElement("details");
    details.className="fidelity-review-tool";
    const summary=document.createElement("summary");
    summary.textContent="Review / confirm a delivery record";
    const body=document.createElement("div");
    body.className="fidelity-review-controls";
    label.parentNode.insertBefore(details,label);
    details.append(summary,body);
    body.append(label,wrap);
  }
  function cleanSection(){
    const section=document.querySelector(".procedural-fidelity");
    if(!section || section.dataset.cleaned==="true") return;
    section.dataset.cleaned="true";
    section.classList.add("delivery-fidelity");

    const eyebrow=section.querySelector("#operations-fidelity");
    if(eyebrow) eyebrow.textContent="Intervention Delivery Fidelity";
    const h2=section.querySelector("h2");
    if(h2) h2.textContent="MR Delivery Fidelity";
    const intro=h2?.nextElementSibling;
    if(intro?.tagName==="P") intro.textContent="Did Mission: Reinforceable deliver the planned intervention components? Teacher mission completion and BSP implementation are separate outcomes.";

    const summary=section.querySelector(".fidelity-summary");
    if(summary){
      summary.classList.add("compact-fidelity-summary");
      const spans=summary.querySelectorAll(":scope > div > span");
      if(spans[0]) spans[0].textContent="Daily delivery";
      if(spans[1]) spans[1].textContent="Weekly delivery";
      if(spans[2]) spans[2].textContent="Overall delivery";
    }

    const reviewCount=[...section.querySelectorAll(":scope > p")].find(p=>p.textContent.includes("Reviews completed:"));
    if(reviewCount) reviewCount.innerHTML=reviewCount.innerHTML.replace("Reviews completed:","Researcher reviews recorded:").replace("Missing periods are not scored.","");

    const note=section.querySelector(".neutral-note");
    if(note) note.innerHTML="<strong>What counts here:</strong> planned email delivery, mission availability, functional teacher access, weekly recap delivery, and Weekly Teacher Report distribution. Mission completion is participation data—not a delivery-fidelity failure.";

    wrapReviewTool(section);
    compactComponents(section);

    const formWrap=section.querySelector("#fidelity-form-wrap");
    if(formWrap){
      new MutationObserver(()=>{compactComponents(section);prettifyEvidence(section);}).observe(formWrap,{childList:true,subtree:true,characterData:true});
    }
    section.addEventListener("change",e=>{
      if(e.target?.id==="fidelity-date") setTimeout(()=>prettifyEvidence(section),150);
      if(e.target?.id==="fidelity-scope") setTimeout(()=>compactComponents(section),50);
    });
  }

  const observer=new MutationObserver(cleanSection);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",cleanSection,{once:true});
  else cleanSection();
})();