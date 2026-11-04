# Collaborative AI maintenance team

The scheduled/manual self-heal workflow uses the multi-provider team after a production image build or Render health check fails. A separate upstream-optimisation workflow invokes the team after a successful upstream sync to look for evidence-backed improvements.

## GitHub Actions secrets

Add these under **Repository Settings → Secrets and variables → Actions → New repository secret**. These are separate from Render service environment variables because the AI maintenance job runs on GitHub Actions. The workflows also accept the former `OPENROUTER_API_KEY`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID` names as fallbacks while migrating.

Cloudflare Pages deployment uses a separate GitHub Actions secret: `CFP_API_KEY`. It is not the Workers AI token and should remain scoped to Cloudflare Pages deployment permissions.

| Secret | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini 3.8 Flash diagnosis/review |
| `GROQ_API_KEY` | Groq diagnosis/review |
| `OR_API_KEY` | OpenRouter free-model routing |
| `MISTRAL_API_KEY` | Mistral API |
| `CF_API_KEY` | Cloudflare Workers AI API token |
| `CF_ACCOUNT_ID` | Cloudflare account identifier used by Workers AI |

Never commit these values or paste them into issues, logs, or prompts.

## Default models

All defaults are intended for free-tier use and can be changed with GitHub Actions environment variables:

- Gemini: `gemini-3.8-flash`
- Groq: `llama-3.3-70b-versatile`
- OpenRouter: `openrouter/free` (routes to an available free model)
- Mistral: `mistral-small-latest` (only where the account has free Experiment-tier access)
- Cloudflare Workers AI: `@cf/zai-org/glm-4.7-flash`

Free model availability, quotas, and provider policies can change. The workflow does not intentionally switch to paid model IDs. Provider errors or exhausted quotas cause a safe stop rather than a paid fallback.

## How collaboration works

1. The first available provider acts as coordinator and chooses roles using the current task, model names, and provider roster.
2. Each provider receives the same scrubbed task and repository context, plus its selected role.
3. Agents return diagnosis, test advice, or review notes. These messages are shared with the patch author.
4. The selected patch author produces one unified diff.
5. Two separately assigned reviewers must both approve it.
6. The existing deterministic patch verifier, whitespace checks, and full Docker rebuild still run before a repair PR can be opened.

The agents exchange context through the orchestrator; they do not share credentials or have direct access to one another's provider accounts. At least three providers must be configured so the patch author and both reviewers are distinct. If fewer than three providers are configured, or a required agent/reviewer fails, the system stops without emitting a patch.

## Safety boundaries

The autonomous repair agent cannot edit workflow files, credentials, environment files, lockfiles, generated/vendor/binary files, or security-sensitive source areas. It must not weaken encryption, TLS, authentication, authorization, origin protections, sandboxing, proxy isolation, Wisp protections, privacy, or rate limits. Application changes remain subject to pull-request review and the existing tests/build gate.
