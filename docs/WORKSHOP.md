# Imersao Arquiteto Azure - Cloud & AI

Este guia e um roteiro hands-on para executar ou validar a arquitetura da AzureShop. Ele foi escrito para iniciantes, mas inclui checkpoints tecnicos para participantes avancados.

> **Regra de seguranca:** nunca coloque senha, chave, token, connection string ou dado de cliente em Git, VS Code Chat, Copilot Chat, `terraform.tfvars`, manifestos, logs ou chat. Use valores `[definir]` ate ter um canal seguro aprovado.

> **Regra de capacidade:** nenhuma SKU, quota, regiao ou servico pago esta garantido. Confirme a combinacao **subscription + regiao + SKU** antes de cada criacao. Quando a capacidade nao existir, use o ambiente compartilhado do instrutor e siga o caminho de observacao, plano e manifestos.

## Indice

1. [Antes de comecar](#antes-de-comecar)
2. [Mapa de onde cada atividade acontece](#mapa-de-onde-cada-atividade-acontece)
3. [Modo de validacao do instrutor](#modo-de-validacao-do-instrutor)
4. [Checklist pre-aula](#checklist-pre-aula)
5. [Dia 1 - Portal, VM, App Service e dados](#dia-1---portal-vm-app-service-e-dados)
   1. [Lab 1 - Resource Group e contexto](#lab-1---resource-group-e-contexto)
   2. [Lab 2 - Rede fundamental](#lab-2---rede-fundamental)
   3. [Lab 3 - VM, GitHub Copilot e analise de modernizacao](#lab-3---vm-github-copilot-e-analise-de-modernizacao)
   4. [Lab 4 - Adaptacao revisada e publicacao no App Service](#lab-4---adaptacao-revisada-e-publicacao-no-app-service)
   5. [Lab 5 - Azure SQL Database](#lab-5---azure-sql-database)
   6. [Lab 6 - Private Endpoint e Private DNS](#lab-6---private-endpoint-e-private-dns)
   7. [Lab 7 - VNet Integration do App Service](#lab-7---vnet-integration-do-app-service)
6. [Dia 2 - Cloud Shell, Terraform, ACR e AKS](#dia-2---cloud-shell-terraform-acr-e-aks)
   1. [Lab 8 - Preparacao e plano Terraform](#lab-8---preparacao-e-plano-terraform)
   2. [Lab 9 - ACR e AKS: fase 1](#lab-9---acr-e-aks-fase-1)
   3. [Lab 10 - Peering, DNS e NSG: fase 2](#lab-10---peering-dns-e-nsg-fase-2)
   4. [Lab 11 - Azure AI Foundry com configuracao segura](#lab-11---azure-ai-foundry-com-configuracao-segura)
   5. [Lab 12 - Build e publicacao no AKS](#lab-12---build-e-publicacao-no-aks)
7. [Matriz de aceite por Lab](#matriz-de-aceite-por-lab)
8. [Troubleshooting e cleanup](#troubleshooting-e-cleanup)
9. [Referencias oficiais](#referencias-oficiais)

## Antes de comecar

### Obrigatorio

1. Computador atualizado com navegador moderno (Edge ou Chrome), internet estavel e e-mail.
2. Assinatura Azure ativa. Trial pode ter credito, limite, quota ou regiao indisponivel; Pay-As-You-Go tambem gera custo. Confirme [assinatura e cobranca](https://learn.microsoft.com/azure/cost-management-billing/manage/create-subscription) antes da aula.
3. [VS Code](https://code.visualstudio.com/Download), [Git](https://git-scm.com/downloads) e conta [GitHub](https://github.com/signup).
4. [GitHub Copilot para VS Code](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot), instalado e autenticado. Elegibilidade e plano dependem da conta.
5. [PuTTY](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html) no Windows para SSH. macOS/Linux podem usar `ssh` nativo.
6. Projeto clonado:

   ```bash
   git clone https://github.com/highexpert-tecnologia/azureshop.git
   cd azureshop
   ```

   O [Download ZIP](https://github.com/highexpert-tecnologia/azureshop/archive/refs/heads/main.zip) serve apenas para leitura; Git e clone sao o caminho principal.

### Ferramentas que nao precisa instalar localmente

- Azure CLI, Terraform, Docker e `kubectl`: o caminho oficial usa [Azure Cloud Shell](https://learn.microsoft.com/azure/cloud-shell/overview) em **Bash**.
- Docker local e opcional. O Lab 12 usa ACR Build.

### Arquivos reais que voce usara

| Arquivo | Papel |
|---|---|
| `package.json` | Scripts `dev`, `start` e `test`; Node.js `>=20`. |
| `src/server.js` | Entrada da aplicacao. |
| `src/app.js` | API, incluido `/api/health`, `/api/products` e pedidos. |
| `.env.example` | Modelo local seguro; padrao `DB_PROVIDER=sqlite`. |
| `infra/sql/schema.sql` | Esquema idempotente para Azure SQL. |
| `Dockerfile` | Imagem Node 22, porta 3000 e health check. |
| `infra/terraform/` | Modelo A do Dia 2. |
| `infra/k8s/` | Namespace, ConfigMap, Deployment, Service e exemplos de segredo. |

## Mapa de onde cada atividade acontece

| Ambiente | O que fazer | O que nao fazer |
|---|---|---|
| **Portal Azure** | Dia 1: RG, rede, VM, App Service, SQL, Private Endpoint, DNS e VNet Integration. | Colar segredos em campos compartilhados ou criar sem revisar SKU/custo. |
| **VS Code + GitHub Copilot** | Ler codigo, pedir analise, revisar diffs, editar e executar testes locais opcionais. | Esperar que Copilot crie Azure, execute migracao ou aprove mudancas sozinho. |
| **Cloud Shell Bash** | Preflight, Azure CLI, Terraform, ACR Build e `kubectl` do Dia 2. | Salvar senha em historico, state, `tfvars` ou arquivo do repositorio. |
| **GitHub** | Versionar alteracoes revisadas do codigo e documentacao. | Versionar `.env`, state, plano, segredo Kubernetes ou arquivo de senha. |
| **Ambiente compartilhado do instrutor** | Demonstrar recursos bloqueados por quota/capacidade e permitir observacao. | Usar como justificativa para ignorar revisao de plano, seguranca ou custo. |

## Modo de validacao do instrutor

Use este modo **antes da aula** ou quando nao houver autorizacao para criar recursos. Ele e read-only/dry-run.

```bash
bash scripts/preflight-workshop-readonly.sh
```

O script consulta apenas conta, providers, SKUs de VM, uso de compute, catalogo/uso do App Service, versoes AKS e provider de IA. Ele nao cria, atualiza, remove, faz build, deploy, `terraform apply` ou operacao de dados.

No Portal, percorra as telas sem selecionar **Create**. No Terraform, rode somente:

```bash
cd infra/terraform
terraform init -backend=false
terraform fmt -check
terraform validate
terraform plan
```

`plan` le o ambiente e grava arquivos locais temporarios; nao cria Azure. Mantenha state, planos e `terraform.tfvars` fora do Git; `.gitignore` ja cobre esses arquivos.

### Achados reais e contingencias

- **VM East US:** `Standard_B2s` retornou `SkuNotAvailable`. Entre as SKUs avaliadas na consulta mais recente, somente `Standard_D2als_v7` retornou `restrictions=[]`. Isso e um retrato momentaneo, nao uma promessa; consulte novamente antes de criar.
- **App Service:** a quota para **B1** foi insuficiente na subscription atualmente validada. Antes do Lab 4, valide quota de App Service no Portal/preflight e escolha somente uma combinacao de SKU, regiao e subscription aprovada.
- **AKS:** nao exija cluster individual de todos os alunos sem quota e capacidade comprovadas. O aluno pode revisar `plan`, manifestos e evidencias; o instrutor usa ambiente compartilhado para demonstrar cluster, peering e rollout.
- Crie budget/alertas, teste cada subscription/regiao antes da turma e mantenha ambiente demonstrativo pronto.

## Checklist pre-aula

- [ ] GitHub e Copilot autenticados no VS Code.
- [ ] Projeto clonado e aberto; `package.json`, `docs/`, `infra/terraform/` e `infra/k8s/` localizados.
- [ ] Portal aberto; diretorio, subscription, RBAC, cobranca, budget e regiao conferidos.
- [ ] Cloud Shell aberto em **Bash**; armazenamento persistente aceito conscientemente, se solicitado.
- [ ] Preflight read-only executado e evidencias nao sensiveis registradas.
- [ ] SKU da VM, quota do App Service, SQL, ACR, AKS e IA confirmadas ou ambiente compartilhado definido.
- [ ] Senhas serao digitadas somente no Portal ou por canal seguro; nao no chat, Git ou arquivo do curso.

# Dia 1 - Portal, VM, App Service e dados

## Lab 1 - Resource Group e contexto

**Objetivo:** criar o contenedor do laboratorio e confirmar custo/RBAC.

**Antes de comecar:** subscription aprovada, permissao para criar RG e regiao East US confirmada.

### Passos no Portal

1. Entre em [portal.azure.com](https://portal.azure.com/) e abra **Subscriptions**. Confirme nome, status, tenant e cobranca.
2. Abra **Resource groups** > **Create**.
3. Preencha:
   - Subscription: `[definir: subscription aprovada]`;
   - Resource group: `rg-imersao-arquitetoazure`;
   - Region: **East US**.
4. Em **Tags**, informe somente valores nao sensiveis:
   - `ambiente = workshop`;
   - `curso = Imersao-Arquiteto-Azure`;
   - `responsavel = [definir]`;
   - `custo = [definir]`.
5. Selecione **Review + create**, leia custo/politicas e selecione **Create** somente com autorizacao.
6. Abra o RG criado e localize **Activity log**, **Cost Management** e **Resource visualizer**.

**Resultado esperado:** RG em East US, tags visiveis e atividade de criacao registrada.

**Validacao:** confirme subscription, location e quatro tags. Se algum campo divergir, pare antes do Lab 2.

**Falhas e contingencia:** RBAC/Policy bloqueou a criacao -> instrutor cria ou usa ambiente compartilhado. Regiao nao aprovada -> nao substitua sem revisar quotas.

**Custo e cleanup:** RG sozinho nao e o custo principal; ele nao apaga custos ja gerados. Ao fim, remova recursos somente com autorizacao e depois revise o RG.

## Lab 2 - Rede fundamental

**Objetivo:** criar VNet, subnets e NSG com menor privilegio.

**Antes de comecar:** Lab 1 concluido; CIDR publico autorizado para SSH confirmado. Nunca use `Any`/`*` como origem SSH.

### Passos no Portal

1. Abra **Virtual networks** > **Create**.
2. Na aba basica, escolha o RG do Lab 1, nome `vnet-imersao` e East US.
3. Em **IP Addresses**, use espaco `10.10.0.0/16` e crie:
   - `snet-aplicacao` - `10.10.1.0/24`;
   - `snet-dados` - `10.10.2.0/24`;
   - `snet-appservice-integration` - `10.10.3.0/24`, delegada a `Microsoft.Web/serverFarms`.
4. Crie a VNet e abra **Subnets** para confirmar prefixos e delegacao.
5. Abra **Network security groups** > **Create**. Nome: `nsg-snet-aplicacao`, mesmo RG/regiao.
6. No NSG, abra **Inbound security rules** > **Add** e informe:
   - Source: **IP Addresses**;
   - Source IP addresses/CIDR: `[definir: CIDR autorizado]`;
   - Source port ranges: `*`;
   - Destination: **Any**;
   - Service: **SSH** ou porta destino `22`;
   - Protocol: TCP; action Allow; priority `1000`;
   - Name: `Allow-SSH-From-Authorized-CIDR`.
7. Associe o NSG a `snet-aplicacao` e `snet-dados`. Se ja houver outro NSG associado, pare e entenda a divergencia; nao o substitua.
8. Nao associe NSG/VNet Integration/Private Endpoint a `snet-appservice-integration` alem do uso previsto, e nao use `snet-dados` para VM ou VNet Integration.

**Resultado esperado:** tres subnets sem sobreposicao; NSG restrito; SSH somente da origem autorizada.

**Validacao:** no Portal, confira prefixos, delegacao e regra. A API pode exibir `*` como campo unico, lista ou nulo complementar; valide a intencao da regra, nao apenas a representacao.

**Falhas e contingencia:** prefixo sobreposto, NSG diferente ou CIDR amplo -> corrija antes de criar cargas. Sem CIDR seguro -> use demonstracao, nao abra SSH.

**Custo e cleanup:** VNet/NSG nao sao o principal custo; a superficie de ataque de regra ampla e o risco principal.

## Lab 3 - VM, GitHub Copilot e analise de modernizacao

**Objetivo:** criar uma VM de referencia e usar Copilot para analisar - nao executar - a modernizacao para PaaS.

**Antes de comecar:** Labs 1-2 concluidos, PuTTY/SSH disponivel, Copilot autenticado e capacidade de VM confirmada.

### Parte A - confirmar capacidade antes da VM

1. No Portal, abra **Virtual machines** > **Create** e selecione RG/East US.
2. Na tela **Size**, pesquise o tamanho que pretende usar. O fato de um tamanho aparecer na documentacao nao confirma capacidade.
3. Alternativamente, no Cloud Shell:

   ```bash
   az vm list-skus --location eastus --resource-type virtualMachines --size Standard_D2als_v7 -o table
   ```

4. So prossiga quando a SKU/regiao/zona aprovada estiver disponivel. O resultado atual de `Standard_D2als_v7` nao garante disponibilidade futura.

**Go/no-go:** se surgir `SkuNotAvailable`, pare. Tente outra SKU, regiao ou zona somente apos preflight e aprovacao; caso contrario use ambiente compartilhado.

### Parte B - criar e acessar a VM no Portal

1. Em **Basics**, selecione:
   - Resource group: `rg-imersao-arquitetoazure`;
   - Virtual machine name: `vm-imersao`;
   - Region: East US;
   - Image: **Ubuntu Server 22.04 LTS**;
   - Size: `[definir: SKU validada agora]`;
   - Authentication type: **Password**;
   - Username: `[definir]`;
   - Password: crie e digite localmente. Nunca salve no repositorio, `.env`, `tfvars`, script ou chat.
2. Em **Networking**, escolha:
   - VNet `vnet-imersao`;
   - Subnet `snet-aplicacao`;
   - Public IP: **Create new**, SKU Standard, Static, IPv4;
   - NIC: crie uma NIC nova;
   - NSG: escolha o NSG existente `nsg-snet-aplicacao`.
3. Em **Management**, mantenha diagnosticos conforme politica da turma. Nao habilite recursos pagos sem revisar.
4. Em **Advanced**, nao cole cloud-init que contenha credenciais. `infra/vm/cloud-init.yaml` e somente referencia e usa o usuario `azureuser`; se o usuario criado for outro, revise o arquivo antes de usa-lo.
5. Em **Review + create**, confirme imagem, tamanho, rede, PIP e a regra SSH. Selecione **Create** somente quando tudo coincidir.
6. Depois do estado **Succeeded**, abra a VM > **Connect** > **SSH**. Copie apenas o host/IP publico para PuTTY ou terminal; digite a senha localmente quando solicitado.
7. No Linux, valide:

   ```bash
   whoami
   uname -a
   ```

**Resultado esperado:** VM em execucao, PIP Standard/Static/IPv4, NIC em `snet-aplicacao` e SSH restrito ao seu CIDR.

**Falhas e contingencia:** SSH nao conecta -> confira PIP, estado da VM, CIDR, prioridade do NSG e firewall local. Nao altere a regra para Internet inteira. Sem quota/SKU -> ambiente compartilhado.

**Custo e cleanup:** VM, PIP e discos podem cobrar enquanto existem. Pare/desaloque apenas reduz parte do custo; remova PIP/disco/VM quando o instrutor autorizar.

### Parte C - analise guiada com GitHub Copilot

Copilot **nao cria recursos Azure, nao executa migracao sozinho e nao aprova alteracoes**. Ele gera analise e sugestoes; voce revisa e aplica.

1. No computador local, abra o checkout no VS Code: **File** > **Open Folder** > pasta `azureshop`.
2. Abra o painel **Chat** do GitHub Copilot. Nao anexe `.env`, senha, log sensivel ou dados de clientes.
3. Envie este prompt:

   ```text
   Analise esta aplicacao Node.js para uma migracao de VM para Azure App Service.
   Leia package.json, src/server.js, src/app.js, src/config.js, Dockerfile e .env.example.
   Informe: runtime minimo, comando de inicio, porta, health check, configuracoes de
   banco, estado local e riscos de PaaS. Nao exponha, invente ou solicite segredos.
   Nao altere arquivos. Produza uma checklist para revisao humana.
   ```

4. Compare a resposta com os arquivos reais:
   - `package.json`: Node `>=20`, `npm start` executa `node src/server.js`, `npm test` executa `node --test`;
   - `src/app.js`: health em `/api/health`;
   - `src/config.js`: banco padrao SQLite e variaveis Azure SQL;
   - `Dockerfile`: porta 3000 e Node 22 na imagem.
5. Registre somente configuracoes nao sensiveis confirmadas. Se Copilot sugerir runtime, porta ou arquivo inexistente, corrija a sugestao antes de continuar.

## Lab 4 - Adaptacao revisada e publicacao no App Service

**Objetivo:** revisar alteracoes sugeridas e publicar a aplicacao no App Service por um fluxo unico e verificavel.

**Antes de comecar:** Lab 3 concluido; quota e SKU de App Service conferidas. A quota B1 foi insuficiente na subscription testada; nao assuma B1 disponivel.

### Parte A - revisar e aplicar sugestoes do Copilot

1. No Copilot Chat, envie:

   ```text
   Proponha apenas alteracoes minimas para tornar esta aplicacao adequada ao Azure App Service.
   Preserve API, carrinho, checkout e comportamento. Use configuracao por variavel de ambiente,
   mantenha /api/health e nao adicione senhas, tokens ou connection strings.
   Mostre um plano por arquivo e espere minha revisao antes de editar.
   ```

2. Leia o plano. Recuse alteracoes que removam rotas, troquem banco sem configuracao ou introduzam segredo.
3. Se o plano for aprovado, envie:

   ```text
   Aplique somente as alteracoes aprovadas. Depois mostre o diff e explique como validar
   com os scripts existentes de package.json. Nao execute comandos Azure e nao crie arquivos de segredo.
   ```

4. Abra **Source Control** no VS Code e revise cada diff. Desfaca sugestoes erradas; Copilot nao substitui revisao humana.
5. **Opcional: validar localmente.** Isso nao e requisito para acompanhar o curso, mas e util antes de publicar:

   ```bash
   npm ci
   npm test
   npm start
   ```

   - `npm ci` instala exatamente o lockfile;
   - `npm test` executa `node --test`;
   - `npm start` inicia `src/server.js` na porta 3000 por padrao.

   Em outro terminal, se voce escolheu iniciar localmente:

   ```bash
   curl http://127.0.0.1:3000/api/health
   ```

   Pare com `Ctrl+C`. Se nao quiser executar localmente, rode apenas `npm ci` e `npm test`.

### Parte B - criar App Service pelo Portal

1. No Portal, abra **App Service plans** > **Create**.
2. Escolha RG, East US e Linux. Se a SKU aprovada estiver indisponivel ou sem quota, pare e use outra combinacao aprovada ou ambiente compartilhado.
3. Abra **App Services** > **Create**:
   - Resource group: o RG do Lab 1;
   - Name: `[definir: nome globalmente unico]`;
   - Publish: Code;
   - Runtime stack: uma versao Node.js disponivel no Portal que atenda ao `engines.node >=20` do `package.json`;
   - Operating System: Linux;
   - App Service Plan: o plano criado.
4. Em **Environment variables**, configure apenas:

   | Nome | Valor inicial |
   |---|---|
   | `APP_ENV` | `azure` |
   | `DB_PROVIDER` | `sqlite` |
   | `SQLITE_PATH` | `/home/data/loja.db` |

5. Crie o recurso e copie o **Default domain** quando estiver `Running`.

### Parte C - publicar por ZIP via Cloud Shell

O Portal cria o App Service; a publicacao usa um unico fluxo: ZIP pelo Cloud Shell com `az webapp deploy`. Isso evita criar workflow GitHub Actions sem revisao.

1. No Cloud Shell, clone ou atualize o repositorio:

   ```bash
   git clone https://github.com/highexpert-tecnologia/azureshop.git
   cd azureshop
   git pull --ff-only
   ```

2. Crie ZIP sem `.env`, `node_modules`, dados locais ou arquivos de segredo:

   ```bash
   zip -r ../azureshop.zip . \
     -x 'node_modules/*' '.env' '.env.*' 'data/*' '*.tfstate*' '*.tfvars' 'infra/k8s/secret.yaml'
   ```

3. Publique o ZIP:

   ```bash
   az webapp deploy \
     --resource-group rg-imersao-arquitetoazure \
     --name "[definir: nome do App Service]" \
     --type zip \
     --src-path ../azureshop.zip
   ```

4. No Portal, abra **Log stream** e **Configuration**. Confirme que nenhuma senha foi enviada.
5. Valide no navegador ou Cloud Shell:

   ```bash
   curl -fsS "https://[definir: default-domain]/api/health"
   curl -fsS "https://[definir: default-domain]/api/products"
   ```

6. No navegador, abra o catalogo, adicione item ao carrinho e avance no checkout. Enquanto `DB_PROVIDER=sqlite`, pedidos usam o SQLite persistido no diretorio configurado do App Service, o que nao e uma estrategia duravel para producao.

**Resultado esperado:** health retorna `status: ok`, catalogo responde e UI funciona.

**Falhas e contingencia:** runtime incompatível -> revise `package.json` e stack. Falha de ZIP -> confira se `package.json`, `src/` e `public/` estao na raiz do ZIP. Sem quota -> ambiente compartilhado.

**Custo e cleanup:** plano fica cobrado enquanto ativo; acompanhe Cost Management e remova somente com autorizacao.

## Lab 5 - Azure SQL Database

**Objetivo:** criar o banco, aplicar o esquema e mudar a AzureShop de SQLite para SQL Server.

**Antes de comecar:** Lab 4 saudavel; SKU/regiao do SQL e canal seguro de senha aprovados.

### Passos no Portal

1. Abra **SQL databases** > **Create**.
2. Selecione o RG. Database name: `imersao`.
3. Em **Server**, crie ou escolha um servidor logico:
   - Server name: `[definir: globalmente unico]`;
   - Region: `[definir: regiao/SKU confirmadas]`;
   - Authentication: SQL authentication;
   - Server admin login: `[definir]`;
   - Password: digite por canal seguro; nunca registre.
4. Escolha uma SKU aprovada, reveja a estimativa e crie.
5. Abra o banco > **Query editor**. Autentique sem expor a senha em screenshot/chat.
6. Abra `infra/sql/schema.sql` no VS Code, revise e execute o conteudo no Query editor. O arquivo e idempotente e cria/atualiza tabelas e catalogo.
7. Mantenha acesso publico do SQL habilitado temporariamente somente enquanto o caminho privado ainda nao foi validado.

### Mudar a aplicacao para SQL

O codigo **ja suporta** SQL Server: `src/config.js` seleciona SQL quando `DB_PROVIDER=sqlserver`, e `src/db/sqlserver.js` implementa o repositorio. A migracao so fica ativa quando as quatro variaveis SQL estiverem configuradas.

No App Service > **Environment variables**, altere:

| Nome | Valor |
|---|---|
| `DB_PROVIDER` | `sqlserver` |
| `AZURE_SQL_SERVER` | `[servidor].database.windows.net` |
| `AZURE_SQL_DATABASE` | `imersao` |
| `AZURE_SQL_USER` | `[definir]` |
| `AZURE_SQL_PASSWORD` | injecao segura aprovada; nunca registrar |

Salve e reinicie o App Service se o Portal solicitar.

**Resultado esperado:** `/api/health` retorna banco `sqlserver`; produtos e pedidos podem ser lidos/criados no banco.

**Validacao:** execute health, catalogo e um pedido de teste sem dados pessoais reais; confira tabelas/pedido no Query editor.

**Falhas e contingencia:** schema nao aplicado, credencial incorreta, firewall ou DNS -> volte a revisar o estado, sem colocar senha em log. Se a configuracao segura de senha nao existir, mantenha SQLite apenas como demonstracao e trate migracao SQL como pendente.

**Custo e cleanup:** SQL cobra por SKU/armazenamento. Nao aumente SKU sem revisar custo.

## Lab 6 - Private Endpoint e Private DNS

**Objetivo:** preparar o caminho privado para SQL.

**Antes de comecar:** Labs 2 e 5; SQL existente; `snet-dados` exclusiva.

### Passos no Portal

1. Abra `vnet-imersao` > **Subnets** e confirme `snet-dados` = `10.10.2.0/24`.
2. Abra o SQL Server > **Networking** > **Private endpoint connections** > **Create**.
3. Preencha:
   - Name: `[definir]`;
   - Resource type: `Microsoft.Sql/servers`;
   - Target sub-resource: `sqlServer`;
   - VNet: `vnet-imersao`;
   - Subnet: `snet-dados`.
4. Em **DNS**, crie/selecione `privatelink.database.windows.net` e o zone group.
5. Conclua e aguarde a conexao **Approved**.
6. Na Private DNS Zone, abra **Virtual network links** e confirme link para `vnet-imersao`, com auto-registration desabilitado.
7. Anote somente nomes nao secretos do servidor, PE e zona para o Terraform do Dia 2.

**Resultado esperado:** PE Approved, IP privado em `snet-dados`, zone group e link DNS presentes.

**Validacao:** o hostname normal `[servidor].database.windows.net`, e nao o nome `privatelink`, deve resolver para IP privado a partir de uma carga na VNet.

**Falhas e contingencia:** PE em subnet errada, zona sem link ou estado Pending -> pare e corrija antes do Lab 7. Nao desabilite acesso publico ainda.

**Custo e cleanup:** Private Endpoint pode cobrar; revise estimativa.

## Lab 7 - VNet Integration do App Service

**Objetivo:** permitir que o App Service alcance o SQL pelo PE.

**Antes de comecar:** Lab 6 Approved; plano de App Service compativel; `snet-appservice-integration` vazia e delegada.

### Passos no Portal

1. Abra `vnet-imersao` e confirme:
   - `snet-appservice-integration`;
   - prefixo `10.10.3.0/24`;
   - delegacao `Microsoft.Web/serverFarms`.
2. Abra App Service > **Networking** > **VNet integration** > **Add VNet**.
3. Escolha `vnet-imersao` e `snet-appservice-integration`. Nunca escolha `snet-dados`.
4. No NSG `nsg-snet-aplicacao` associado a dados, crie regra:
   - Source: `10.10.3.0/24`;
   - Destination: `10.10.2.0/24`;
   - Protocol: TCP;
   - Destination port: `1433`;
   - Action: Allow;
   - Priority: `1003`, se livre;
   - Name: `Allow-AppService-To-SQL-1433`.
5. Mantenha `AZURE_SQL_SERVER` no hostname normal do SQL e reinicie a aplicacao se necessario.
6. Confirme health e acesso a produtos/pedidos.

**Ordem segura obrigatoria:** somente considere desabilitar acesso publico do SQL depois de PE Approved + link DNS + VNet Integration + TCP 1433 + health da aplicacao comprovados. Essa decisao nao e automatica no workshop.

**Falhas e contingencia:** subnet sem delegacao, SKU nao suporta integracao, DNS resolve IP publico ou timeout 1433 -> mantenha acesso atual, investigue e use ambiente compartilhado.

**Custo e cleanup:** revise custo do plano e PE.

# Dia 2 - Cloud Shell, Terraform, ACR e AKS

O Dia 2 usa o **Modelo A**:

- Dia 1 e Portal: RG, VNet, NSG, App Service, SQL, PE e DNS.
- Terraform fase 1 cria apenas ACR, AKS e `AcrPull`.
- Terraform fase 2 cria apenas dois peerings, link DNS da VNet AKS e regra NSG AKS -> SQL.
- Terraform nao cria nem importa recursos do Dia 1.

## Lab 8 - Preparacao e plano Terraform

**Objetivo:** configurar variaveis nao secretas, validar o handoff e revisar plano.

**Antes de comecar:** Labs 1-7 completos ou ambiente compartilhado equivalente; preflight/quota revisados.

### Passos no Cloud Shell

1. Abra Cloud Shell em Bash, confirme a conta:

   ```bash
   az account show
   ```

2. Obtenha codigo:

   ```bash
   git clone https://github.com/highexpert-tecnologia/azureshop.git
   cd azureshop
   git pull --ff-only
   cd infra/terraform
   ```

3. Copie o exemplo local:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. Edite somente identificadores nao secretos:

   | Variavel | Origem |
   |---|---|
   | `location`, `resource_group_name`, `suffix` | decisao aprovada do Lab 1 |
   | `portal_vnet_name`, `portal_data_nsg_name`, `portal_data_subnet_prefix` | Lab 2 |
   | `portal_app_service_name` | Lab 4 |
   | `portal_sql_server_name` | Lab 5 |
   | `portal_sql_private_endpoint_name`, `portal_sql_private_dns_zone_name` | Lab 6 |

   Nunca coloque senha de VM/SQL em `terraform.tfvars`.

5. Mantenha inicialmente:

   ```hcl
   deploy_acr = false
   deploy_aks = false
   enable_aks_private_connectivity = false
   ```

6. Execute:

   ```bash
   terraform init -backend=false
   terraform fmt -check
   terraform validate
   terraform plan -out=tfplan-inicial
   terraform show -no-color tfplan-inicial
   ```

**Resultado esperado:** data sources encontram os recursos do Dia 1; plano nao tenta criar RG, VNet, NSG, App Service, SQL, PE ou DNS.

**Inspecao de variaveis e outputs:**

```bash
terraform providers
terraform output
```

Antes da fase 1, outputs de ACR/AKS podem ser nulos. Apos a fase 1, use `terraform output -raw acr_login_server`, `terraform output -raw aks_name` e `terraform output -raw aks_node_resource_group`.

**Falhas e contingencia:** data source falhou -> nome/RG/regiao nao coincide; nao troque o Terraform para recriar recurso manual. Use plan/manifests e ambiente compartilhado.

**Custo e cleanup:** `init`, `fmt`, `validate` e `plan` nao criam Azure. State/plano local nao deve ser commitado.

## Lab 9 - ACR e AKS: fase 1

**Objetivo:** criar a camada nova de containers depois de quota, SKU e plano aprovados.

**Antes de comecar:** Lab 8 aprovado; quota AKS/ACR e tamanho de no confirmados. `aks_node_size` em `terraform.tfvars.example` e apenas um exemplo; confirme SKU atual.

### Passos

1. Em `terraform.tfvars`, defina:

   ```hcl
   deploy_acr = true
   deploy_aks = true
   enable_aks_private_connectivity = false
   ```

2. Gere e revise:

   ```bash
   terraform plan -out=tfplan-fase1
   terraform show -no-color tfplan-fase1
   ```

3. O plano deve conter somente ACR, AKS e role `AcrPull`. Se contiver recurso manual do Dia 1, pare.
4. Com aprovacao separada, aplique:

   ```bash
   terraform apply tfplan-fase1
   ```

5. Obtenha dados nao secretos:

   ```bash
   terraform output
   terraform output -raw aks_get_credentials
   terraform output -raw aks_node_resource_group
   ```

6. Execute o comando retornado por `aks_get_credentials` ou:

   ```bash
   az aks get-credentials \
     --resource-group rg-imersao-arquitetoazure \
     --name "[definir: aks_name]" \
     --overwrite-existing
   kubectl get nodes
   ```

**Resultado esperado:** ACR e AKS `Succeeded`, nos `Ready`, role `AcrPull` criada.

**Falhas e contingencia:** quota/SKU/RBAC -> nao crie cluster alternativo sem aprovacao. Aluno revisa plano e manifestos; instrutor demonstra em cluster compartilhado.

**Custo e cleanup:** AKS e ACR geram custo. Nao deixe cluster individual ativo sem objetivo e cleanup aprovados.

## Lab 10 - Peering, DNS e NSG: fase 2

**Objetivo:** conectar a VNet AKS ao PE SQL sem recriar o Dia 1.

**Antes de comecar:** Lab 9 concluido; PE Approved; espacos de endereco sem sobreposicao.

### Passos

1. Obtenha RG gerenciado e VNet AKS:

   ```bash
   cd infra/terraform
   terraform output -raw aks_node_resource_group
   az network vnet list \
     --resource-group "[definir: aks_node_resource_group]" \
     --query '[].{name:name,prefixes:addressSpace.addressPrefixes}' \
     -o table
   ```

2. Em `terraform.tfvars`, preencha somente valores reais coletados:

   ```hcl
   aks_node_resource_group = "[definir]"
   aks_vnet_name = "[definir]"
   enable_aks_private_connectivity = true
   ```

3. Gere/revise:

   ```bash
   terraform plan -out=tfplan-fase2
   terraform show -no-color tfplan-fase2
   ```

4. O plano deve criar exatamente:
   - `peer-imersao-to-aks-*`;
   - `peer-aks-to-imersao-*`;
   - link da zona `privatelink.database.windows.net` para VNet AKS;
   - regra `Allow-AKS-To-SQL-1433`.
5. Com aprovacao, aplique:

   ```bash
   terraform apply tfplan-fase2
   ```

6. No Portal, confirme peerings conectados, link DNS sem registro automatico e regra TCP 1433 restrita aos prefixos AKS.

**Validacao opcional em cluster existente:** somente apos autorizacao e sem deixar recursos:

```bash
kubectl -n azure-shop run netcheck --image=busybox:1.36 --restart=Never -- sleep 300
kubectl -n azure-shop wait --for=condition=Ready pod/netcheck --timeout=90s
kubectl -n azure-shop exec netcheck -- nslookup "[servidor].database.windows.net"
kubectl -n azure-shop exec netcheck -- nc -zvw5 "[servidor].database.windows.net" 1433
kubectl -n azure-shop delete pod netcheck --ignore-not-found
```

**Falhas e contingencia:** VNet/MC RG ausente, prefixo sobreposto, DNS/TCP falha -> nao desabilite SQL publico. Use diagrama e ambiente compartilhado.

**Custo e cleanup:** peerings/PE e cluster podem gerar custo. O `netcheck` deve ser removido.

## Lab 11 - Azure AI Foundry com configuracao segura

**Objetivo:** distinguir provisionamento de Foundry da integracao de codigo e validar limites.

**Antes de comecar:** provider `Microsoft.CognitiveServices`, RBAC, modelo, versao, quota e capacidade confirmados no Portal/Foundry.

### Descoberta pelo Portal

1. Abra [Microsoft Foundry](https://ai.azure.com) e localize recurso/projeto aprovado.
2. Em **Models**, confirme modelo, versao, tipo de deployment e capacidade para a subscription/regiao.
3. Se nao houver capacidade, nao crie recurso paralelo para contornar limite. Use playground/ambiente do instrutor.
4. Revise custo, TPM/RPM, metricas, 429 e budget.

### O que o codigo ja faz e o que ainda falta

- Existe endpoint `POST /api/ai/recommendations`.
- Ele fica desabilitado enquanto `AI_ENABLED` nao for `true`.
- `src/ai/client.js` exige `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` e **API key** (`AZURE_OPENAI_API_KEY`).
- O codigo atual **nao implementa autenticacao por identidade gerenciada** para OpenAI.
- `infra/k8s/secretproviderclass.yaml` e apenas um modelo com placeholders; ele nao configura identidade, Key Vault nem segredo automaticamente.

Portanto, provisionar Foundry nao significa que a aplicacao ja esta integrada de forma segura. A integracao so deve ocorrer quando o instrutor aprovar um mecanismo de segredo (por exemplo, Key Vault) e as alteracoes de codigo necessarias.

**Validacao:** confirme provider, deployment `Succeeded`, identidade/RBAC e chamada sem dados sensiveis somente em ambiente aprovado.

**Falhas e contingencia:** quota/modelo/regiao indisponivel -> playground ou demonstracao; nao prometer integracao de codigo que nao foi implementada.

**Custo e cleanup:** custo varia por modelo/capacidade/uso. Configure limites e alertas antes de carga real.

## Lab 12 - Build e publicacao no AKS

**Objetivo:** construir imagem no ACR, preparar manifestos e fazer rollout seguro.

**Antes de comecar:** Labs 9-10 concluidos em cluster aprovado; credenciais AKS; ACR login server; mecanismo seguro de segredo SQL definido. Sem segredo seguro, nao prometa health SQL.

### Passos

1. Confira manifestos:

   ```bash
   ls infra/k8s
   cat infra/k8s/configmap.yaml
   ```

   `configmap.yaml` define `DB_PROVIDER=sqlserver`. `deployment.yaml` contem placeholders `ACR_NAME` e `IMAGE_TAG`; nunca aplique sem substitui-los.

2. Crie namespace e ConfigMap:

   ```bash
   kubectl apply -f infra/k8s/namespace.yaml
   kubectl apply -f infra/k8s/configmap.yaml
   ```

3. Build remoto no ACR com tag imutavel:

   ```bash
   ACR_NAME="[definir]"
   IMAGE_TAG="[definir: tag-imutavel]"
   az acr build \
     --registry "$ACR_NAME" \
     --image "azure-shop:$IMAGE_TAG" \
     --file Dockerfile \
     .
   ```

4. **Segredo SQL:** `infra/k8s/secret.example.yaml` e somente esquema. Nunca copie valores reais para esse arquivo nem crie `secret.yaml` no repositorio. Use mecanismo aprovado pelo instrutor, como integracao Key Vault/CSI devidamente configurada, ou uma criacao interativa segura fora do checkout. Sem isso, o Deployment configurado para SQL nao deve ser considerado pronto.
5. Gere manifest temporario fora do Git:

   ```bash
   mkdir -p /tmp/azure-shop-manifests
   sed \
     -e "s|ACR_NAME|$ACR_NAME|g" \
     -e "s|IMAGE_TAG|$IMAGE_TAG|g" \
     infra/k8s/deployment.yaml \
     > /tmp/azure-shop-manifests/deployment.yaml
   ```

6. Revise o arquivo temporario e aplique somente quando placeholders e segredo seguro estiverem resolvidos:

   ```bash
   kubectl apply -f /tmp/azure-shop-manifests/deployment.yaml
   kubectl apply -f infra/k8s/service.yaml
   kubectl -n azure-shop rollout status deployment/azure-shop --timeout=5m
   kubectl -n azure-shop get pods,service
   kubectl -n azure-shop logs deployment/azure-shop --tail=100
   ```

7. Aguarde `EXTERNAL-IP` no Service `azure-shop`, abra `http://[definir: external-ip]`, valide `/api/health`, catalogo, carrinho e checkout.

**Resultado esperado:** duas replicas prontas, probes em `/api/health`, Service LoadBalancer e imagem do ACR.

**Falhas e contingencia:** placeholder restante, `ImagePullBackOff`, segredo SQL ausente, health 503 ou External IP pendente -> pare, leia eventos/logs e use ambiente compartilhado. Copilot pode explicar logs, mas nao deve executar comandos ou corrigir sem revisao.

**Custo e cleanup:** ACR Build, imagens, AKS e LoadBalancer podem cobrar. Remova manifestos temporarios em `/tmp` e siga cleanup aprovado para recursos Azure.

## Matriz de aceite por Lab

| Lab | Pre-requisito | Acao esperada | Evidencia de sucesso | Falha comum | Contingencia | Custo/quota |
|---|---|---|---|---|---|---|
| 1 | Subscription/RBAC/budget | Portal: RG e tags | RG East US e Activity Log | RBAC/policy | Ambiente instrutor | Recursos posteriores geram custo |
| 2 | CIDR aprovado | Portal: VNet/subnets/NSG | Prefixos/delegacao/regra restrita | CIDR aberto | Diagrama/demonstracao | Rede basica; risco de seguranca |
| 3 | SKU e Copilot | Portal VM + analise VS Code | SSH restrito e checklist | `SkuNotAvailable` | Outra SKU aprovada | VM/PIP/disco |
| 4 | Quota App Service | Portal + ZIP Cloud Shell | Health/catalogo | Quota/runtime/ZIP | Ambiente compartilhado | Plano App Service |
| 5 | Canal seguro SQL | Portal + schema | Health `sqlserver` | Credencial/schema | SQLite demonstrativo | SQL/armazenamento |
| 6 | SQL e VNet | Portal PE/DNS | PE Approved/link DNS | Subnet/DNS errada | Demonstracao | Private Endpoint |
| 7 | Subnet delegada | Portal VNet Integration | DNS/TCP/health | SKU/DNS/NSG | Ambiente compartilhado | Plano/PE |
| 8 | Dia 1 identificado | Cloud Shell plan | Sem recriar Dia 1 | data source falha | Corrigir nomes | Plan nao cria custo |
| 9 | Quota AKS/ACR | Terraform fase 1 | ACR/AKS/AcrPull | quota/RBAC | Plano/manifests | AKS/ACR |
| 10 | AKS pronto | Terraform fase 2 | Peering/DNS/NSG | prefixo/DNS | Diagrama/cluster compartilhado | Rede/cluster |
| 11 | Provider/modelo/quota | Portal Foundry | Deployment/limites | 429/quota | Playground | IA por uso/capacidade |
| 12 | ACR/AKS/segredo seguro | ACR Build + rollout | Health/UI | segredo/imagem/IP | Ambiente compartilhado | Build/AKS/LB |

## Troubleshooting e cleanup

| Sintoma | Causa provavel | Correcao segura |
|---|---|---|
| `SkuNotAvailable` | Capacidade regional dinamica | Consulte Portal/`az vm list-skus`, escolha alternativa aprovada ou use demonstracao. |
| Quota B1 insuficiente | Limite de App Service da subscription | Valide quota antes do Lab 4; use SKU/regiao/subscription aprovada ou ambiente compartilhado. |
| `terraform plan` cria Dia 1 | Nome/RG/data source divergente | Nao aplique; corrija `terraform.tfvars` nao secreto. |
| SQL health 503 | Credencial, schema, DNS ou TCP | Nao exponha senha; valide schema, PE, DNS, VNet Integration e 1433 em ordem. |
| Pod `ImagePullBackOff` | Imagem/tag/ACR Pull | Confirme ACR, tag e role `AcrPull`; leia eventos. |
| AI 501/503 | AI desabilitada ou configuracao incompleta | E esperado sem endpoint/deployment/API key aprovada; nao invente integracao. |

Ao terminar um laboratorio com recursos reais:

1. Registre custo, recursos e evidencias nao sensiveis.
2. Remova apenas recursos criados para o laboratorio e aprovados pelo instrutor.
3. Nao remova RG, VNet, SQL, ACR ou AKS compartilhados sem confirmar dependencia de outros alunos.
4. Remova arquivos temporarios, ZIPs, planos e state locais; nao os versione.

## Referencias oficiais

- [Portal do Azure](https://portal.azure.com/)
- [Azure Cloud Shell](https://learn.microsoft.com/azure/cloud-shell/overview)
- [App Service no Linux](https://learn.microsoft.com/azure/app-service/quickstart-nodejs)
- [VNet Integration do App Service](https://learn.microsoft.com/azure/app-service/overview-vnet-integration)
- [Azure SQL com Private Endpoint](https://learn.microsoft.com/azure/azure-sql/database/private-endpoint-overview)
- [DNS para Private Endpoint](https://learn.microsoft.com/azure/private-link/private-endpoint-dns)
- [Azure Kubernetes Service](https://learn.microsoft.com/azure/aks/)
- [Terraform AzureRM](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
