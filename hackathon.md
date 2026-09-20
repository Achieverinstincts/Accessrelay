# AccessRelay hackathon log

- **Event:** Convex All Gas Hackathon sponsored by OpenAI, Firecrawl and AgentMail
- **Started:** 8 September 2026, after the competition start
- **Product:** A room-specific hotel accessibility evidence and inquiry workspace
- **Convex production:** https://lovable-flamingo-74.convex.cloud
- **Frontend:** https://accessrelay.emmanuelsekyi.chatgpt.site (public Sites deployment)
- **Source repository:** https://github.com/Achieverinstincts/Accessrelay

## Verified build

AccessRelay searches real LiteAPI sandbox inventory, preserves provider identity and images, and keeps inventory metadata separate from accessibility evidence and availability. Users attach the official page for the exact room. Firecrawl reads that source, OpenAI's gpt-oss-120b proposes structured facts through Groq, and deterministic checks reject claims that lack exact room, quote and unit support. Missing and conflicting answers become a reviewed AgentMail inquiry; sending is a separate user action.

On 20 September 2026, Firecrawl mapped and scraped Royal Lancaster London's official accessibility and Deluxe Corner pages. A live model run proposed zero qualifying facts from the room's “wet-room style” and “walk-in shower” language. That is the intended result: those phrases do not prove a threshold-free roll-in shower. AccessRelay kept the field unanswered and recommended asking the hotel.

## Evidence

- 43 unit tests passed.
- Production frontend build passed.
- Five fictional browser workflows passed.
- Authenticated real-inventory browser workflow passed on desktop and mobile.
- Convex development and production pushes succeeded.
- Public Sites production smoke passed account creation and real LiteAPI search.
- Sanitized smoke artifacts and screenshots are stored in `artifacts/`.

## Honest boundary

LiteAPI inventory, Convex production, Firecrawl source acquisition, the live model call, the public source repository and the public Sites frontend are verified. AgentMail credentials and app-side Firecrawl credentials are still being completed. The fictional London workspace is explicitly labeled and never presented as hotel-confirmed evidence.
