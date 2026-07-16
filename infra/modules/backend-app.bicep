@description('Internal FastAPI Container App name.')
param appName string
param location string
param managedEnvironmentId string
param registryServer string
param pullIdentityId string
param image string

@secure()
param internalApiKey string

@secure()
param databaseUrl string

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 100
      ingress: {
        external: false
        targetPort: 8000
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: [
        {
          name: 'internal-api-key'
          value: internalApiKey
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
      ]
      registries: [
        {
          server: registryServer
          identity: pullIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: image
          env: [
            {
              name: 'SWEETHOME_REQUIRE_INTERNAL_PROXY'
              value: 'true'
            }
            {
              name: 'SWEETHOME_INTERNAL_API_KEY'
              secretRef: 'internal-api-key'
            }
            {
              name: 'SWEETHOME_AI_REPORT_ENABLED'
              value: 'false'
            }
            {
              name: 'SWEETHOME_REQUIRE_DATABASE_TLS'
              value: 'true'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
    workloadProfileName: 'Consumption'
  }
}

output name string = app.name
output fqdn string = app.properties.configuration.ingress.fqdn
