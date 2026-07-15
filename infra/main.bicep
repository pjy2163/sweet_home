@description('Short lowercase prefix used for globally unique Azure resource names.')
param prefix string
param location string = resourceGroup().location
@secure()
param internalApiKey string
@secure()
param databaseUrl string
param privacyControllerName string
param privacyContactEmail string
param backendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param frontendImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param kakaoMapAppKey string = ''

var suffix = uniqueString(resourceGroup().id)
var environmentName = '${prefix}-env'
var backendName = '${prefix}-api'
var frontendName = '${prefix}-web'
var registryName = take(replace('${prefix}${suffix}', '-', ''), 50)

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    retentionInDays: 30
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: listKeys(logs.id, logs.apiVersion).primarySharedKey
      }
    }
  }
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-pull'
  location: location
}

var acrPullRole = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, pullIdentity.id, acrPullRole)
  scope: registry
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRole
  }
}

resource backend 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${pullIdentity.id}': {} }
  }
  dependsOn: [acrPull]
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
        traffic: [{ latestRevision: true, weight: 100 }]
      }
      secrets: [
        { name: 'internal-api-key', value: internalApiKey }
        { name: 'database-url', value: databaseUrl }
      ]
      registries: [{ server: registry.properties.loginServer, identity: pullIdentity.id }]
    }
    template: {
      containers: [{
        name: 'api'
        image: backendImage
        env: [
          { name: 'SWEETHOME_REQUIRE_INTERNAL_PROXY', value: 'true' }
          { name: 'SWEETHOME_INTERNAL_API_KEY', secretRef: 'internal-api-key' }
          { name: 'SWEETHOME_AI_REPORT_ENABLED', value: 'false' }
          { name: 'DATABASE_URL', secretRef: 'database-url' }
        ]
        resources: { cpu: json('0.5'), memory: '1Gi' }
        probes: [
          {
            type: 'Liveness'
            httpGet: { path: '/health', port: 8000, scheme: 'HTTP' }
            initialDelaySeconds: 10
            periodSeconds: 30
          }
          {
            type: 'Readiness'
            httpGet: { path: '/health', port: 8000, scheme: 'HTTP' }
            initialDelaySeconds: 5
            periodSeconds: 10
          }
        ]
      }]
      scale: { minReplicas: 0, maxReplicas: 3 }
    }
  }
}

resource frontend 'Microsoft.App/containerApps@2024-03-01' = {
  name: frontendName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${pullIdentity.id}': {} }
  }
  dependsOn: [acrPull]
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
        traffic: [{ latestRevision: true, weight: 100 }]
      }
      secrets: [{ name: 'internal-api-key', value: internalApiKey }]
      registries: [{ server: registry.properties.loginServer, identity: pullIdentity.id }]
    }
    template: {
      containers: [{
        name: 'web'
        image: frontendImage
        env: [
          { name: 'SWEETHOME_API_BASE_URL', value: 'https://${backend.properties.configuration.ingress.fqdn}' }
          { name: 'SWEETHOME_INTERNAL_API_KEY', secretRef: 'internal-api-key' }
          { name: 'NEXT_PUBLIC_KAKAO_MAP_APP_KEY', value: kakaoMapAppKey }
          { name: 'SWEETHOME_PRIVACY_CONTROLLER_NAME', value: privacyControllerName }
          { name: 'SWEETHOME_PRIVACY_CONTACT_EMAIL', value: privacyContactEmail }
        ]
        resources: { cpu: json('0.5'), memory: '1Gi' }
      }]
      scale: { minReplicas: 0, maxReplicas: 3 }
    }
  }
}

output registryName string = registry.name
output backendName string = backend.name
output frontendName string = frontend.name
output frontendUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output googleAuthCallbackUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}/.auth/login/google/callback'
output githubAuthCallbackUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}/.auth/login/github/callback'
