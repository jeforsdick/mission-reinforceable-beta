# Fidelity coverage validator

Run the validator against one teacher folder, optionally with a development-only expected-target manifest:

```sh
node scripts/fidelity-coverage-validator.js game/teachers/demo-2 game/teachers/demo-2/fidelity-targets.expected.json
node scripts/fidelity-coverage-validator.js game/teachers/demo-2 game/teachers/demo-2/fidelity-targets.expected.json --json
```

The manifest contains only stable `target_key` and `domain` strings. It must never contain Supabase UUIDs or identifying data, and it is not used by game runtime. The validator loads the daily, wildcard, and crisis mission files declared by the teacher config. A target belongs on the decision step's `meta.fidelityTargetKey`; the choices describe possible responses, so one step is one fidelity opportunity regardless of its number of choices.

Malformed step keys, arrays/multiple-key fields, and clear step-level BIP-component/domain conflicts are hard errors. Fewer than three opportunities, coverage in only one mission, and more than two opportunities in one mission are recommendations reported as warnings. Choice-level target keys are reported as legacy metadata to migrate; choice `bipComponent` values remain descriptive and are not compared with the step target because distractors may intentionally use other strategy types.

The current content architecture has no reliable explicit marker for a crisis fidelity action. Consequently, the validator reports that limitation for a `crisis_*` key rather than inferring compatibility from mission type. An explicit crisis marker should be standardized before crisis-key validation is made enforceable.

This tool is intended eventually to run before protected Supabase game content is generated or updated, catching missing, mistyped, and poorly distributed fidelity keys before deployment. It is deliberately not connected to the protected seed builder yet, so validation remains non-invasive and runtime behavior is unchanged.
