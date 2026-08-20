# ---------------------------------------------------------------------------
# Contexto / assinatura
# ---------------------------------------------------------------------------
variable "subscription_id" {
  description = "ID da assinatura Azure. Prefira exportar ARM_SUBSCRIPTION_ID e deixar vazio."
  type        = string
  default     = ""
}

variable "location" {
  description = "Regiao padrao dos recursos."
  type        = string
  default     = "brazilsouth"
}

variable "resource_group_name" {
  description = "Nome do Grupo de Recursos do laboratorio."
  type        = string
  default     = "rg-imersao-arquiteto-azure"
}

variable "suffix" {
  description = "Sufixo para nomes globalmente unicos. Vazio gera um sufixo aleatorio."
  type        = string
  default     = ""

  validation {
    condition     = var.suffix == "" || can(regex("^[a-z0-9]{3,10}$", var.suffix))
    error_message = "O sufixo deve ter de 3 a 10 caracteres minusculos alfanumericos."
  }
}

variable "tags" {
  description = "Tags padrao aplicadas a todos os recursos."
  type        = map(string)
  default = {
    Projeto       = "Imersao-Arquiteto-Azure"
    Ambiente      = "Workshop"
    GerenciadoPor = "IaC"
  }
}

# ---------------------------------------------------------------------------
# Flags de estagio (habilitar/desabilitar fases do workshop)
# ---------------------------------------------------------------------------
variable "deploy_network" {
  description = "Cria a Rede Virtual, Sub-rede e NSG."
  type        = bool
  default     = false
}

variable "deploy_vm" {
  description = "Cria a VM Linux (IaaS). Requer rede."
  type        = bool
  default     = false
}

variable "deploy_app_service" {
  description = "Cria o Azure App Service (PaaS)."
  type        = bool
  default     = false
}

variable "deploy_sql" {
  description = "Cria o Azure SQL (servidor logico e banco)."
  type        = bool
  default     = false
}

variable "deploy_key_vault" {
  description = "Cria o Azure Key Vault."
  type        = bool
  default     = false
}

variable "deploy_acr" {
  description = "Cria o Azure Container Registry."
  type        = bool
  default     = false
}

variable "deploy_aks" {
  description = "Cria o Azure Kubernetes Service."
  type        = bool
  default     = false
}

variable "deploy_monitoring" {
  description = "Cria Log Analytics e Application Insights."
  type        = bool
  default     = false
}

# ---------------------------------------------------------------------------
# Azure AI Foundry / Azure OpenAI
# ---------------------------------------------------------------------------
variable "deploy_ai" {
  description = "Cria o recurso Azure OpenAI (Azure AI Foundry) e o deployment do modelo."
  type        = bool
  default     = false
}

variable "ai_sku_name" {
  description = "SKU da conta Cognitive Services (Azure OpenAI)."
  type        = string
  default     = "S0"
}

variable "ai_deployment_name" {
  description = "Nome do deployment do modelo."
  type        = string
  default     = "gpt-4o-mini"
}

variable "ai_model_name" {
  description = "Nome do modelo do Azure OpenAI."
  type        = string
  default     = "gpt-4o-mini"
}

variable "ai_model_version" {
  description = "Versao do modelo do Azure OpenAI."
  type        = string
  default     = "2024-07-18"
}

variable "ai_deployment_capacity" {
  description = "Capacidade (mil tokens por minuto) do deployment."
  type        = number
  default     = 10
}

# ---------------------------------------------------------------------------
# Rede
# ---------------------------------------------------------------------------
variable "vnet_address_space" {
  description = "Espaco de enderecos da VNet."
  type        = string
  default     = "10.10.0.0/16"
}

variable "app_subnet_prefix" {
  description = "Prefixo da Sub-rede da aplicacao."
  type        = string
  default     = "10.10.1.0/24"
}

variable "enable_app_service_vnet_integration" {
  description = "Habilita a subnet delegada e a VNet Integration de saida do App Service. Mantenha false ate definir a subnet dedicada."
  type        = bool
  default     = false
}

variable "app_service_integration_subnet_name" {
  description = "Nome da subnet exclusiva e delegada a Microsoft.Web/serverFarms para VNet Integration do App Service. Defina ao habilitar a integracao."
  type        = string
  default     = ""
}

variable "app_service_integration_subnet_prefix" {
  description = "Prefixo sem sobreposicao da subnet exclusiva para VNet Integration do App Service. Defina ao habilitar a integracao."
  type        = string
  default     = ""
}

variable "data_subnet_prefix" {
  description = "Prefixo da Sub-rede de dados (Private Endpoint do Azure SQL)."
  type        = string
  default     = "10.10.2.0/24"
}

variable "allowed_source_ip" {
  description = "IP/CIDR autorizado para SSH (22) e app (3000). Nunca use '*'."
  type        = string
  default     = ""

  validation {
    condition     = var.allowed_source_ip != "*"
    error_message = "Nao e permitido liberar SSH/porta 3000 para a origem '*'."
  }
}

# ---------------------------------------------------------------------------
# VM
# ---------------------------------------------------------------------------
variable "vm_size" {
  description = "Tamanho economico da VM de laboratorio."
  type        = string
  default     = "Standard_B1s"
}

variable "vm_admin_username" {
  description = "Usuario administrador Linux."
  type        = string
  default     = "azureuser"
}

variable "vm_ssh_public_key" {
  description = "Chave SSH publica para autenticacao da VM (use esta OU vm_admin_password)."
  type        = string
  default     = ""
}

variable "vm_admin_password" {
  description = "Senha do administrador Linux (use esta OU vm_ssh_public_key). Forneca via TF_VAR_vm_admin_password, nunca em arquivo versionado."
  type        = string
  default     = ""
  sensitive   = true
}

# ---------------------------------------------------------------------------
# App Service
# ---------------------------------------------------------------------------
variable "app_service_sku" {
  description = "SKU do App Service Plan Linux."
  type        = string
  default     = "B1"
}

# ---------------------------------------------------------------------------
# Azure SQL
# ---------------------------------------------------------------------------
variable "sql_admin_login" {
  description = "Login administrativo SQL (fase didatica)."
  type        = string
  default     = "imersaoadmin"
}

variable "sql_admin_password" {
  description = "Senha administrativa SQL. Nunca versione. Use TF_VAR_sql_admin_password."
  type        = string
  default     = ""
  sensitive   = true
}

variable "sql_database_name" {
  description = "Nome do banco de dados."
  type        = string
  default     = "imersao"
}

variable "sql_sku_name" {
  description = "SKU do banco (economico para laboratorio)."
  type        = string
  default     = "Basic"
}

variable "sql_entra_admin_login" {
  description = "UPN do administrador Microsoft Entra ID do SQL (opcional)."
  type        = string
  default     = ""
}

variable "sql_entra_admin_object_id" {
  description = "Object ID do administrador Microsoft Entra ID do SQL (opcional)."
  type        = string
  default     = ""
}

variable "sql_allow_azure_services" {
  description = "Libera 'Servicos do Azure' no firewall do SQL apenas durante o laboratorio."
  type        = bool
  default     = false
}

variable "sql_private_endpoint" {
  description = "Cria o Azure SQL em modo Private Endpoint (Private Link) na sub-rede snet-dados, com Zona DNS Privada."
  type        = bool
  default     = true
}

variable "sql_location" {
  description = "Regiao do Azure SQL (pode diferir da regiao da rede; o Private Endpoint suporta cross-region). Vazio usa a regiao padrao."
  type        = string
  default     = ""
}

variable "sql_public_network_access" {
  description = "Mantem o acesso publico do Azure SQL habilitado (com firewall) alem do Private Endpoint. Em producao, defina false para acesso exclusivamente privado."
  type        = bool
  default     = true
}

variable "aks_vnet_name" {
  description = "Nome da VNet gerenciada do AKS (MC_...), usada para peering e vinculo da Zona DNS Privada."
  type        = string
  default     = ""
}

variable "aks_node_resource_group" {
  description = "Resource group gerenciado do AKS (MC_<rg>_<aks>_<location>) onde vive a VNet do cluster."
  type        = string
  default     = ""
}

variable "aks_vnet_address_prefixes" {
  description = "Prefixos de endereco da VNet do AKS permitidos a acessar o Private Endpoint SQL na porta TCP 1433."
  type        = list(string)
  default     = []
}

# ---------------------------------------------------------------------------
# Key Vault
# ---------------------------------------------------------------------------
variable "key_vault_public_access" {
  description = "Permite acesso publico ao Key Vault (laboratorio)."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# ACR
# ---------------------------------------------------------------------------
variable "acr_sku" {
  description = "SKU do Container Registry."
  type        = string
  default     = "Basic"
}

# ---------------------------------------------------------------------------
# AKS
# ---------------------------------------------------------------------------
variable "aks_node_count" {
  description = "Quantidade de nos do pool inicial."
  type        = number
  default     = 1
}

variable "aks_node_size" {
  description = "Tamanho dos nos do AKS."
  type        = string
  default     = "Standard_B2s"
}
