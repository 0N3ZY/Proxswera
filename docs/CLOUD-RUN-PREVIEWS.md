# Cloud Run previews

Cloud Run is an optional beta/experimental runtime for Scramjet. This workflow is deliberately manual and does not alter the stable production traffic allocation.

## Safety behavior

- The workflow runs only through Actions > Cloud Run Preview > Run workflow.
- The user must tick the cost-confirmation input. Google Cloud usage, image storage and network transfer can still incur charges.
- It authenticates through GitHub OIDC and Google Workload Identity Federation; no service-account JSON key is stored in GitHub.
- The GitHub environment is named cloud-run-preview. Configure environment protection rules and restrict deployment branches before enabling it.
- The Artifact Registry repository and Cloud Run service must already exist. The workflow checks both and never creates them.
- The workflow refuses to deploy if the Cloud Run service IAM policy grants access to allUsers or allAuthenticatedUsers. It does not add public access.
- Each preview gets a unique beta tag, is deployed with --no-traffic, --min 0 and --max 1, and therefore does not receive stable production traffic.
- Do not configure revision-level minimum instances above zero for preview revisions. Tagged revisions can otherwise be kept warm and billed.
- The workflow does not enable billing, APIs, services, or paid plans.

## GitHub environment variables

Create the GitHub Actions environment cloud-run-preview and add these variables:

| Variable | Meaning |
| --- | --- |
| GCP_PROJECT_ID | Google Cloud project ID |
| GCP_REGION | Region containing the Artifact Registry repository and Cloud Run service |
| GCP_ARTIFACT_REGISTRY_REPOSITORY | Existing Docker Artifact Registry repository name |
| CLOUD_RUN_SERVICE | Existing Cloud Run service name |
| GCP_WORKLOAD_IDENTITY_PROVIDER | Full Workload Identity Provider resource name |
| GCP_SERVICE_ACCOUNT | Service account email to impersonate |

These are identifiers, not secret keys. The authentication action obtains short-lived credentials through OIDC.

## Google Cloud preparation (manual, when billing is available)

1. Confirm the Google Cloud project has billing configured and decide an explicit spending limit before using the workflow.
2. Enable the required Cloud Run, Artifact Registry and IAM Credentials APIs only if you have approved that setup.
3. Create a Docker Artifact Registry repository and a Cloud Run service in the same region. The workflow will not create either.
4. Configure Workload Identity Federation for GitHub Actions. Restrict the provider condition to repository StringShot/scramjetfork and the intended branch/environment; do not allow arbitrary repositories to impersonate the service account.
5. Grant the service account only the roles needed to push to the existing repository and deploy/update the existing Cloud Run service. Grant service-account user only on the Cloud Run runtime identity if required.
6. Restrict the service account impersonation binding to the GitHub repository's Workload Identity principal and intended ref.
7. Add the six GitHub environment variables above. Configure environment protection/branch restrictions.
8. Run the workflow manually and tick the cost-confirmation input only when you are ready to accept potential charges.

## Preview access and cleanup

Previews remain subject to the existing Cloud Run IAM policy. This is intentional: Scramjet does not yet have a complete beta-user authentication and access-control flow, so the workflow will not make a preview public. A later phase can add a protected preview gateway and a dashboard switch for users who opt into Beta or Experimental.

When a preview is no longer needed, remove its traffic tag and delete its unused image/revision using the Google Cloud console or CLI after verifying that it is not serving traffic. Do not remove tags or revisions automatically until a retention policy has been agreed.

## Official references

- Cloud Run tagged revisions and no-traffic rollouts: https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Cloud Run minimum instances: https://docs.cloud.google.com/run/docs/configuring/min-instances
- Cloud Run maximum instances: https://docs.cloud.google.com/run/docs/configuring/max-instances
- GitHub Actions Workload Identity Federation: https://github.com/google-github-actions/auth
