# Hotel inventory decision — 14 September 2026

Use LiteAPI **sandbox static property content** for the hackathon preview. Do not add booking, rates, payments, paid Places search, or advanced-accessibility add-ons.

## Actual checks

Authenticated GET /v3.0/data/hotels with countryCode=GB, cityName=London, limit=2 returned Royal Lancaster London (lp19e0b) and Montcalm Royal London House (lp99719), with names, addresses, coordinates, stars and static.cupid.travel image URLs. This establishes useful London coverage, not worldwide completeness. The response total is provider-reported and is not treated as a verified count of unique hotels.

GET /v3.0/data/hotel?hotelId=lp19e0b returned property images and named rooms, including Deluxe Corner Room. Website was absent; email was empty. Room names can differ from official-site names. Hotel attributes contained nulls/zeros and must not be read as measurements or negative findings. No rates or availability were requested.

## Fit and constraints

| Need | Decision |
|---|---|
| Real property identity, location and images | Supported in sampled responses; retain provider ID and retrieval timestamp |
| Room-level accessibility measurements | Not reliable from inventory; keep entirely separate from evidence |
| Official source URL and hotel contact | Incomplete; require official page, reviewed recipient; never invent either |
| Global completeness | Unproven; small bounded city searches, explicit empty state, manual official-page fallback |
| No-booking production use | Not commercially cleared; do not claim unlimited free production |
| Zero-cost preview | Sandbox content endpoints only; 24-hour cache, 30 requests/user/day, 100 globally/day |

Official pricing lists Places at $0.01/request and price index at $0.05/request. Other endpoints are subject to terms, fair use and reasonable look-to-book ratios. This nonbooking product therefore needs provider clarification before scaled production. No provider switch is justified yet: supplied sandbox access already delivers the essential metadata, while replacing it would not itself solve room evidence or official contact coverage.

Sources: [hotel listing](https://docs.liteapi.travel/reference/get_data-hotels), [hotel details](https://docs.liteapi.travel/reference/get_data-hotel), [pricing and usage](https://docs.liteapi.travel/reference/api-pricing-usage-costs), [integration guide](https://docs.liteapi.travel/docs/hotel-integration-guide).

## Product value chain

LiteAPI identifies real properties and room names. Convex persists user trips, provider cache, research jobs, reviewed inquiries, replies and events. Firecrawl reads the chosen official source. OpenAI's gpt-oss-120b, served through Groq, extracts candidates from source text; deterministic exact-quote/room/unit checks decide what can become evidence. AgentMail sends a separately approved inquiry and receives replies; sender/thread checks and grounded extraction keep unsupported answers out. Using an OpenAI open-weight model through Groq is not the same as invoking the OpenAI API, and sponsor eligibility for this usage is not yet confirmed.

The supplied env.txt contains LiteAPI sandbox, GroqCloud and Ollama keys. It is ignored by git. Tool-side Firecrawl access does not establish app-side Firecrawl credentials. Do not claim the complete provider chain is live until app actions have been invoked successfully.

## Verification checkpoint — 20 September 2026

- Direct authenticated LiteAPI list and detail requests succeeded. The authenticated Convex smoke persisted Royal Lancaster London, overrode client-supplied identity fields, retained zero accessibility evidence and kept availability `unknown`.
- Firecrawl authenticated on its free tier. A real map request discovered the hotel's official accessibility and Deluxe Corner pages; real scrapes produced IDs recorded in `artifacts/research-smoke.json`.
- A live `openai/gpt-oss-120b` call through Groq processed the Firecrawl room page. The strict verifier accepted zero claims because “wet-room style” and “walk-in shower” do not establish a threshold-free roll-in shower. The product correctly recommends asking the hotel.
- 43 unit tests passed. The production build passed. All five fictional browser scenarios and the authenticated real-inventory browser scenario passed; desktop and mobile screenshots are in `artifacts/`.
- Convex functions and schema are deployed to the production deployment at `https://lovable-flamingo-74.convex.cloud`. LiteAPI and Groq server credentials are configured there.
- AgentMail credentials, Firecrawl application credentials, public frontend publication and a public source repository are still release gates. CLI authentication proves Firecrawl itself, but does not silently expose the stored credential to the Convex app.

Do not claim live automated email or an app-side Firecrawl action until those credentials have been configured and the corresponding production path has completed.
