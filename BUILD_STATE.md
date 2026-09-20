# AccessRelay build state

Started 8 September 2026, after the competition start. Research and business assumptions: ../research/DECISION.md.

## Target and constraints
Submission-ready, tested hotel accessibility inquiry workflow; zero spending; no subagents. Winning is a target, not a guaranteed outcome.

## Verified setup
- Official recommended vite-react-shadcn Convex template repository returned Repository not found. Recovered using the official Vite React TypeScript scaffold.
- Convex authentication and cloud project creation succeeded. Both development and production function pushes completed.
- LiteAPI sandbox inventory and Groq's hosted OpenAI gpt-oss model are configured server-side in Convex production.
- Firecrawl CLI authentication and real hotel-page map/scrape calls succeeded. The production application now uses the official Firecrawl Convex component with a deployment-scoped key.

## Verified checkpoint — 20 September 2026
- Production frontend build passed; all 43 domain, extraction, webhook, URL-safety and inventory tests passed.
- Five controlled-demo Playwright scenarios and the authenticated real-inventory Playwright scenario passed.
- A real LiteAPI property was selected, persisted through Convex and rendered responsively with provider provenance and no invented accessibility facts.
- Firecrawl discovered and scraped official Royal Lancaster pages. A live gpt-oss-120b call correctly produced no room-specific claims from marketing text; the deterministic verifier kept the fields unanswered.
- Convex production is deployed at https://lovable-flamingo-74.convex.cloud.
- The public Sites deployment at https://accessrelay.emmanuelsekyi.chatgpt.site passed a production smoke test: JavaScript loaded, a fresh Convex password account was created, and production LiteAPI search returned Royal Lancaster London.
- The official Firecrawl and AgentMail Convex components are deployed in production.
- A controlled production scenario completed real inventory discovery, source research, one approved email, same-thread reply, signed webhook ingestion, sender matching and deterministic evidence acceptance.
- The controlled reply added five supported room statements and confirmed date-specific availability; `artifacts/sponsor-e2e.json` records the result and disclosure.
- Unsigned webhook delivery is rejected with HTTP 401. No browser errors occurred during the 148-second public scenario.
- A captioned production demo was visually checked and trimmed to 76.96 seconds; `artifacts/accessrelay-demo.mp4` is 1.63 MB. Its final visible caption identifies the controlled AgentMail inbox.

## In progress
Social proof, genuine feedback and final submission.

## Required before completion
- Organizer confirmation that OpenAI gpt-oss on Groq qualifies, or an eligible funded/free OpenAI runtime.
- Genuine target-user feedback (none collected yet).
- Social post and submission.
- Eligibility confirmation (age and permitted residency).

Do not describe any unchecked item as completed or example hotel replies as real evidence.

The computer has 4 GB RAM. Avoid overlapping the Convex local backend, frontend preview and multiple browser workers; the validated runs used one worker and sequential services.
