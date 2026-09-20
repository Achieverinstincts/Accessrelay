# AccessRelay

Choose your hotels. Tell us what you need. Get specific answers before booking.

**Live app:** https://accessrelay.emmanuelsekyi.chatgpt.site

**Public source:** https://github.com/Achieverinstincts/Accessrelay

AccessRelay compares room-specific accessibility evidence across a traveler's own hotel shortlist. Published statements, hotel replies, missing answers and conflicting measurements remain distinct. Room availability is tracked separately from room features.

## Current status

The primary workflow searches real LiteAPI sandbox inventory, loads real property images and room names, and requires an official hotel source before research. A clearly labeled fictional example remains at `?workspace=demo`. New comparisons start with every accessibility fact unanswered.

Convex production includes account ownership checks, revision-based edits, bounded inventory/research budgets, a 24-hour provider cache and durable research and inquiry records. Firecrawl has been proven against a real official hotel page and gpt-oss-120b has been invoked live through Groq. Deterministic quote, room and unit checks decide whether a model proposal can become evidence. The public Sites deployment has passed account creation and real-inventory search. Live AgentMail and app-side Firecrawl credentials remain release gates; see BUILD_STATE.md and hackathon.md for the exact boundary.

## Development

Requires Node 24 and npm.

```sh
npm ci
npm test
npm run build
node scripts/local-backend.mjs --once
npm run dev -- --host 127.0.0.1 --port 5173
```

The local-backend script enables anonymous local Convex development with a 120-second startup allowance for modest machines. It does not create a paid plan. A public deployment will require a Convex account.

Run `npx playwright test`. The configuration uses installed Microsoft Edge, one worker and the local Vite server. The controlled-demo suite and authenticated real-inventory scenario have passed.

## Runtime credentials

Keep credentials in the deployment environment, never in source or browser variables. The research action uses FIRECRAWL_API_KEY and GROQ_API_KEY. The email integration will require AGENTMAIL_API_KEY, AGENTMAIL_INBOX_ID and a webhook signing secret. A working research connector in Codex does not supply these application credentials.

No paid resources are authorized. The use of OpenAI's open-weight model through Groq still needs organizer confirmation for sponsor eligibility.

## Evidence rules

- Each fact belongs to a specific room and retains its original quote, source and observation date.
- Generic accessibility language cannot become a measurement.
- Conflicting statements require clarification; a later date alone does not erase a conflict.
- Changing requirements immediately recalculates matches.
- Hotel statements are not independent inspections or suitability guarantees.
- AI extraction has no action tools. Its proposals pass structural and quote checks before entering the comparison.

## Layout

- src/domain.ts: comparison, requirements, questions and brief export.
- src/extraction.ts: source-grounding checks and extraction instructions.
- convex/: auth, storage, ownership checks and durable research.
- tests/: domain, extraction and browser scenarios.
- ../research/DECISION.md: opportunity research, competition and validation plan.

A working preview is an intermediate milestone. The AgentMail round trip, feedback and final submission package remain required.
