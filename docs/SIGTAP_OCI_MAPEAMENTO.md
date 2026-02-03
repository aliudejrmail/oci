# Mapeamento SIGTAP × Ofertas de Cuidados Integrados (OCI)

Este documento descreve como o **SIGTAP** (Sistema de Gerenciamento da Tabela de Procedimentos, Medicamentos e OPM do SUS) se relaciona com as **Ofertas de Cuidados Integrados (OCI)** e como obter procedimentos e compatibilidades (CID, CBO, etc.) para uso no sistema.

---

## 1. O que é o SIGTAP

- **URL**: [http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp](http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp)
- **Download (por competência)**: [http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp](http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp)  
  *(Quando disponível, permite baixar tabelas por mês/ano.)*
- **Wiki**: [https://wiki.saude.gov.br/sigtap](https://wiki.saude.gov.br/sigtap)
- **Referência normativa**: Portaria nº 321/2007 – ambiente virtual para acessar a Tabela de Procedimentos, Medicamentos e Materiais Especiais do SUS.

O SIGTAP centraliza **procedimentos**, **medicamentos** e **OPM** do SUS, com códigos, valores, complexidade e **compatibilidades** (CID, CBO, habilitação, etc.).

---

## 2. Estrutura da Tabela de Procedimentos no SIGTAP

A tabela está organizada em três níveis hierárquicos:

| Nível | Descrição | Exemplos |
|-------|-----------|----------|
| **Grupo** | Grande área (clínicos, cirúrgicos, diagnósticos, medicamentos, OPM) | Procedimentos clínicos, cirúrgicos, diagnósticos |
| **Subgrupo** | Especialidade/tipo | Cirurgia do aparelho digestivo, tratamentos odontológicos |
| **Forma de organização** | Área mais específica | Neurocirurgia vascular, tipos de exames |

Cada procedimento possui:
- Código próprio (com dígito verificador)
- Descrição, valor, complexidade
- Vinculações a **CID**, **CBO** e **habilitação**, conforme tabelas de relacionamento (rl_*).

---

## 3. Compatibilidades: procedimento × CID, CBO e outros

No SIGTAP, as **compatibilidades** são expressas por tabelas de relacionamento. Os nomes usuais (em documentações e em versões de base de dados da Tabela Unificada) incluem:

| Relação | Descrição | Uso no sistema OCI |
|---------|-----------|---------------------|
| **Procedimento × CID** | Quais diagnósticos (CID) autorizam ou estão associados ao procedimento | Validar solicitação OCI conforme diagnóstico do paciente |
| **Procedimento × CBO** | Quais ocupações (CBO) estão habilitadas a realizar o procedimento | Validar profissional/unidade conforme CBO |
| **Procedimento × Habilitação** | Exigências de habilitação do estabelecimento | Conferir se a unidade está habilitada para aquele procedimento |

Nas bases disponibilizadas pelo DATASUS (FTP ou exportações por competência), é comum encontrar tabelas como:

- `tb_procedimento` – procedimentos (código, nome, grupo, subgrupo, forma, etc.)
- `rl_procedimento_cid` – procedimento × CID
- `rl_procedimento_cbo` – procedimento × CBO  
- `rl_procedimento_habilitacao` – procedimento × habilitação

*(Os nomes exatos podem variar conforme competência e versão; o importante é manter o mapeamento conceitual: procedimento ↔ CID, procedimento ↔ CBO, procedimento ↔ habilitação.)*

---

## 4. Ofertas de Cuidados Integrados (OCI) e procedimentos SIGTAP

As **Ofertas de Cuidados Integrados (OCI)** são linhas de cuidado que utilizam **procedimentos da Tabela SUS** (gerenciada pelo SIGTAP). Ou seja:

- **Não existe** um “grupo SIGTAP” chamado “OCI”.
- As OCI são definidas em **portarias e normas** (ex.: SAES, GM) e especificam **quais procedimentos** da tabela SUS compõem cada oferta (cardiologia, oncologia, etc.).
- Cada procedimento de uma OCI deve ser referenciado pelo **código de procedimento do SUS** (código SIGTAP).

Para identificar **todos os procedimentos de uma OCI** e suas **compatibilidades**:

1. **Consultar a portaria ou anexo** que define aquela OCI → lista de códigos de procedimento.
2. **No SIGTAP** (ou nas tabelas baixadas):
   - Localizar cada código em `tb_procedimento` (ou equivalente).
   - Usar as tabelas de relacionamento para obter:
     - **CID** compatíveis → `rl_procedimento_cid` (ou equivalente)
     - **CBO** compatíveis → `rl_procedimento_cbo` (ou equivalente)
     - **Habilitação** → `rl_procedimento_habilitacao` (ou equivalente)

Assim, “procedimentos de OCI” = subconjunto dos procedimentos SIGTAP indicados nas portarias/anexos de cada OCI; as **compatibilidades** são as mesmas do SIGTAP (CID, CBO, habilitação).

---

## 5. Fontes oficiais para importação

| Fonte | Uso |
|-------|-----|
| **SIGTAP – Tela de consulta** | [sigtap.datasus.gov.br](http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp) – consulta manual por grupo/subgrupo/forma e por procedimento. |
| **SIGTAP – Download** | [download.jsp](http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp) – arquivos por **competência** (mês/ano), quando o serviço estiver disponível. |
| **FTP DATASUS** | Ex.: `ftp://ftp2.datasus.gov.br/pub/sistemas/tup/downloads/` – publicações de notas técnicas e, em algumas estruturas, arquivos de competência. Verificar no próprio FTP a pasta e o layout vigente. |
| **Notas técnicas CGSI** | Publicadas no portal do SIGTAP (ex.: Nota Técnica nº 01/2026, 12/2025, etc.) – alterações em procedimentos; útil para acompanhar inclusões/alterações que impactam OCI. |

Recomenda-se definir uma **competência de referência** (ex.: última disponível) e usar a mesma base para procedimentos e para as relações com CID e CBO.

---

## 6. Uso no sistema OCI (este projeto)

### 6.1 Identificação de procedimentos OCI

- Cada **ProcedimentoOci** do sistema pode ser vinculado ao **código do procedimento no SUS** (código SIGTAP).
- Campos sugeridos no modelo:
  - `codigo_sigtap` (ou `codigoSigtap`): código do procedimento na Tabela Unificada.
  - Manter `codigo` e `nome` internos para exibição e fluxos próprios da OCI.

### 6.2 Compatibilidades (CID, CBO)

Duas abordagens possíveis:

**A) Tabelas de compatibilidade no banco**

- `CompatibilidadeCid`: procedimento_oci_id, cid_codigo, cid_descricao (ou só código).
- `CompatibilidadeCbo`: procedimento_oci_id, cbo_codigo, cbo_descricao (ou só código).
- Populadas por importação a partir dos arquivos/tabelas do SIGTAP (rl_procedimento_cid, rl_procedimento_cbo).

**B) Uso apenas do código SIGTAP**

- Armazenar só `codigo_sigtap` em `ProcedimentoOci`.
- Consultar compatibilidades em tempo real em uma base local espelho do SIGTAP (importada periodicamente) ou em serviço que consulte o SIGTAP.

Para auditoria e validação na solicitação (ex.: “este CID permite este procedimento?”), a abordagem **A** costuma ser mais simples de operar sem depender de outro sistema em tempo real.

---

## 7. Resumo

| O quê | Onde / como |
|------|-------------|
| **Procedimentos** | Tabela de procedimentos do SIGTAP (tb_procedimento ou equivalente), por grupo/subgrupo/forma. |
| **Procedimentos de OCI** | Subconjunto definido em portarias/anexos; cada um com **código SIGTAP**. |
| **Compatibilidade procedimento × CID** | Tabela de relação procedimento–CID (ex.: rl_procedimento_cid) no SIGTAP/export. |
| **Compatibilidade procedimento × CBO** | Tabela de relação procedimento–CBO (ex.: rl_procedimento_cbo) no SIGTAP/export. |
| **Acesso oficial** | Consulta: [sigtap.datasus.gov.br](http://sigtap.datasus.gov.br/tabela-unificada/app/sec/inicio.jsp). Dados em lote: Download por competência e FTP DATASUS. |

Com isso, é possível **identificar** todos os procedimentos de OCI (via portarias + códigos SIGTAP) e suas **compatibilidades** de procedimentos, CID, CBO (e habilitação) a partir da estrutura e das tabelas do SIGTAP descritas acima.

---

## 8. Alterações feitas neste projeto

- **Documentação**: Este arquivo (`docs/SIGTAP_OCI_MAPEAMENTO.md`).
- **Schema Prisma**:
  - Em `ProcedimentoOci`: campo opcional `codigoSigtap` (código do procedimento na Tabela SIGTAP).
  - Novas tabelas: `CompatibilidadeCid` (procedimento OCI × CID) e `CompatibilidadeCbo` (procedimento OCI × CBO).
- **Migração**: `prisma/migrations/20260126120000_add_sigtap_compatibilidade/migration.sql`.

Para aplicar as alterações no banco (após o schema e a migração estarem no repositório):

```powershell
cd c:\projetos_web\oci
npx prisma migrate deploy
npx prisma generate
```

Em desenvolvimento, use `npx prisma migrate dev` para aplicar a migração e regenerar o cliente.

---

## 9. Tabela compacta baixada (pasta `tabelas/`)

Foi realizado download da tabela compacta do SIGTAP e extraída em:

- **Arquivo**: `tabelas/TabelaUnificada_202601_v2601221740.zip`
- **Pasta extraída**: `tabelas/TabelaUnificada_202601_v2601221740/`
- **Competência**: 202601 (jan/2026)

### 9.1 Arquivos relevantes para OCI

| Arquivo | Descrição | Layout (posições) |
|---------|-----------|--------------------|
| `tb_procedimento.txt` | Procedimentos (código, nome, etc.) | CO_PROCEDIMENTO 1-10, NO_PROCEDIMENTO 11-260 |
| `rl_procedimento_cid.txt` | Procedimento × CID | CO_PROCEDIMENTO 1-10, CO_CID 11-14, ST_PRINCIPAL 15 |
| `rl_procedimento_ocupacao.txt` | Procedimento × CBO (ocupação) | CO_PROCEDIMENTO 1-10, CO_OCUPACAO 11-16 |
| `tb_cid.txt` | Códigos e nomes CID | CO_CID 1-4, NO_CID 5-104 |
| `tb_ocupacao.txt` | Códigos e nomes CBO (ocupação) | CO_OCUPACAO 1-6, NO_OCUPACAO 7-156 |

Os arquivos são em texto de largura fixa, codificação ISO-8859-1 (conforme LEIA_ME.TXT). O código do procedimento nos arquivos tem **10 caracteres**, sem pontos nem traço (ex.: `0101010010`).

### 9.2 Importar compatibilidade CID/CBO para procedimentos OCI

Use o script de importação para preencher `CompatibilidadeCid` e `CompatibilidadeCbo` a partir dos arquivos da pasta extraída, **para procedimentos OCI que já tenham `codigoSigtap` preenchido**:

```powershell
cd c:\projetos_web\oci
npx ts-node scripts/importar-compatibilidade-sigtap.ts
```

Ou indicando outra pasta:

```powershell
npx ts-node scripts/importar-compatibilidade-sigtap.ts "tabelas\TabelaUnificada_202601_v2601221740"
```

Antes de rodar, preencha o campo `codigoSigtap` nos `ProcedimentoOci` que deseja vincular à tabela SIGTAP (ex.: `0101010010` no formato dos arquivos).

### 9.3 Importar catálogo de procedimentos SIGTAP (tb_procedimento → banco)

O script **importar-procedimentos-sigtap** importa o catálogo completo da `tb_procedimento` para a tabela **ProcedimentoSigtap** no banco. Essa tabela serve como referência dos procedimentos da Tabela Unificada SUS.

**Ordem recomendada:**

1. Aplicar a migração que cria `procedimentos_sigtap`:
   ```powershell
   cd c:\projetos_web\oci
   npx prisma migrate deploy
   npx prisma generate
   ```

2. Rodar a importação:
   ```powershell
   npm run importar:procedimentos-sigtap
   ```

   Ou indicando outra pasta da tabela compacta:
   ```powershell
   npx ts-node scripts/importar-procedimentos-sigtap.ts "tabelas\TabelaUnificada_202601_v2601221740"
   ```

**Modelo:** A tabela `procedimentos_sigtap` tem: `codigo` (10 chars, único), `nome`, `tipoComplexidade`, `competencia`. O script faz upsert por `codigo`, então pode ser reexecutado para atualizar a partir de uma nova competência.

### 9.4 Quantos procedimentos são “de OCI” nas tabelas SIGTAP?

Na estrutura da Tabela Unificada, o **grupo 09** (`tb_grupo.txt`) é **“Procedimentos para Ofertas de Cuidados Integrados”**. As **formas de organização** (`tb_forma_organizacao.txt`) que compõem esse grupo incluem, entre outras:

| Código forma | Descrição |
|--------------|-----------|
| 090101 | Ofertas de Cuidados Integrados em Oncologia |
| 090201 | Ofertas de Cuidados Integrados em Cardiologia |
| 090301 | Ofertas de Cuidados Integrados em Ortopedia |
| 090401 | Ofertas de Cuidados Integrados em Otorrinolaringologia |
| 090501 | Ofertas de Cuidados Integrados em Oftalmologia |
| 090601 | Ofertas de Cuidados Integrados em Saúde da Mulher - Ginecologia |

Em **`tb_procedimento.txt`**, os procedimentos cujo **código começa com `09`** pertencem a esse grupo e são, portanto, **procedimentos de Ofertas de Cuidados Integrados**.

Na competência **202601** (jan/2026) da tabela compacta em `tabelas/TabelaUnificada_202601_v2601221740/`:

- **Total de procedimentos em tb_procedimento:** ~4.962 (todos os procedimentos da Tabela SUS).
- **Procedimentos de OCI (código iniciando em 09):** **34**.

### 9.5 Compatibilidades CID/CBO dos 34 procedimentos de OCI (Opção A)

Foram criadas tabelas de compatibilidade **ligadas a ProcedimentoSigtap** (não a ProcedimentoOci), para armazenar CID e CBO dos 34 procedimentos de Ofertas de Cuidados Integrados:

- **CompatibilidadeCidSigtap** (`compatibilidade_cid_sigtap`): procedimentoSigtapId, cidCodigo, cidDescricao
- **CompatibilidadeCboSigtap** (`compatibilidade_cbo_sigtap`): procedimentoSigtapId, cboCodigo, cboDescricao

**Migração:** `prisma/migrations/20260128100000_add_compatibilidade_sigtap/migration.sql`

**Ordem recomendada:** (1) `npx prisma migrate deploy` e `npx prisma generate`; (2) `npm run importar:procedimentos-sigtap` se necessário; (3) `npm run importar:compatibilidade-oci-sigtap`. O script lê `rl_procedimento_cid.txt` e `rl_procedimento_ocupacao.txt` apenas para códigos 09..., e preenche as novas tabelas. **Verificação:** `npm run verificar:oci-sigtap`.

Esses 34 são os únicos que, na própria SIGTAP, estão classificados como “Procedimentos para Ofertas de Cuidados Integrados”. Eles se distribuem por Oncologia, Cardiologia, Ortopedia, Otorrinolaringologia, Oftalmologia e Saúde da Mulher (Ginecologia), conforme as formas de organização acima.

### 9.6 Importar OCIs cadastradas (ofertas de cuidados) a partir da SIGTAP ou planilha

O script **importar-ocis-sigtap** cria ou atualiza as **OCIs** e seus **ProcedimentoOci** no banco, de duas formas:

**A) A partir da tabela compacta SIGTAP - Agrupado por forma (6 OCIs)**

Lê `tb_procedimento.txt` e `tb_forma_organizacao.txt`, filtra procedimentos cujo código começa com `09`, agrupa por forma (090101, 090201, etc.) e cria uma OCI por forma, com procedimentos vinculados pelo código SIGTAP (10 caracteres). O código da OCI no sistema será a forma (ex.: `090101`). Oncologia (090101) recebe `tipo: ONCOLOGICO` e prazo 30 dias; as demais `tipo: GERAL` e prazo 60 dias.

⚠️ **ATENÇÃO**: Este modo agrupa os 34 procedimentos SIGTAP em apenas 6 OCIs por forma de organização. Para importar as 34 OCIs individuais, use o modo B (JSON).

```powershell
cd c:\projetos_web\oci
npm run importar:ocis-sigtap
```

Ou indicando outra pasta da tabela compacta:

```powershell
npx ts-node scripts/importar-ocis-sigtap.ts "tabelas\TabelaUnificada_202601_v2601221740"
```

**B) A partir de arquivo JSON - 34 OCIs individuais (RECOMENDADO)**

Cada procedimento de 10 dígitos da tabela SIGTAP (ex: `0901010014`) representa uma **OCI completa** com seus procedimentos secundários. O arquivo `data/ocis-sigtap-completo.json` contém as **34 OCIs oficiais** da tabela SIGTAP com seus códigos e nomes corretos.

Para importar as 34 OCIs individuais:

```powershell
cd c:\projetos_web\oci
npx ts-node scripts/importar-ocis-sigtap.ts --json=data/ocis-sigtap-completo.json
```

**Formato do JSON:**

```json
[
  {
    "codigo": "0901010014",
    "nome": "OCI AVALIAÇÃO DIAGNÓSTICA INICIAL DE CÂNCER DE MAMA",
    "tipo": "ONCOLOGICO",
    "prazoMaximoDias": 60,
    "procedimentos": [
      { "codigoSigtap": "0301010072", "nome": "CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA", "obrigatorio": true },
      { "codigoSigtap": "0204030030", "nome": "MAMOGRAFIA", "obrigatorio": true }
    ]
  }
]
```

**Distribuição das 34 OCIs:**

- **Oncologia (090101)**: 9 OCIs - `0901010014`, `0901010049`, `0901010057`, `0901010073`, `0901010081`, `0901010090`, `0901010103`, `0901010111`, `0901010120`
- **Cardiologia (090201)**: 6 OCIs - `0902010018`, `0902010026`, `0902010034`, `0902010042`, `0902010050`, `0902010069`
- **Ortopedia (090301)**: 4 OCIs - `0903010011`, `0903010020`, `0903010038`, `0903010040`
- **Otorrinolaringologia (090401)**: 3 OCIs - `0904010015`, `0904010023`, `0904010031`
- **Oftalmologia (090501)**: 7 OCIs - `0905010019`, `0905010027`, `0905010035`, `0905010043`, `0905010051`, `0905010060`, `0905010078`
- **Saúde da Mulher - Ginecologia (090601)**: 5 OCIs - `0906010012`, `0906010020`, `0906010039`, `0906010047`, `0906010055`

**Ordem recomendada:** (1) Deletar OCIs antigas se necessário; (2) `npx ts-node scripts/importar-ocis-sigtap.ts --json=data/ocis-sigtap-completo.json`; (3) Adicionar procedimentos secundários conforme planilha detalhada.

### 9.7 Limpar procedimentos sem código SIGTAP

O script **limpar-procedimentos-sem-sigtap** remove do banco todos os procedimentos que **não possuem código SIGTAP** (`codigoSigtap` nulo) e, consequentemente, as OCIs que ficarem vazias (sem procedimentos). Isso é útil para limpar dados de exemplo ou procedimentos customizados que não devem ser utilizados em produção.

**Modo preview (sem deletar):**

```powershell
cd c:\projetos_web\oci
npm run limpar:procedimentos-sem-sigtap
```

O script exibe:
- Quantos procedimentos sem código SIGTAP foram encontrados
- Quais OCIs ficarão vazias e serão removidas
- Se há solicitações vinculadas (bloqueia a remoção)

**Execução definitiva (irreversível):**

```powershell
npx ts-node scripts/limpar-procedimentos-sem-sigtap.ts --confirmar
```

⚠️ **ATENÇÃO**: Esta operação é **irreversível**. Use apenas se tiver certeza de que deseja remover todos os procedimentos sem código SIGTAP do banco.

**Proteção**: O script **não remove** OCIs que possuam solicitações vinculadas (com ou sem procedimentos SIGTAP). Nesse caso, é necessário remover primeiro as solicitações ou desativar as OCIs ao invés de deletá-las.

### 9.8 Importar tabela SIGTAP a partir do ZIP (por competência)

Após o **download do arquivo compactado** do SIGTAP (por competência), é possível importar as tabelas sem descompactar manualmente:

**Opção 1 – Pela interface (recomendado para ADMIN)**

1. Acesse **Importar SIGTAP** no menu (visível apenas para perfil **Administrador**).
2. Baixe o ZIP da tabela unificada em [sigtap.datasus.gov.br – Download](http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp) (por competência).
3. Selecione o arquivo .zip e clique em **Importar**.
4. O sistema extrai o ZIP, importa **tb_procedimento** (→ `procedimentos_sigtap`) e as **compatibilidades CID/CBO** dos procedimentos de OCI (→ `compatibilidade_cid_sigtap`, `compatibilidade_cbo_sigtap`).
5. O resultado e o log são exibidos na tela.

**Opção 2 – Pelo terminal (script)**

Coloque o arquivo .zip na pasta `tabelas/` (ou informe o caminho) e execute:

```powershell
cd c:\projetos_web\oci
npm run importar:sigtap-zip
```

Ou indicando o caminho do ZIP:

```powershell
npx ts-node scripts/importar-sigtap-zip.ts "tabelas\TabelaUnificada_202601_v2601221740.zip"
```

O script extrai o ZIP para `tabelas/Extraido_<timestamp>`, localiza a pasta que contém `tb_procedimento.txt` (caso o ZIP tenha uma raiz) e executa em sequência: **importar-procedimentos-sigtap** e **importar-compatibilidade-oci-sigtap**.
