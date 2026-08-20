output "resource_group_name" {
  description = "Grupo de Recursos do laboratorio."
  value       = azurerm_resource_group.main.name
}

output "location" {
  description = "Regiao dos recursos."
  value       = azurerm_resource_group.main.location
}

output "name_suffix" {
  description = "Sufixo aplicado aos nomes globalmente unicos."
  value       = local.suffix
}

# Rede
output "vnet_id" {
  description = "ID da Rede Virtual."
  value       = one(module.network[*].vnet_id)
}

output "app_subnet_id" {
  description = "ID da Sub-rede da aplicacao."
  value       = one(module.network[*].app_subnet_id)
}

output "app_service_integration_subnet_id" {
  description = "ID da subnet exclusiva delegada ao App Service para VNet Integration; null quando a integracao nao estiver habilitada."
  value       = one(module.network[*].app_service_integration_subnet_id)
}

# VM
output "vm_public_ip" {
  description = "IP Publico da VM."
  value       = one(module.virtual_machine[*].public_ip)
}

output "vm_private_ip" {
  description = "IP Privado da VM."
  value       = one(module.virtual_machine[*].private_ip)
}

output "vm_ssh_command" {
  description = "Comando SSH pronto para a VM."
  value       = one(module.virtual_machine[*].ssh_command)
}

# App Service
output "app_service_url" {
  description = "URL publica do App Service."
  value       = one(module.app_service[*].url)
}

output "app_service_name" {
  description = "Nome do App Service."
  value       = one(module.app_service[*].name)
}

# Azure SQL (sem expor usuario ou senha)
output "sql_server_fqdn" {
  description = "FQDN do servidor logico do Azure SQL."
  value       = one(module.sql_database[*].server_fqdn)
}

output "sql_database_name" {
  description = "Nome do banco de dados."
  value       = one(module.sql_database[*].database_name)
}

# Key Vault
output "key_vault_uri" {
  description = "URI do Azure Key Vault."
  value       = one(module.key_vault[*].vault_uri)
}

# ACR
output "acr_login_server" {
  description = "Login server do ACR."
  value       = one(module.container_registry[*].login_server)
}

# AKS
output "aks_name" {
  description = "Nome do cluster AKS."
  value       = one(module.aks[*].name)
}

output "aks_get_credentials" {
  description = "Comando para obter credenciais do AKS."
  value       = one(module.aks[*].get_credentials_command)
}

# Monitoramento
output "log_analytics_workspace_id" {
  description = "ID do workspace Log Analytics."
  value       = one(module.monitoring[*].workspace_id)
}

# Azure AI Foundry / Azure OpenAI
output "ai_endpoint" {
  description = "Endpoint do Azure OpenAI (Azure AI Foundry)."
  value       = one(module.ai_foundry[*].endpoint)
}

output "ai_deployment_name" {
  description = "Nome do deployment do modelo de IA."
  value       = one(module.ai_foundry[*].deployment_name)
}
