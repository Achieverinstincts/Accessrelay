# AccessRelay build state

Started 8 September 2026, after the competition start. Research and business assumptions: ../research/DECISION.md.

## Target and constraints
Submission-ready, tested hotel accessibility inquiry workflow; zero spending; no subagents. Winning is a target, not a guaranteed outcome.

## Verified setup
- Official recommended vite-react-shadcn Convex template repository returned Repository not found. Recovered using the official Vite React TypeScript scaffold.
- Convex authentication and cloud project creation succeeded. Both development and production function pushes completed.
- LiteAPI sandbox inventory and Groq's hosted OpenAI gpt-oss model are configured server-side in Convex production.
- Firecrawl CLI authentication and real hotel-page map/scrape calls succeeded. Application credentials remain separate.

## Verified checkpoint — 20 September 2026
- Production frontend build passed; all 43 domain, extraction, webhook, URL-safety and inventory tests passed.
- Five controlled-demo Playwright scenarios and the authenticated real-inventory Playwright scenario passed.
- A real LiteAPI property was selected, persisted through Convex and rendered responsively with provider provenance and no invented accessibility facts.
- Firecrawl discovered and scraped official Royal Lancaster pages. A live gpt-oss-120b call correctly produced no room-specific claims from marketing text; the deterministic verifier kept the fields unanswered.
- Convex production is deployed at https://lovable-flamingo-74.convex.cloud.

## In progress
Public frontend publication, production auth origin, app-side Firecrawl credential, AgentMail inbox/webhook, public repository and submission assets.

## Required before completion
- Real AgentMail outbound/inbound verification and app-side Firecrawl action.
- Organizer confirmation that OpenAI gpt-oss on Groq qualifies, or an eligible funded/free OpenAI runtime.
- Genuine target-user feedback (none collected yet).
- Public allowed-host deployment, public repository, root hackathon.md, under-three-minute video, social post and submission.
- Eligibility confirmation (age and permitted residency).

Do not describe any unchecked item as completed or example hotel replies as real evidence.

The computer has 4 GB RAM. Avoid overlapping the Convex local backend, frontend preview and multiple browser workers; the validated runs used one worker and sequential services.
