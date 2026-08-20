resource "random_string" "suffix" {
  length  = 6
  lower   = true
  upper   = false
  numeric = true
  special = false
}

locals {
  suffix       = var.suffix != "" ? var.suffix : random_string.suffix.result
  want_network = var.deploy_network || var.deploy_vm

  # Nomes globalmente unicos derivados do sufixo.
  app_service_name = "app-imersao-${local.suffix}"
  sql_server_name  = "sql-imersao-${local.suffix}-br"
  key_vault_name   = "kv-imersao-${local.suffix}"
  acr_name         = "acrimersao${local.suffix}"
  aks_name         = "aks-imersao"
  ai_account_name  = "oai-imersao-${local.suffix}"

  tags = var.tags
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.tags
}

# ---------------------------------------------------------------------------
# Rede (estagio: network)
# ---------------------------------------------------------------------------
module "network" {
  source              = "./modules/network"
  count               = local.want_network ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  vnet_name          = "vnet-imersao"
  vnet_address_space = var.vnet_address_space
  app_subnet_name    = "snet-aplicacao"
  app_subnet_prefix  = var.app_subnet_prefix
  enable_app_service_vnet_integration = var.enable_app_service_vnet_integration
  app_service_integration_subnet_name = var.app_service_integration_subnet_name
  app_service_integration_subnet_prefix = var.app_service_integration_subnet_prefix
  data_subnet_name   = "snet-dados"
  data_subnet_prefix = var.data_subnet_prefix
  allowed_source_ip  = var.allowed_source_ip
  aks_vnet_address_prefixes = var.aks_vnet_address_prefixes
}

# ---------------------------------------------------------------------------
# VM Linux (estagio: vm)
# ---------------------------------------------------------------------------
module "virtual_machine" {
  source              = "./modules/virtual-machine"
  count               = var.deploy_vm ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  vm_name        = "vm-imersao"
  vm_size        = var.vm_size
  admin_username = var.vm_admin_username
  ssh_public_key = var.vm_ssh_public_key
  admin_password = var.vm_admin_password
  subnet_id      = module.network[0].app_subnet_id
  cloud_init     = file("${path.module}/../vm/cloud-init.yaml")
}

# ---------------------------------------------------------------------------
# Monitoramento (estagio: monitoring / opcional)
# ---------------------------------------------------------------------------
module "monitoring" {
  source              = "./modules/monitoring"
  count               = var.deploy_monitoring ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
  name                = "log-imersao-${local.suffix}"
}

# ---------------------------------------------------------------------------
# Container Registry (estagio: acr)
# ---------------------------------------------------------------------------
module "container_registry" {
  source              = "./modules/container-registry"
  count               = var.deploy_acr ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
  acr_name            = local.acr_name
  sku                 = var.acr_sku
}

# ---------------------------------------------------------------------------
# Key Vault (estagio: security)
# ---------------------------------------------------------------------------
module "key_vault" {
  source              = "./modules/key-vault"
  count               = var.deploy_key_vault ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
  key_vault_name      = local.key_vault_name
  public_access       = var.key_vault_public_access
}

# ---------------------------------------------------------------------------
# Azure SQL (estagio: sql)
# ---------------------------------------------------------------------------
module "sql_database" {
  source              = "./modules/sql-database"
  count               = var.deploy_sql ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sql_location        = var.sql_location
  tags                = local.tags

  server_name           = local.sql_server_name
  database_name         = var.sql_database_name
  sku_name              = var.sql_sku_name
  admin_login           = var.sql_admin_login
  admin_password        = var.sql_admin_password
  entra_admin_login     = var.sql_entra_admin_login
  entra_admin_object_id = var.sql_entra_admin_object_id
  allow_azure_services  = var.sql_allow_azure_services
  allowed_source_ip     = var.allowed_source_ip

  # Private Endpoint (Private Link) na sub-rede snet-dados + Zona DNS Privada.
  enable_private_endpoint = var.sql_private_endpoint
  public_network_access   = var.sql_public_network_access
  subnet_id               = local.want_network ? module.network[0].data_subnet_id : ""
  vnet_id                 = local.want_network ? module.network[0].vnet_id : ""
  aks_vnet_id             = local.aks_vnet_id
}

# ---------------------------------------------------------------------------
# Azure AI Foundry / Azure OpenAI (estagio: ai)
# ---------------------------------------------------------------------------
module "ai_foundry" {
  source              = "./modules/ai-foundry"
  count               = var.deploy_ai ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  account_name        = local.ai_account_name
  sku_name            = var.ai_sku_name
  deployment_name     = var.ai_deployment_name
  model_name          = var.ai_model_name
  model_version       = var.ai_model_version
  deployment_capacity = var.ai_deployment_capacity
}

# ---------------------------------------------------------------------------
# App Service (estagio: app-service)
# ---------------------------------------------------------------------------
module "app_service" {
  source              = "./modules/app-service"
  count               = var.deploy_app_service ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  app_name = local.app_service_name
  plan_sku = var.app_service_sku
  virtual_network_subnet_id = local.want_network && var.enable_app_service_vnet_integration ? module.network[0].app_service_integration_subnet_id : ""
}

# ---------------------------------------------------------------------------
# AKS (estagio: aks)
# ---------------------------------------------------------------------------
module "aks" {
  source              = "./modules/aks"
  count               = var.deploy_aks ? 1 : 0
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  aks_name                   = local.aks_name
  node_count                 = var.aks_node_count
  node_size                  = var.aks_node_size
  log_analytics_workspace_id = var.deploy_monitoring ? module.monitoring[0].workspace_id : null
}

# ---------------------------------------------------------------------------
# Integracoes entre estagios (role assignments) — sem segredos
# ---------------------------------------------------------------------------

# App Service (Identidade Gerenciada) -> Key Vault Secrets User
resource "azurerm_role_assignment" "app_kv_secrets" {
  count                = var.deploy_app_service && var.deploy_key_vault ? 1 : 0
  scope                = module.key_vault[0].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_service[0].principal_id
}

# AKS (kubelet) -> ACR Pull (sem senha estatica)
resource "azurerm_role_assignment" "aks_acr_pull" {
  count                = var.deploy_aks && var.deploy_acr ? 1 : 0
  scope                = module.container_registry[0].id
  role_definition_name = "AcrPull"
  principal_id         = module.aks[0].kubelet_object_id
}

# AKS (addon key vault secrets provider) -> Key Vault Secrets User (leitura via CSI)
resource "azurerm_role_assignment" "aks_kv_secrets" {
  count                = var.deploy_aks && var.deploy_key_vault ? 1 : 0
  scope                = module.key_vault[0].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.aks[0].secrets_provider_object_id
}

# Deployer (quem roda o Terraform) -> Key Vault Secrets Officer (criar/gravar segredos)
data "azurerm_client_config" "current" {}

resource "azurerm_role_assignment" "deployer_kv_officer" {
  count                = var.deploy_key_vault ? 1 : 0
  scope                = module.key_vault[0].id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# ---------------------------------------------------------------------------
# Conectividade AKS <-> Private Endpoint do Azure SQL (VNet Peering)
# ---------------------------------------------------------------------------
# VNet gerenciada do AKS (criada no node resource group MC_...).
data "azurerm_virtual_network" "aks" {
  count               = var.deploy_aks && var.sql_private_endpoint && var.aks_vnet_name != "" ? 1 : 0
  name                = var.aks_vnet_name
  resource_group_name = var.aks_node_resource_group
}

locals {
  aks_vnet_id = length(data.azurerm_virtual_network.aks) > 0 ? data.azurerm_virtual_network.aks[0].id : ""
}

# Peering: vnet-imersao -> aks-vnet
resource "azurerm_virtual_network_peering" "imersao_to_aks" {
  count                        = var.deploy_aks && var.sql_private_endpoint && var.aks_vnet_name != "" ? 1 : 0
  name                         = "peer-imersao-to-aks"
  resource_group_name          = azurerm_resource_group.main.name
  virtual_network_name         = module.network[0].vnet_name
  remote_virtual_network_id    = data.azurerm_virtual_network.aks[0].id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

# Peering: aks-vnet -> vnet-imersao (lado do node resource group)
resource "azurerm_virtual_network_peering" "aks_to_imersao" {
  count                        = var.deploy_aks && var.sql_private_endpoint && var.aks_vnet_name != "" ? 1 : 0
  name                         = "peer-aks-to-imersao"
  resource_group_name          = var.aks_node_resource_group
  virtual_network_name         = var.aks_vnet_name
  remote_virtual_network_id    = module.network[0].vnet_id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}
