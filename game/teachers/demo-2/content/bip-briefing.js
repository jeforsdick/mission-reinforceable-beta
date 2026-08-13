/* MR-DEMO-2 plan briefing injection.
 * Keeps the shared engine generic while ensuring each mission opens with Kai's own plan briefing.
 */
(function addDemo2BIPBriefing() {
  if (typeof POOL === 'undefined') return;

  const briefing = `Kai may have difficulty when routines are long, crowded, or when access to a preferred option changes.
Your job is to choose responses that follow Kai's plan:
* offer two safe, manageable choices,
* use a brief, specific direction or an incompatible action,
* prompt a break, alternate-work, or alternate-seating request,
* reinforce the first appropriate response right away.
Avoid unnecessary no/stop statements, public correction, threats, or turning the moment into a power struggle.`;

  ['daily', 'wild', 'crisis'].forEach(mode => {
    const missions = POOL[mode] || [];
    missions.forEach(mission => {
      const step = mission && mission.steps && mission.steps[mission.start];
      if (!step || !step.text || /BIP Briefing:/i.test(step.text)) return;
      step.text = `BIP Briefing:\n${briefing}\n\nScene:\n${step.text}`;
    });
  });
})();
