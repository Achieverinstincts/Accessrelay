# AccessRelay

Choose your hotels. Tell us what you need. Get specific answers before booking.

**Live app:** https://accessrelay.emmanuelsekyi.chatgpt.site

**Public source:** https://github.com/Achieverinstincts/Accessrelay

AccessRelay compares room-specific accessibility evidence across a traveler's own hotel shortlist. Published statements, hotel replies, missing answers and conflicting measurements remain distinct. Room availability is tracked separately from room features.

## Current status

The primary workflow searches real LiteAPI sandbox inventory, loads real property images and room names, and requires an official hotel source before research. A clearly labeled fictional example remains at `?workspace=demo`. New comparisons start with every accessibility fact unanswered.

Convex production includes account ownership checks, revision-based edits, bounded inventory/research budgets, a 24-hour provider cache and durable research and inquiry records. The official Firecrawl Convex component reads the selected official room page, and OpenAI's gpt-oss-120b proposes structured facts through Groq. Deterministic quote, room and unit checks decide whether a model proposal can become evidence. The official AgentMail Convex component provides a durable outbound queue, signed and deduplicated inbound webhooks, thread state and bounded retries.

On 20 September, the public Sites app completed the full production path with a controlled second AgentMail inbox: real LiteAPI property discovery, official-page Firecrawl research, reviewed outbound email, same-thread reply, signed webhook ingest, sender matching, and five source-bound reply statements plus date-specific availability returned to the reactive comparison. The controlled recipient is disclosed in the evidence and is not represented as a real hotel. See `artifacts/sponsor-e2e.json`, `BUILD_STATE.md` and `hackathon.md`.

## Development

Requires Node 24 and npm.

```sh
npm ci
npm test
npm run build
node scripts/local-backend.mjs --once
npm run dev -- --host 127.0.0.1 --port 5173
```

The local-backend script enables anonymous local Convex development with a 120-second startup allowance for modest machines. It does not create a paid plan. `npm ci` also applies a narrow compatibility patch for `@agentmail/convex` 0.1.0, which declares the API key at Convex's isolated component boundary. The patch is guarded and fails if the upstream package changes unexpectedly.

Run `npx playwright test`. The configuration uses installed Microsoft Edge, one worker and the local Vite server. The controlled-demo suite and authenticated real-inventory scenario have passed.

## Runtime credentials

Keep credentials in the deployment environment, never in source or browser variables. Research uses `FIRECRAWL_API_KEY` and `GROQ_API_KEY`; email uses `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` and `AGENTMAIL_WEBHOOK_SECRET`. The setup helpers read local secret files and print only configuration status. A working research connector in Codex does not supply these application credentials.

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

The production product path and captioned demo are verified. Genuine target-user feedback, the social post, eligibility confirmation and hackathon submission remain required before claiming the entry is complete.
