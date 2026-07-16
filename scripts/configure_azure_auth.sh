#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-sweethome-prod-rg}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-sweethome-infra}"

required=(
  SWEETHOME_GOOGLE_CLIENT_ID
  SWEETHOME_GOOGLE_CLIENT_SECRET
  SWEETHOME_GITHUB_CLIENT_ID
  SWEETHOME_GITHUB_CLIENT_SECRET
)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
done

command -v az >/dev/null || { echo "Missing command: az" >&2; exit 1; }

FRONTEND="$(az deployment group show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${DEPLOYMENT_NAME}" \
  --query properties.outputs.frontendName.value -o tsv)"

az containerapp auth google update \
  --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" \
  --client-id "${SWEETHOME_GOOGLE_CLIENT_ID}" \
  --client-secret "${SWEETHOME_GOOGLE_CLIENT_SECRET}" \
  --yes --output none
az containerapp auth github update \
  --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" \
  --client-id "${SWEETHOME_GITHUB_CLIENT_ID}" \
  --client-secret "${SWEETHOME_GITHUB_CLIENT_SECRET}" \
  --yes --output none
az containerapp auth update \
  --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" \
  --unauthenticated-client-action AllowAnonymous --output none

FRONTEND_URL="$(az containerapp show \
  --name "${FRONTEND}" \
  --resource-group "${RESOURCE_GROUP}" \
  --query properties.configuration.ingress.fqdn -o tsv)"

echo "Google and GitHub authentication configured: https://${FRONTEND_URL}/login"
