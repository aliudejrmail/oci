# OCIs com Procedimentos Anatomo-Patológicos (SIGTAP)

## Procedimentos anatomo-patológicos na tabela SIGTAP (tb_procedimento)

| Código | Nome |
|--------|------|
| 0203020022 | EXAME ANATOMO-PATOLOGICO DO COLO UTERINO - PECA CIRURGICA |
| 0203020030 | EXAME ANATOMO-PATOLÓGICO PARA CONGELAMENTO / PARAFINA POR PEÇA CIRURGICA OU POR BIOPSIA (EXCETO COLO UTERINO E MAMA) |
| 0203020065 | EXAME ANATOMOPATOLOGICO DE MAMA - BIOPSIA |
| 0203020073 | EXAME ANATOMOPATOLOGICO DE MAMA - PECA CIRURGICA |
| 0203020081 | EXAME ANATOMO-PATOLOGICO DO COLO UTERINO - BIOPSIA |

## Mapeamento rl_procedimento_compativel (OCIs × procedimentos anatomo-patológicos)

Conforme `rl_procedimento_compativel.txt`, as OCIs que possuem procedimentos anatomo-patológicos como compatíveis:

| OCI (código) | Procedimento anatomo-patológico | Tipo |
|--------------|--------------------------------|------|
| 0901010049 | 0203020030 (Congelamento/Parafina exceto colo e mama) | Próstata |
| 0901010057 | 0203020081 (Colo útero - biópsia) | Colo útero |
| 0901010073 | 0203020030 (Congelamento/Parafina exceto colo e mama) | Gástrico |
| 0901010081 | 0203020030 (Congelamento/Parafina exceto colo e mama) | Colorretal |
| 0901010103 | 0203020065 (Mama - biópsia) | Mama II |
| 0901010111 | 0203020022 (Colo útero - peça cirúrgica) | Colo útero I |
| 0901010120 | 0203020022 (Colo útero - peça cirúrgica) | Colo útero II |
| 0906010039 | 0203020081 (Colo útero - biópsia) | GIN2 Sangramento I |
| 0906010047 | 0203020081 (Colo útero - biópsia) | GIN2 Sangramento II |

## OCIs com procedimentos anatomo-patológicos no ocis-com-procedimentos.json

| OCI | Código Proc. | Nome | Obrigatório |
|-----|--------------|------|-------------|
| 0901010057 - Investigação Câncer Colo Útero | 0203020081 | EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - BIÓPSIA | Sim |
| 0901010103 - Mama II | 0203020065 | EXAME ANATOMOPATOLOGICO DE MAMA - BIOPSIA | Sim |
| 0901010111 - Colo Útero I | 0203020022 | EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - PECA CIRURGICA | Sim |
| 0901010120 - Colo Útero II | 0203020022 | EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - PECA CIRURGICA | Sim |
| 0901010049 - Próstata | 0203020030 | EXAME ANATOMO-PATOLÓGICO PARA CONGELAMENTO/PARAFINA (EXCETO COLO E MAMA) | Não |
| 0901010073 - Gástrico | 0203020030 | idem | Não |
| 0901010081 - Colorretal | 0203020030 | idem | Não |
| 0906010039 - GIN2 Sangramento I | 0203020081 | EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - BIÓPSIA | Sim |
| 0906010047 - GIN2 Sangramento II | 0203020081 | EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - BIÓPSIA | Sim |

**Total: 9 OCIs** possuem procedimentos anatomo-patológicos. **6 com obrigatório** (exigem data de coleta e data de resultado).

## Correções aplicadas

- **0906010039 e 0906010047**: O código 0203020081 corresponde a "EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO - BIÓPSIA",
  não ao procedimento de congelamento/parafina. O nome foi corrigido e marcado como obrigatório.
