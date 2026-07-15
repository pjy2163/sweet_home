#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-sweethome-prod-rg}"
LOCATION="${LOCATION:-koreacentral}"
PREFIX="${PREFIX:-sweethome-prod}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"

required=(AZURE_TENANT_ID SWEETHOME_AAD_CLIENT_ID SWEETHOME_AAD_CLIENT_SECRET)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
done

for command in az openssl git; do
  command -v "${command}" >/dev/null || { echo "Missing command: ${command}" >&2; exit 1; }
done

if [[ ! -f data/processed/housing_rent_snapshot.csv ]]; then
  echo "Missing private build artifact: data/processed/housing_rent_snapshot.csv" >&2
  exit 1
fi

INTERNAL_API_KEY="$(openssl rand -hex 32)"
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
    backendImage="${ACR_SERVER}/sweethome-backend:${TAG}" \
    frontendImage="${ACR_SERVER}/sweethome-frontend:${TAG}" \
    kakaoMapAppKey="${NEXT_PUBLIC_KAKAO_MAP_APP_KEY:-}" \
  --output none

BACKEND="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.backendName.value -o tsv)"
FRONTEND="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.frontendName.value -o tsv)"
CALLBACK="$(az deployment group show --resource-group "${RESOURCE_GROUP}" --name sweethome-infra --query properties.outputs.authCallbackUrl.value -o tsv)"

az containerapp auth microsoft update \
  --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" \
  --client-id "${SWEETHOME_AAD_CLIENT_ID}" \
  --client-secret "${SWEETHOME_AAD_CLIENT_SECRET}" \
  --tenant-id "${AZURE_TENANT_ID}" --yes --output none
az containerapp auth update \
  --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" \
  --unauthenticated-client-action AllowAnonymous --output none

FRONTEND_URL="$(az containerapp show --name "${FRONTEND}" --resource-group "${RESOURCE_GROUP}" --query properties.configuration.ingress.fqdn -o tsv)"
echo "Deployment complete: https://${FRONTEND_URL}"
echo "Ensure this redirect URI exists in the Entra app registration: ${CALLBACK}"
