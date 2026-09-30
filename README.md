# Signify

An ASL vocabulary avatar demo built with React, TypeScript, Vite and Three.js. The existing character, dark interface, colors, conversation layout and playback controls are retained. The audio/text hashing feature and its route have been removed.

## Run and verify

```sh
npm install
npm run dev
node scripts/build-demo-assets.mjs
npx tsc --noEmit
npm run lint
npm run build
npm test
```

On Windows, use `npm.cmd` / `npx.cmd` if PowerShell blocks script shims. Playwright uses installed Google Chrome.

## Actual vocabulary

23 distinct procedural clips are installed:

Hi; Hello; Good morning; Thank you; I love you; Bye; Yes; No; Please; Sorry; Help; Welcome; Name; Family; Food; Eat; Water; School; Work; Mother; Father; Where; What.

Aliases: **Goodbye → Bye**, **Mom → Mother**, **Dad → Father**. Aliases represent the same concept and do not inflate the animation count. `Name` means the lexical sign NAME, not arbitrary personal names. `Welcome` uses the invitation sense, not a response to thanks. `Work` means labor/employment, not “that works.”

Supported multiword entries: **Good morning**, **Thank you**, **I love you**. I love you is the lexicalized ILY handshape, not fingerspelling. Sequences such as **Hello, please, help. Thank you!** play in order. This is vocabulary playback, not English-to-ASL sentence translation; it does not supply ASL grammar or infer meaning from arbitrary sentences.

The searchable panel and suggestions read the catalog. Capitalization, whitespace and punctuation are normalized; longest phrases match before words. Every unsupported token is reported and blocks the entire sequence. Unknown words are never silently skipped or replaced. There is no fingerspelling fallback; personal names such as Alice remain unsupported.

## Source and validation status

All clips are original project-authored keyframes guided by ASL University / Lifeprint references, not motion-capture assets or downloaded reference media. Each catalog entry contains its source URL, description, handedness, aliases, and `validation: reference-demo`. Reviewer fields are deliberately blank. See the complete per-sign [source manifest](public/signing/asl-demo/REFERENCES.md), also linked per sign in the UI.

Reference pages were consulted during implementation. **No clip has independent review by a qualified ASL signer.** Software verification establishes motion and mapping behavior, not accurate language production. Handshape contact and naturalness still need that review.

## Rig and playback

The existing procedural avatar has 38 signing controls: on each side, shoulder, upper arm, forearm, wrist, and three joints on each of five digits. The finger chains have stable track names. The right-hand index-to-little ordering was mirrored correctly so the index is adjacent to the thumb; child segments no longer accumulate unintended depth offsets.

The authoring helpers accept independent MCP/PIP/DIP angles and base spread for each finger, plus independent thumb-base opposition and both thumb flexion joints. Both arms use wrist-target inverse kinematics, shoulder participation and forearm roll. Conservative digit/wrist limits are shared between generation and playback. Smoothstep quaternion interpolation supplies entry, movement, hold and exit; sequence transitions use the same clock as captions and playback controls. Every generated clip includes both arms, explicitly resetting unused joints.

Two-handed clips: Good morning, Help, Name, Family, School, Work, What. The remaining clips keep the left arm at rest. Both shoulders, elbows, wrists and all 30 digit joints are exercised across the pack. Missing bones and incomplete animation mappings fail visibly rather than partially playing.

Limitations: the body uses rigid mesh segments attached to bones, not a deforming skinned human mesh. There are no independent palm/metacarpal deformation controls, collision solver, exact fingertip contact constraints, or anatomical muscle simulation. Three thumb controls approximate CMC/MCP/IP; elbow roll is simplified. Wrist limits may alter requested reference orientation. Eyebrow/head motion is available but full facial grammar, mouth shapes and gaze are not modeled. Retargeting arbitrary external rigs is not implemented.

## Speech input

The microphone uses browser SpeechRecognition where available. Interim/final recognition text is displayed while listening; the final transcript fills the editable input and calls the exact same `submit → resolveDemoInput → resolveInput` pipeline as typed text. Preparing a sign does not autoplay it: press Play. Recognition errors, permission denial, no speech, missing microphone and start failure are shown; typing remains available after failure or when the API is unavailable. Starting a new recording clears the previous playback plan.

Browser recognition may use its provider's online service and requires an appropriate browser/security context. The app does not record or hash audio itself.

Automated tests use a mocked recognition API to verify transcript display, shared sequence preparation, permission denial, no speech, unavailable API and start failure. **Live microphone capture and recognition remain unverified in this environment.**

## Checks

Tests cover all labels and aliases, phrase precedence, sequence order and timing, unknown inputs, unique motion assets, both-arm mappings, independent distal-joint control, joint limits, one-handed isolation, reset, pause/replay/speed, searchable vocabulary, missing assets, mobile overflow and speech error paths. Browser screenshots are written under `test-results/`.

The existing video-to-speech/gesture recording prototype is separate; its recognition vocabulary was not expanded by this change.

Verification result for this update: TypeScript passed; production build passed; 20 Playwright checks passed, followed by 3 passing targeted checks after the Help/Good morning contact adjustments. Browser screenshots were reviewed for articulated hand shapes and support-arm placement. Lint has zero errors and one pre-existing `useCallback` dependency warning in `SignToSpeech.tsx`; the build retains a nonfatal large Three.js chunk warning. Live microphone input and independent ASL linguistic validation were not performed.
