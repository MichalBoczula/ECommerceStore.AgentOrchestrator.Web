# E-Commerce Agent Orchestrator Web

Angular panel for reviewing Agent Orchestrator workflow runs. Follow a BA handoff, review its QA proposal, and inspect the GitHub Actions evidence for the published revision.

## Run locally

Use Node.js 24 and npm. Start the [Agent Orchestrator API](https://github.com/MichalBoczula/ECommerceStore.AgentOrchestrator.Api) on port 8000, then run the following commands.

~~~sh
npm ci
npm start
~~~

Open [localhost:4200/runs](http://localhost:4200/runs). The development proxy forwards the run endpoints to the API. Set `AO_API_URL` before starting the dev server if the API listens elsewhere. To test a secured local API, provide an existing access token with `runs.read` in the dev server's `AO_API_ACCESS_TOKEN` environment variable. Add the `runs.review` scope to the token to submit a decision on a run that the caller can review. Keep the dev server bound to loopback when using this setting.

List filters and cursors are part of the URL. A direct link to `/runs/<runId>` fetches the current run. The timeline and evidence come from the API. A deployed host needs an SPA fallback for `/runs/*` and a same-origin proxy for `/api/v1/runs` and its subpaths. The proxy must forward the authenticated caller's authorization to the API.

CI publishes the tested and scanned Web image to Docker Hub with the commit SHA
and `latest` tags on pushes to `main`. Manual runs on `main` publish the commit
SHA tag. Use `imageReference` from the `image-reference` artifact for deployment.
The container serves Angular on port 8080 and proxies run requests to
`AO_API_URL`. Set it to the upstream API origin without a path or trailing slash.
The proxy forwards the caller's `Authorization` header.

## Enable Entra sign-in

Register a single-tenant application for Orchestrator Web with the **Single-page
application** platform. Register the Web origin with both paths shown below.

| Path | Purpose |
| --- | --- |
| `/auth/redirect` | MSAL redirect bridge for sign-in and token renewal |
| `/` | Return from sign-out |

Add delegated permissions for `runs.read`, `runs.start`, and `runs.review` from
the Orchestrator API app registration. Set these public identifiers on the Web
container.

| Variable | Value |
| --- | --- |
| `AO_ENTRA_TENANT_ID` | Directory (tenant) ID |
| `AO_ENTRA_CLIENT_ID` | Application (client) ID of the Web SPA |
| `AO_ENTRA_API_CLIENT_ID` | Application (client) ID of the Orchestrator API, exposed under `api://<id>` |

The browser signs in with MSAL, keeps the session in browser session storage, and
sends an access token on the same-origin runs routes. An empty Entra
configuration uses the existing caller-supplied bearer setup. For a local Entra
test, register the same two paths on the local origin and populate
`src/entra-config.json` with the public `tenantId`, `clientId`, and
`apiClientId` values.

## Review a proposal

Open a run awaiting review and check the Gherkin and its SHA-256. Approve that version or record a rejection with a reason. The API authorizes the caller and accepts one decision per review. The panel fetches the latest run after a decision or a conflict. When the version changes, review the refreshed proposal before submitting again.

## Structure

The feature follows the Knowledge Assistant Web layers. The Angular pages use a facade backed by NgRx effects and state. A repository port isolates the Angular HTTP adapter. Run queries and decisions use generated OpenAPI types.

The pinned API contract lives in `contracts/`. Run `npm run generate:types` after updating that snapshot. [API OpenAPI contract](https://github.com/MichalBoczula/ECommerceStore.AgentOrchestrator.Api/blob/50b5075a44170a25b813a7acb9d26c6949496364/docs/openapi/agent-orchestrator.v1.yaml)

The catalog rehearsal follows the run from the BA handoff through review to the Playwright and Allure evidence. A trace correlation ID in the timeline lets you find worker attempts in the configured LangSmith project. [Demo walkthrough](https://github.com/MichalBoczula/ECommerceStore.AgentOrchestrator.Api/blob/50b5075a44170a25b813a7acb9d26c6949496364/docs/demo.md)

## Verify

~~~sh
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
~~~

The browser tests exercise the panel on desktop and mobile using contract-shaped API responses. CI also regenerates and checks the committed types.
