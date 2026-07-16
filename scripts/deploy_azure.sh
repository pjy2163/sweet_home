#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-sweethome-prod-rg}"
LOCATION="${LOCATION:-koreacentral}"
PREFIX="${PREFIX:-sweethome-prod}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"

for command in az openssl git psql; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done

for variable in DATABASE_URL SWEETHOME_PRIVACY_CONTROLLER_NAME SWEETHOME_PRIVACY_CONTACT_EMAIL; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Missing required environment variable: ${variable}" >&2
    exit 1
  fi
done

if [[ ! -f data/processed/housing_rent_snapshot.csv ]]; then
  echo "Missing private build artifact: data/processed/housing_rent_snapshot.csv" >&2
  exit 1
fi

INTERNAL_API_KEY="$(openssl rand -hex 32)"

for migration in db/migrations/*.sql; do
  psql "${DATABASE_URL}" --set ON_ERROR_STOP=1 --file "${migration}"
done

az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" --output none
az deployment group create \
  --name sweethome-registry \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file infra/registry.bicep \
  --parameters prefix="${PREFIX}" location="${LOCATION}" \
  --output none

REGISTRY="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-registry --query properties.outputs.registryName.value -o tsv)"
ACR_SERVER="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-registry --query properties.outputs.loginServer.value -o tsv)"

az acr build --registry "${REGISTRY}" --image "sweethome-backend:${TAG}" --file Dockerfile.backend .
az acr build --registry "${REGISTRY}" --image "sweethome-frontend:${TAG}" \
  --file frontend/Dockerfile \
  --build-arg "NEXT_PUBLIC_KAKAO_MAP_APP_KEY=${NEXT_PUBLIC_KAKAO_MAP_APP_KEY:-}" frontend

az deployment group create \
  --name sweethome-infra \
  --resource-group "${RESOURCE_GROUP}" \
  --template-file infra/main.bicep \
  --parameters prefix="${PREFIX}" location="${LOCATION}" internalApiKey="${INTERNAL_API_KEY}" \
    databaseUrl="${DATABASE_URL}" \
    privacyControllerName="${SWEETHOME_PRIVACY_CONTROLLER_NAME}" \
    privacyContactEmail="${SWEETHOME_PRIVACY_CONTACT_EMAIL}" \
    backendImage="${ACR_SERVER}/sweethome-backend:${TAG}" \
    frontendImage="${ACR_SERVER}/sweethome-frontend:${TAG}" \
    kakaoMapAppKey="${NEXT_PUBLIC_KAKAO_MAP_APP_KEY:-}" \
  --output none

BACKEND="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.backendName.value -o tsv)"
FRONTEND="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.frontendName.value -o tsv)"
GOOGLE_CALLBACK="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.googleAuthCallbackUrl.value -o tsv)"
GITHUB_CALLBACK="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.githubAuthCallbackUrl.value -o tsv)"

FRONTEND_URL="$(az containerapp show --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" --query properties.configuration.ingress.fqdn -o tsv)"
echo "Deployment complete: https://${FRONTEND_URL}"
echo "Google redirect URI: ${GOOGLE_CALLBACK}"
echo "GitHub callback URL: ${GITHUB_CALLBACK}"
echo "Register both callbacks, export the provider credentials, then run scripts/configure_azure_auth.sh."
