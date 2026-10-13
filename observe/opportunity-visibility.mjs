// Keep a newly opened fidelity opportunity visible while the observer is scoring.
// Desktop scrolls the internal fidelity list; narrow layouts scroll the page.
export function revealTrainingOpportunity(list,targetId) {
  if(!list || !targetId)return false;
  const row=Array.from(list.querySelectorAll("[data-training-target-id]"))
    .find(element=>element.dataset.trainingTargetId===targetId);
  const entry=row?.querySelector(".training-opportunity-entry");
  if(!entry)return false;
  const view=list.ownerDocument?.defaultView;
  const overflow=view?.getComputedStyle(list)?.overflowY||"";
  const internallyScrollable=/^(auto|scroll)$/.test(overflow)
    && list.scrollHeight>list.clientHeight+1;
  if(internallyScrollable){
    const listBox=list.getBoundingClientRect();
    const entryBox=entry.getBoundingClientRect();
    const desired=list.scrollTop+entryBox.top-listBox.top-12;
    list.scrollTop=Math.max(0,Math.min(desired,list.scrollHeight-list.clientHeight));
  }else{
    entry.scrollIntoView({behavior:"auto",block:"center",inline:"nearest"});
  }
  entry.querySelector(".fidelity-choice")?.focus({preventScroll:true});
  return true;
}
