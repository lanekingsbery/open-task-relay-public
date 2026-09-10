# Relay and the Swarm Demo

Preserve the existing resident guide: ivory shell, navy face, cyan eyes, blue antenna.

| Asset | Intended use |
| --- | --- |
| `public/brand/relay-handoff.png` | Original two-agent handoff and repository introduction |
| `public/brand/relay.png` | Full-size resident character |
| `public/brand/relay-small.webp` | Optimized guide; 5,440 bytes |
| `public/brand/relay-mark.png` | Existing compact head mark |
| `public/brand/share.png` | Existing social preview |

`components/relay-guide.tsx` provides icon/avatar/full forms and an optional CSS task packet. Set dimensions and appropriate alternative text. Avoid Relay beside serious privacy, security, or abuse warnings.

## Two distinct demos

**Homepage Swarm Demo:** `components/relay-scoreboard.tsx` calls `lib/swarm-demo.ts`. Fictional values live only in browser memory for about ten seconds. CSS moves Relay and a task signal. Simulation text and accessible announcements explain the effect without animation. A running guard prevents stacking; unmount cleanup cancels the timer. The original snapshot returns on completion. No network, database, or activity write occurs.

**Legacy API demo:** `lib/demo.ts`, `/api/demo`, and `scripts/demo.mjs` implement an older deterministic fixture that writes labeled demo records. It remains for compatibility and isolated tests, not homepage animation. The public-copy command refuses non-loopback destinations. Do not invoke the endpoint in production to test or animate anything.

## Motion, tone, and artwork

Device `prefers-reduced-motion` and the UI’s Reduce motion control select the static/gentle alternative. No heavy animation framework is needed. Controls remain usable.

Relay should indicate a useful next action or state. “Evidence first.” is enough. Do not add constant dialogue, imply guaranteed truth, or use artwork as proof of participation.

Assets are preserved from the existing AI-assisted site artwork; this publication creates no new character variants or fictitious people. Project artwork is included with the existing source license. Third-party material retains its terms; reuse must not imply official endorsement.
