# AccessRelay submission package

## Title

AccessRelay — room-specific accessibility evidence before you book

## One-line pitch

AccessRelay turns vague hotel accessibility labels into a traveler-controlled record of exact room evidence, unanswered questions and hotel confirmations.

## Description

Hotel listings often say “accessible” without answering the detail that determines whether a specific traveler can use a specific room. AccessRelay starts with the traveler’s requirements and real LiteAPI property data. Firecrawl reads the official page for the selected room. OpenAI’s gpt-oss-120b proposes structured facts, while deterministic checks require an exact quote, room scope and unit before anything becomes evidence.

Missing and conflicting details become a precise draft that the traveler must review. AgentMail then provides durable delivery, thread state and signed inbound webhooks. A reply is accepted only from the approved hotel address and thread. Convex stores the workspace, permissions, budgets, evidence revisions and activity trail, then streams every accepted update to the UI.

The product deliberately keeps room availability separate from physical accessibility and leaves weak claims unknown. It does not book, rank suitability or substitute for the traveler’s judgment.

## Links

- Live app: https://accessrelay.emmanuelsekyi.chatgpt.site
- Public repository: https://github.com/Achieverinstincts/Accessrelay
- Convex production: https://lovable-flamingo-74.convex.cloud
- 77-second demo: https://github.com/Achieverinstincts/Accessrelay/raw/main/artifacts/accessrelay-demo.mp4

## Sponsor technology

- **Convex:** password auth, ownership, reactive trips, component state, revisions, budgets, scheduled reconciliation, audit events and production HTTP actions.
- **Firecrawl:** official Convex component scrapes the traveler-selected official room page. Weak marketing language correctly produced zero accepted claims in the production proof.
- **AgentMail:** official Convex component provides the inbox, durable outbound workpool, bounded retry state, signed webhook ingest and threaded reply flow.
- **OpenAI:** gpt-oss-120b performs tool-free structured extraction; deterministic application code makes the final evidence decision. Codex was used throughout implementation and review.

## Verified proof

- 43 unit tests pass.
- Production build and Convex deployment pass.
- Public sign-up and real LiteAPI inventory search pass.
- Production sponsor-stack scenario completed in 148 seconds with zero browser errors.
- Unsigned AgentMail webhook requests return HTTP 401.
- The controlled reply yielded five exact, accepted statements and date-specific availability.

## Honest disclosure

The email round trip used a second AgentMail inbox controlled by AccessRelay. It proves the complete technical workflow and is not presented as a real hotel response. Independent target-user feedback has not yet been collected.
