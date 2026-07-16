using './main.bicep'

param registryName = readEnvironmentVariable('AZURE_ACR_NAME')
param environmentName = readEnvironmentVariable('AZURE_CONTAINERAPPS_ENVIRONMENT')
param frontendAppName = readEnvironmentVariable('AZURE_FRONTEND_APP_NAME')
param backendAppName = readEnvironmentVariable('AZURE_BACKEND_APP_NAME')
param migrationJobName = readEnvironmentVariable('AZURE_MIGRATION_JOB_NAME')
param pullIdentityName = readEnvironmentVariable('AZURE_PULL_IDENTITY_NAME')
param backendImage = readEnvironmentVariable('SWEETHOME_BACKEND_IMAGE')
param frontendImage = readEnvironmentVariable('SWEETHOME_FRONTEND_IMAGE')
param internalApiKey = readEnvironmentVariable('SWEETHOME_INTERNAL_API_KEY')
param databaseUrl = readEnvironmentVariable('DATABASE_URL')
param privacyControllerName = 'parang'
param privacyContactEmail = 'parangofsky@gmail.com'
param kakaoMapAppKey = readEnvironmentVariable('NEXT_PUBLIC_KAKAO_MAP_APP_KEY')
