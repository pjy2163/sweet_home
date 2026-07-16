@description('Manual Container Apps job used to apply PostgreSQL schema migrations.')
param jobName string
param location string
param managedEnvironmentId string
param registryServer string
param pullIdentityId string
param image string

@secure()
param databaseUrl string

resource job 'Microsoft.App/jobs@2024-03-01' = {
  name: jobName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentityId}': {}
    }
  }
  properties: {
    environmentId: managedEnvironmentId
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 300
      replicaRetryLimit: 1
      secrets: [
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
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: image
          command: [
            'python'
            '-m'
            'src.database.migrate'
          ]
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
    workloadProfileName: 'Consumption'
  }
}

output name string = job.name
