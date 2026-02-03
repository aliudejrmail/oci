# Cenário de Faturamento APAC - Cuidado Integrado (OCI)

Este documento descreve o fluxo de faturamento em **APAC (Autorização de Procedimentos Ambulatoriais)** para Ofertas de Cuidados Integrados (OCI), alinhado às Portarias SAES e ao Programa Mais Acesso a Especialistas (PMAE).

---

## 1. Exemplo de fluxo (avaliação cardiológica)

**Situação:** Paciente com necessidade de avaliação cardiológica completa (consulta + exames) após triagem na atenção primária.

**Procedimento principal (OCI):** Código OCI de Cuidado Integrado (ex.: no SIGTAP, grupo 09, forma 090201 – OCI Avaliação Cardiológica; o exemplo hipotético 05.02.01.004-7 ilustra o mesmo conceito).

**Validade da APAC:** 2 competências (ex.: 01/2026 e 02/2026).

### Fluxo e datas

| Etapa | Data | Descrição |
|-------|------|-----------|
| **Autorização** | 02/01/2026 | A Secretaria de Saúde autoriza a APAC com início em 01/2026 e fim em 02/2026. |
| **Competência 1 (Janeiro/2026)** | 05/01/2026 | Consulta Especializada (procedimento secundário). |
| | 10/01/2026 | Eletrocardiograma (procedimento secundário). |
| | — | O procedimento principal (OCI) e os secundários realizados em janeiro são registrados na APAC. |
| **Competência 2 (Fevereiro/2026)** | 15/02/2026 | Ecocardiograma (procedimento secundário). |
| | 20/02/2026 | Consulta de retorno com resultado (procedimento secundário). |
| **Encerramento** | 20/02/2026 | A APAC é encerrada (saída por conclusão) e enviada para faturamento no SIA/SUS referente à competência de fevereiro. |

---

## 2. Conceitos

- **Competência:** Período mensal para fins de registro e faturamento no SIA/SUS (ex.: 202601 = janeiro/2026).
- **Validade da APAC:** Conforme Portaria SAES/MS nº 1.821/2024, as APACs das OCI têm **validade fixa de 2 competências** e não admitem APAC de continuidade.
- **Data de início da validade da APAC:** Corresponde à data de atendimento do **primeiro procedimento secundário** realizado da OCI (Portaria SAES/MS nº 1.640/2024, art. 15).
- **Data de encerramento da APAC:** Corresponde à data do **último procedimento** realizado no conjunto de procedimentos secundários da OCI (idem).
- **Procedimento principal:** O código da OCI na Tabela SUS (SIGTAP, grupo 09).
- **Procedimentos secundários:** Consultas e exames que compõem a OCI; não são valorados na APAC e devem ser registrados na mesma APAC.

---

## 3. Mapeamento no sistema (Solicitação OCI × APAC)

No sistema, uma **Solicitação OCI** representa a autorização/jornada do paciente em uma OCI e espelha a lógica da APAC:

| Conceito APAC / PMAE | No modelo do sistema |
|----------------------|------------------------|
| Autorização da APAC | Criação da **Solicitação OCI** (número de protocolo, paciente, OCI, unidade origem/destino). |
| Procedimento principal (OCI) | **OCI** escolhida na solicitação (nome/código da oferta; o código SIGTAP pode ser armazenado ou derivado). |
| Validade 2 competências | **competenciaInicioApac** e **competenciaFimApac** (YYYYMM) na Solicitação OCI. |
| Data início validade APAC | **dataInicioValidadeApac** = data do primeiro procedimento secundário realizado (primeira `ExecucaoProcedimento` com `dataExecucao` preenchida). |
| Data encerramento APAC | **dataEncerramentoApac** = data do último procedimento realizado; ao concluir todos, **dataConclusao** e status CONCLUIDA. |
| Procedimentos secundários | **ExecucaoProcedimento** (uma por procedimento da OCI): consultas e exames com **dataAgendamento**, **dataExecucao**, **status** (AGENDADO, EXECUTADO, CANCELADO). |
| Envio para faturamento SIA/SUS | Status **CONCLUIDA** + **dataEncerramentoApac** preenchida; a competência de faturamento é a competência dessa data (ex.: 202602). |

---

## 4. Regras de negócio consideradas

1. **Ao autorizar (criar solicitação):**  
   - Definir ou calcular **competenciaInicioApac** e **competenciaFimApac** (ex.: mês da data de solicitação e mês seguinte), em linha com “validade de 2 competências”.

2. **Ao registrar o primeiro procedimento realizado:**  
   - Atualizar **dataInicioValidadeApac** com a **dataExecucao** desse procedimento (art. 15 da Portaria 1.640/2024).

3. **Ao registrar o último procedimento realizado (OCI concluída):**  
   - Atualizar **dataEncerramentoApac** com a **dataExecucao** desse procedimento.  
   - Preencher **dataConclusao** e marcar status **CONCLUIDA**.  
   - A competência de envio para faturamento é a competência de **dataEncerramentoApac** (ex.: 02/2026).

4. **Prazo da OCI:**  
   - O **dataPrazo** da solicitação segue o tipo da OCI (30 dias para ONCOLOGICO, 60 para GERAL).  
   - A janela de 2 competências da APAC deve estar contida nesse prazo ou alinhada às normas do gestor.

---

## 5. Referências

- Portaria SAES/MS nº 1.640/2024 – operacionalização do PMAE (art. 15: datas de início e encerramento da APAC).
- Portaria SAES/MS nº 1.821/2024 – atributos na Tabela de Procedimentos (validade de 2 competências).
- Portaria SAES/MS nº 2.331/2024 – procedimentos obrigatórios por OCI.
- [Ministério da Saúde – Mais Acesso a Especialistas](https://www.gov.br/saude/pt-br/assuntos/noticias/2024/junho/mais-acesso-a-especialistas-amplia-e-da-agilidade-a-consultas-e-exames-no-sus).
