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

param googleAuthClientId string

@secure()
param googleAuthClientSecret string

param githubAuthClientId string

@secure()
param githubAuthClientSecret string

param kakaoMapAppKey string
param privacyControllerName string
param privacyContactEmail string
param publicSiteUrl string
param customDomainName string
param customDomainCertificateId string
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
        corsPolicy: {
          allowCredentials: true
          maxAge: 3600
          allowedOrigins: [
            publicSiteUrl
          ]
          allowedMethods: [
            'GET'
            'POST'
            'DELETE'
            'OPTIONS'
          ]
          allowedHeaders: [
            'Content-Type'
          ]
          exposeHeaders: []
        }
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        customDomains: [
          {
            name: customDomainName
            bindingType: 'SniEnabled'
            certificateId: customDomainCertificateId
          }
        ]
      }
      secrets: [
        {
          name: 'internal-api-key'
          value: internalApiKey
        }
        {
          name: 'google-auth-client-secret'
          value: googleAuthClientSecret
        }
        {
          name: 'github-auth-client-secret'
          value: githubAuthClientSecret
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

resource auth 'Microsoft.App/containerApps/authConfigs@2025-01-01' = {
  parent: app
  name: 'current'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      unauthenticatedClientAction: 'AllowAnonymous'
    }
    httpSettings: {
      requireHttps: true
    }
    identityProviders: {
      google: {
        enabled: true
        registration: {
          clientId: googleAuthClientId
          clientSecretSettingName: 'google-auth-client-secret'
        }
        login: {
          scopes: [
            'openid'
            'profile'
          ]
        }
      }
      gitHub: {
        enabled: true
        registration: {
          clientId: githubAuthClientId
          clientSecretSettingName: 'github-auth-client-secret'
        }
        login: {
          scopes: [
            'read:user'
          ]
        }
      }
    }
    login: {
      allowedExternalRedirectUrls: [
        publicSiteUrl
      ]
      cookieExpiration: {
        convention: 'FixedTime'
        timeToExpiration: '7.00:00:00'
      }
      tokenStore: {
        enabled: false
      }
    }
  }
}

output name string = app.name
output fqdn string = app.properties.configuration.ingress.fqdn
