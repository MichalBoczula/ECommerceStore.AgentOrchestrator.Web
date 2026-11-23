# E-Commerce Agent Orchestrator Web

Angular panel for reading Agent Orchestrator workflow runs. Follow a BA handoff, its QA proposal and the GitHub Actions evidence for the published revision.

## Run locally

Use Node.js 24 and npm. Start the [Agent Orchestrator API](https://github.com/MichalBoczula/ECommerceStore.AgentOrchestrator.Api) on port 8000, then run the following commands.

~~~sh
npm ci
npm start
~~~

Open [localhost:4200/runs](http://localhost:4200/runs). The development proxy forwards the run endpoints to the API. Set `AO_API_URL` before starting the dev server if the API listens elsewhere. To test a secured local API, provide an existing access token with `runs.read` in the dev server's `AO_API_ACCESS_TOKEN` environment variable. Keep the dev server bound to loopback when using this setting.

List filters and cursors are part of the URL. A direct link to `/runs/<runId>` fetches the current run. The timeline and evidence come from the API. A deployed host needs an SPA fallback for `/runs/*` and a same-origin proxy for `/api/v1/runs` and its subpaths. The proxy must forward the authenticated caller's authorization to the API.

## Structure

The feature follows the Knowledge Assistant Web layers. The Angular pages use a facade backed by NgRx effects and state. A repository port isolates the Angular HTTP adapter. Its two read operations use generated OpenAPI types.

The [pinned API contract](https://github.com/MichalBoczula/ECommerceStore.AgentOrchestrator.Api/blob/5d790ce7128cc0f95135a76f7f4f888db68dc045/docs/openapi/agent-orchestrator.v1.yaml) lives in `contracts/`. Run `npm run generate:types` after updating that snapshot.

## Verify

~~~sh
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
~~~

The browser tests exercise the panel on desktop and mobile using contract-shaped API responses. CI also regenerates and checks the committed types.
