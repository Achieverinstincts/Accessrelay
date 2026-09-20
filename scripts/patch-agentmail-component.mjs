// @agentmail/convex 0.1.0 reads AGENTMAIL_API_KEY inside its isolated component
// but does not declare that environment dependency. Convex 1.39+ isolates component
// env, so declare it until the upstream package publishes the same fix.
import { readFileSync, writeFileSync } from 'node:fs'

function replace(path, original, patched) {
  const current = readFileSync(path, 'utf8')
  if (current.includes(patched)) return
  if (!current.includes(original)) throw new Error(`Unexpected @agentmail/convex contents in ${path}. Review the upstream release before installing.`)
  writeFileSync(path, current.replace(original, patched))
}

replace(
  'node_modules/@agentmail/convex/src/component/convex.config.ts',
  'import { defineComponent } from "convex/server";\nimport workpool from "@convex-dev/workpool/convex.config";\n\nconst component = defineComponent("agentmail");',
  'import { defineComponent } from "convex/server";\nimport { v } from "convex/values";\nimport workpool from "@convex-dev/workpool/convex.config";\n\nconst component = defineComponent("agentmail", {\n  env: {\n    AGENTMAIL_API_KEY: v.string(),\n    AGENTMAIL_BASE_URL: v.optional(v.string()),\n  },\n});',
)

replace(
  'node_modules/@agentmail/convex/dist/component/convex.config.js',
  'import { defineComponent } from "convex/server";\nimport workpool from "@convex-dev/workpool/convex.config";\nconst component = defineComponent("agentmail");',
  'import { defineComponent } from "convex/server";\nimport { v } from "convex/values";\nimport workpool from "@convex-dev/workpool/convex.config";\nconst component = defineComponent("agentmail", {\n    env: {\n        AGENTMAIL_API_KEY: v.string(),\n        AGENTMAIL_BASE_URL: v.optional(v.string()),\n    },\n});',
)

replace(
  'node_modules/@agentmail/convex/dist/component/convex.config.d.ts',
  'declare const component: import("convex/server").ComponentDefinition<any>;',
  'declare const component: import("convex/server").ComponentDefinition<any, {\n    readonly AGENTMAIL_API_KEY: import("convex/values").VString<string, "required">;\n    readonly AGENTMAIL_BASE_URL: import("convex/values").VString<string | undefined, "optional">;\n}>;',
)

console.log('@agentmail/convex component environment boundary: patched for Convex isolation.')
