variable "subscription_id" {
  description = "ID da assinatura Azure. Prefira exportar ARM_SUBSCRIPTION_ID e deixar vazio."
  type        = string
  default     = ""
}

variable "location" {
  description = "Regiao do RG manual e dos recursos novos do Dia 2."
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "RG criado manualmente no Portal no Dia 1 e consumido por data sources no Dia 2."
  type        = string
  default     = "rg-imersao-arquitetoazure"
}

variable "suffix" {
  description = "Sufixo minusculo alfanumerico para os nomes globais novos de ACR e AKS."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,10}$", var.suffix))
    error_message = "O sufixo deve ter de 3 a 10 caracteres minusculos alfanumericos."
  }
}

variable "portal_vnet_name" {
  description = "VNet criada pelo Portal no Dia 1."
  type        = string
  default     = "vnet-imersao"
}

variable "portal_data_nsg_name" {
  description = "NSG manual associado a snet-dados e usado para liberar somente TCP 1433 do AKS."
  type        = string
  default     = "nsg-snet-aplicacao"
}

variable "portal_data_subnet_prefix" {
  description = "Prefixo da snet-dados manual. Deve corresponder ao Portal e nao incluir outros destinos."
  type        = string
  default     = "10.10.2.0/24"
}

variable "portal_app_service_name" {
  description = "Nome do App Service criado pelo Portal no Dia 1."
  type        = string
}

variable "portal_sql_server_name" {
  description = "Nome do servidor logico Azure SQL criado pelo Portal no Dia 1."
  type        = string
}

variable "portal_sql_private_endpoint_name" {
  description = "Nome do Private Endpoint SQL criado pelo Portal no Dia 1."
  type        = string
}

variable "portal_sql_private_dns_zone_name" {
  description = "Zona DNS privada SQL criada pelo Portal no Dia 1."
  type        = string
  default     = "privatelink.database.windows.net"
}

variable "deploy_acr" {
  description = "Fase 1 do Dia 2: cria o ACR novo."
  type        = bool
  default     = false
}

variable "deploy_aks" {
  description = "Fase 1 do Dia 2: cria o AKS novo."
  type        = bool
  default     = false
}

variable "enable_aks_private_connectivity" {
  description = "Fase 2 do Dia 2: cria peering, vinculo DNS e regra NSG apos coletar a VNet gerenciada do AKS."
  type        = bool
  default     = false
}

variable "acr_sku" {
  description = "SKU do novo Azure Container Registry."
  type        = string
  default     = "Basic"
}

variable "aks_node_count" {
  description = "Quantidade de nos no pool inicial do AKS."
  type        = number
  default     = 1
}

variable "aks_node_size" {
  description = "Tamanho do pool inicial do AKS."
  type        = string
  default     = "Standard_B2s"
}

variable "aks_node_resource_group" {
  description = "RG gerenciado do AKS, coletado depois da fase 1 e usado apenas na fase 2."
  type        = string
  default     = ""
}

variable "aks_vnet_name" {
  description = "Nome da VNet gerenciada do AKS, coletado depois da fase 1 e usado apenas na fase 2."
  type        = string
  default     = ""
}

variable "aks_sql_nsg_priority" {
  description = "Prioridade nao usada pelo NSG do Portal para permitir AKS -> SQL TCP 1433."
  type        = number
  default     = 1004
}
