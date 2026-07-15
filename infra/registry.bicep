param prefix string
param location string = resourceGroup().location

var registryName = take(replace('${prefix}${uniqueString(resourceGroup().id)}', '-', ''), 50)

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

output registryName string = registry.name
output loginServer string = registry.properties.loginServer
