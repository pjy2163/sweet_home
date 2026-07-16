@description('Public Next.js Container App name.')
param appName string
param location string
param managedEnvironmentId string
param registryServer string
param pullIdentityId string
param image string
param backendFqdn string

@secure()
param internalApiKey string

param kakaoMapAppKey string
param privacyControllerName string
param privacyContactEmail string
param publicSiteUrl string
param trustAzureIdentityHeaders bool

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned, UserAssigned'
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
        external: true
        targetPort: 3000
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
          name: 'web'
          image: image
          env: [
            {
              name: 'SWEETHOME_API_BASE_URL'
              value: 'https://${backendFqdn}'
            }
            {
              name: 'SWEETHOME_INTERNAL_API_KEY'
              secretRef: 'internal-api-key'
            }
            {
              name: 'NEXT_PUBLIC_KAKAO_MAP_APP_KEY'
              value: kakaoMapAppKey
            }
            {
              name: 'NEXT_PUBLIC_SITE_URL'
              value: publicSiteUrl
            }
            {
              name: 'SWEETHOME_PRIVACY_CONTROLLER_NAME'
              value: privacyControllerName
            }
            {
              name: 'SWEETHOME_PRIVACY_CONTACT_EMAIL'
              value: privacyContactEmail
            }
            {
              name: 'SWEETHOME_TRUST_AZURE_IDENTITY_HEADERS'
              value: trustAzureIdentityHeaders ? 'true' : 'false'
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
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
