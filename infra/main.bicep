targetScope = 'resourceGroup'

@description('Azure region shared by the existing Container Apps environment and deployed apps.')
param location string = resourceGroup().location

@description('Existing Azure Container Registry name in the target resource group.')
param registryName string

@description('Existing Azure Container Apps managed environment name.')
param environmentName string

@description('Existing public frontend Container App name.')
param frontendAppName string

@description('Internal FastAPI Container App name to create.')
param backendAppName string

@description('Manual Container Apps job name for PostgreSQL schema migrations.')
param migrationJobName string

@description('Existing user-assigned identity approved for pulling images from ACR.')
param pullIdentityName string

@description('Immutable backend image reference in the existing ACR.')
@minLength(1)
param backendImage string

@description('Immutable frontend image reference in the existing ACR.')
@minLength(1)
param frontendImage string

@secure()
@description('Shared credential accepted only between the Next.js server and FastAPI.')
param internalApiKey string

@secure()
@description('PostgreSQL connection URL. Production values must enforce TLS.')
param databaseUrl string

@description('Name shown in the privacy policy as the personal-data controller.')
param privacyControllerName string

@description('Public contact address shown in the privacy policy.')
param privacyContactEmail string

@description('Browser-visible Kakao Maps JavaScript key restricted by allowed domains.')
param kakaoMapAppKey string = ''

@description('Google OAuth client identifier configured for Azure Container Apps authentication.')
param googleAuthClientId string

@secure()
@description('Google OAuth client secret stored only as a Container Apps secret.')
param googleAuthClientSecret string

@description('GitHub OAuth client identifier configured for Azure Container Apps authentication.')
param githubAuthClientId string

@secure()
@description('GitHub OAuth client secret stored only as a Container Apps secret.')
param githubAuthClientSecret string

@description('Canonical public origin.')
param publicSiteUrl string

@description('Verified custom hostname bound to the public frontend app.')
param frontendCustomDomainName string

@description('Existing managed certificate name for the frontend custom hostname.')
param frontendManagedCertificateName string

@description('Enable only after Azure Container Apps authentication is configured and verified.')
param trustAzureIdentityHeaders bool = false

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: environmentName
}

resource frontendManagedCertificate 'Microsoft.App/managedEnvironments/managedCertificates@2024-03-01' existing = {
  parent: environment
  name: frontendManagedCertificateName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: pullIdentityName
}

module backend 'modules/backend-app.bicep' = {
  name: 'deploy-backend-app'
  params: {
    appName: backendAppName
    location: location
    managedEnvironmentId: environment.id
    registryServer: registry.properties.loginServer
    pullIdentityId: pullIdentity.id
    image: backendImage
    internalApiKey: internalApiKey
    databaseUrl: databaseUrl
  }
}

module migration 'modules/migration-job.bicep' = {
  name: 'deploy-database-migration-job'
  params: {
    jobName: migrationJobName
    location: location
    managedEnvironmentId: environment.id
    registryServer: registry.properties.loginServer
    pullIdentityId: pullIdentity.id
    image: backendImage
    databaseUrl: databaseUrl
  }
}

module frontend 'modules/frontend-app.bicep' = {
  name: 'deploy-frontend-app'
  params: {
    appName: frontendAppName
    location: location
    managedEnvironmentId: environment.id
    registryServer: registry.properties.loginServer
    pullIdentityId: pullIdentity.id
    image: frontendImage
    backendFqdn: backend.outputs.fqdn
    internalApiKey: internalApiKey
    googleAuthClientId: googleAuthClientId
    googleAuthClientSecret: googleAuthClientSecret
    githubAuthClientId: githubAuthClientId
    githubAuthClientSecret: githubAuthClientSecret
    kakaoMapAppKey: kakaoMapAppKey
    privacyControllerName: privacyControllerName
    privacyContactEmail: privacyContactEmail
    publicSiteUrl: publicSiteUrl
    customDomainName: frontendCustomDomainName
    customDomainCertificateId: frontendManagedCertificate.id
    trustAzureIdentityHeaders: trustAzureIdentityHeaders
  }
}

output registryLoginServer string = registry.properties.loginServer
output pullIdentityResourceId string = pullIdentity.id
output backendName string = backend.outputs.name
output backendFqdn string = backend.outputs.fqdn
output migrationJobName string = migration.outputs.name
output frontendName string = frontend.outputs.name
output frontendGeneratedUrl string = 'https://${frontend.outputs.fqdn}'
output publicSiteUrl string = publicSiteUrl
output googleAuthCallbackUrl string = '${publicSiteUrl}/.auth/login/google/callback'
output githubAuthCallbackUrl string = '${publicSiteUrl}/.auth/login/github/callback'
