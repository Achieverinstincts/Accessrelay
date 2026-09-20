/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as env from "../env.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as inquiries from "../inquiries.js";
import type * as inquiryActions from "../inquiryActions.js";
import type * as inventory from "../inventory.js";
import type * as inventoryValidators from "../inventoryValidators.js";
import type * as research from "../research.js";
import type * as researchActions from "../researchActions.js";
import type * as trips from "../trips.js";
import type * as validators from "../validators.js";
import type * as webhookVerification from "../webhookVerification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  env: typeof env;
  events: typeof events;
  http: typeof http;
  inquiries: typeof inquiries;
  inquiryActions: typeof inquiryActions;
  inventory: typeof inventory;
  inventoryValidators: typeof inventoryValidators;
  research: typeof research;
  researchActions: typeof researchActions;
  trips: typeof trips;
  validators: typeof validators;
  webhookVerification: typeof webhookVerification;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agentmail: import("@agentmail/convex/_generated/component.js").ComponentApi<"agentmail">;
  firecrawl: import("@firecrawl/firecrawl-convex/_generated/component.js").ComponentApi<"firecrawl">;
};
