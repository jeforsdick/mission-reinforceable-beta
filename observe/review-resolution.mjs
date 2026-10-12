// Pure review-screen helpers shared by Nora and Kai. No training data is sent by these helpers.
export function unresolvedReviewOutcomes(attempt) {
  return (attempt?.fidelityOpportunities || []).filter(event =>
    event.implementation === "implemented" && !["yes","no","unclear"].includes(event.desired_outcome)
  );
}

export function editReviewOpportunity(attempt, eventId, action, value) {
  if (!attempt || !Array.isArray(attempt.fidelityOpportunities)) return false;
  const index=attempt.fidelityOpportunities.findIndex(event => event.event_id === eventId);
  if (index < 0) return false;
  const event=attempt.fidelityOpportunities[index];
  if (action === "implementation") {
    if (!["implemented","not_implemented"].includes(value)) return false;
    event.implementation=value;
    // An outcome is required only when the observer recorded plan implementation.
    if(value === "not_implemented") event.desired_outcome=null;
  } else if (action === "outcome") {
    if(event.implementation !== "implemented" || !["yes","no","unclear"].includes(value)) return false;
    event.desired_outcome=value;
  } else if (action === "remove") {
    attempt.fidelityOpportunities.splice(index,1);
  } else return false;
  return true;
}

const escapeReview = value => String(value ?? "").replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[ch]);
const scoreText = value => value === "implemented" ? "Implemented as Written" :
  value === "not_implemented" ? "Not Implemented as Written" : "No Opportunity";

export function renderReviewTarget(item,index,events,score) {
  const outcomeDescription=escapeReview(item.desiredOutcome || "The intended student response described in the plan.");
  const records=events.length ? events.map((event,n)=>{
    const id=escapeReview(event.event_id);
    const time=Math.max(0,Math.floor(Number(event.elapsed_seconds)||0));
    const clock=String(Math.floor(time/60)).padStart(2,"0")+":"+String(time%60).padStart(2,"0");
    const implementation=["implemented","not_implemented"].includes(event.implementation) ? event.implementation : "not_implemented";
    const implButtons=[["implemented","Implemented as Written"],["not_implemented","Not Implemented as Written"]].map(([value,label]) =>
      '<button type="button" class="review-edit-button'+(implementation===value?' selected':'')+
      '" data-review-implementation="'+id+'" data-review-value="'+value+
      '" aria-pressed="'+(implementation===value)+'">'+label+'</button>'
    ).join("");
    const outcomeButtons=implementation==="implemented"
      ? '<fieldset class="review-rating-field"><legend>Did the desired outcome occur?</legend><p class="review-outcome-definition">'+outcomeDescription+'</p><div class="review-edit-actions">'+
        [["yes","Yes"],["no","No"],["unclear","Not clear"]].map(([value,label]) =>
          '<button type="button" class="review-edit-button'+(event.desired_outcome===value?' selected':'')+
          '" data-review-outcome="'+id+'" data-review-value="'+value+
          '" aria-pressed="'+(event.desired_outcome===value)+'">'+label+'</button>'
        ).join("")+'</div></fieldset>'
      : '<p class="review-rating-not-needed">Outcome rating not required when not implemented as written.</p>';
    return '<div class="review-opportunity-item"><div class="review-opportunity-meta"><strong>Opportunity '+(n+1)+
      '</strong><span>Recorded at +'+clock+'</span></div>'+
      '<fieldset class="review-rating-field"><legend>Teacher implementation</legend><div class="review-edit-actions">'+implButtons+
      '</div></fieldset>'+outcomeButtons+
      '<button type="button" class="review-remove-opportunity" data-review-remove="'+id+
      '">Remove accidental opportunity</button></div>';
  }).join("") : '<p class="review-no-opportunity">No opportunity recorded. Scored as No Opportunity.</p>';
  return '<article class="review-fidelity-row"><div class="review-target-description"><strong>'+
    (index+1)+'. '+escapeReview(item.short)+'</strong><small>'+escapeReview(item.detail)+
    '</small><span class="review-rollup">Summary: '+scoreText(score)+'</span></div>'+
    '<div class="review-opportunity-list">'+records+'</div></article>';
}
