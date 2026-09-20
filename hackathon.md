# AccessRelay hackathon log

- **Event:** Convex All Gas Hackathon sponsored by OpenAI, Firecrawl and AgentMail
- **Started:** 8 September 2026, after the competition start
- **Product:** A room-specific hotel accessibility evidence and inquiry workspace
- **Convex production:** https://lovable-flamingo-74.convex.cloud
- **Frontend:** https://accessrelay.emmanuelsekyi.chatgpt.site (public Sites deployment)
- **Source repository:** https://github.com/Achieverinstincts/Accessrelay

## Verified build

AccessRelay searches real LiteAPI sandbox inventory, preserves provider identity and images, and keeps inventory metadata separate from accessibility evidence and availability. Users attach the official page for the exact room. The official Firecrawl Convex component reads that source, OpenAI's gpt-oss-120b proposes structured facts through Groq, and deterministic checks reject claims that lack exact room, quote and unit support. Missing and conflicting answers become a reviewed inquiry. The official AgentMail Convex component queues only the message the user approved, applies bounded retries, persists thread state and ingests signed, deduplicated reply webhooks.

On 20 September 2026, Firecrawl mapped and scraped Royal Lancaster London's official accessibility and Deluxe Corner pages. A live model run proposed zero qualifying facts from the room's “wet-room style” and “walk-in shower” language. That is the intended result: those phrases do not prove a threshold-free roll-in shower. AccessRelay kept the field unanswered and recommended asking the hotel.

The same day, the public Sites app completed a production sponsor-stack proof. A traveler selected Royal Lancaster London from LiteAPI sandbox inventory, researched its official Deluxe Corner page through the Firecrawl component, reviewed and approved one inquiry, and sent it through the AgentMail component to a controlled second AgentMail inbox. A controlled same-thread reply passed the signed webhook, inbox and sender checks. The model proposed five exact statements, the deterministic verifier accepted all five, and the Convex subscription updated the comparison and activity log. This is an integration test, not a real hotel response.

## Evidence

- 43 unit tests passed.
- Production frontend build passed.
- Five fictional browser workflows passed.
- Authenticated real-inventory browser workflow passed on desktop and mobile.
- Convex development and production pushes succeeded.
- Public Sites production smoke passed account creation and real LiteAPI search.
- Official Firecrawl and AgentMail Convex components are installed in production.
- Production sponsor-stack scenario passed in 148 seconds with no browser errors.
- Unsigned AgentMail webhook request returned HTTP 401.
- Controlled reply added five source-supported room statements and confirmed date-specific availability.
- Captioned production demo is 76.96 seconds, below the three-minute limit, with the controlled-inbox disclosure visible in the video.
- Sanitized smoke artifacts and screenshots are stored in `artifacts/`.

## Honest boundary

LiteAPI inventory, Convex production, app-side Firecrawl, the live model call, AgentMail outbound/inbound transport, the public source repository and the public Sites frontend are verified. The end-to-end email proof used a controlled AgentMail recipient and is labeled as such. No real hotel has answered and no target-user interview has been completed. The fictional London workspace is explicitly labeled and never presented as hotel-confirmed evidence.
