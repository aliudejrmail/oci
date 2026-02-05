import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const profissionaisData = [
  { nome: "AGEU DE LIMA VALVERDE", cns: "702108765800990", cbo: "225225 - MEDICO CIRURGIAO GERAL" },
  { nome: "ANTONIO ACACIO CLAELSON NUNES PEREIRA", cns: "708360296177760", cbo: "262270 - MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { nome: "AUTHYOLLA LOPES MONTENEGRO ANDREATTA LEMOS", cns: "706208543866660", cbo: "225120 - MEDICO CARDIOLOGISTA" },
  { nome: "BARBARA LAYZA COSTA BARBOZA", cns: "708107521722235", cbo: "225250 - MEDICO ENDOCRINOLOGISTA E OBSTETRA" },
  { nome: "CAMILA CASTRO MAGALHAES", cns: "700200913526630", cbo: "225155 - MEDICO ENDOCRINOLOGISTA E METABOLOGISTA" },
  { nome: "CARLOS HUMBERTO ROCHA ALVES DE ARAUJO", cns: "700501702937259", cbo: "225135 - MEDICO DERMATOLOGISTA" },
  { nome: "CELSO GONCALVES DO VALE", cns: "705800442996030", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "CLAUDIA ISABEL BRAGA REIS", cns: "700506996639751", cbo: "225124 - MEDICO PEDIATRA" },
  { nome: "DANIELA ARAKAN RESENDE", cns: "700706931492576", cbo: "225155 - MEDICO ENDOCRINOLOGISTA E METABOLOGISTA" },
  { nome: "DANYELLE PIMENTEL DO ROSARIO", cns: "708609520866586", cbo: "225125 - MEDICO CLINICO" },
  { nome: "DENNIS FALANTE PEREIRA", cns: "708601560864987", cbo: "225225 - MEDICO CIRURGIAO GERAL" },
  { nome: "FERNANDO SALES GUSBERTI", cns: "700705965200670", cbo: "225275 - MEDICO OTORRINOLARINGOLOGISTA" },
  { nome: "FRANCISCO ARLES FERNANDEZ SUAREZ", cns: "704047713118560", cbo: "225270 - MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { nome: "FRANCISCO CORDEIRO LEITE SEGUNDO", cns: "708905743473813", cbo: "225285 - MEDICO UROLOGISTA" },
  { nome: "FRANCISCO CORDEIRO LEITE TERCEIRO", cns: "708905744475813", cbo: "225225 - MEDICO CIRURGIAO GERAL" },
  { nome: "FRANCISCO MENDES FILHO", cns: "703607022714731", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "FREDERICO CARRIZO DEFAVERI", cns: "706005313827441", cbo: "225270 - MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { nome: "GRAZIELA ALVES CORREA ROSA", cns: "702801684341661", cbo: "225155 - MEDICO ENDOCRINOLOGISTA E METABOLOGISTA" },
  { nome: "GREICE CAMURCA GRABNER", cns: "709207217171837", cbo: "225135 - MEDICO DERMATOLOGISTA" },
  { nome: "ISABEL CRISTINA CAMPOS MAMEDE NEVES", cns: "708901770850717", cbo: "225120 - MEDICO CARDIOLOGISTA" },
  { nome: "ISABELLA CARVALHO DE APRÍGIO", cns: "700009318189503", cbo: "225135 - MEDICO DERMATOLOGISTA" },
  { nome: "ISIS MARTINS DIAS PINTO", cns: "700205442083227", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "IVANYANE BESSA VON SCHWANER", cns: "708600937565881", cbo: "225138 - MEDICO REUMATOLOGISTA" },
  { nome: "JEAN PETERSON NASCIMENTO PINTO", cns: "704008989791868", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "JHANSLEY GIL VIEIRA DE SOUSA", cns: "709103294487530", cbo: "225125 - MEDICO CLINICO" },
  { nome: "JHANSLEY GIL VIEIRA DE SOUSA", cns: "709103294487530", cbo: "225165 - MEDICO GASTROENTEROLOGISTA" },
  { nome: "JHON PAULO NASCIMENTO TEIXEIRA", cns: "707409004200076", cbo: "225125 - MEDICO CLINICO" },
  { nome: "JOAO CARLOS LOBATO MORAES", cns: "700501988639350", cbo: "225112 - MEDICO NEUROLOGISTA" },
  { nome: "JOAO PAULO MAIA RODRIGUES", cns: "702103740996793", cbo: "225120 - MEDICO CARDIOLOGISTA" },
  { nome: "JULIANA MARIA NASCIMENTO SILVA", cns: "704707745189935", cbo: "225138 - MEDICO REUMATOLOGISTA" },
  { nome: "JULIANO DE ALMEIDA FLAUZINO", cns: "702308119135615", cbo: "225112 - MEDICO NEUROLOGISTA" },
  { nome: "JULIO CESAR RABELO JUNIOR", cns: "703404226329517", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "KELY YOSHIKO MARTINS SHIGUEKAWA", cns: "700602957745568", cbo: "225103 - MEDICO INFECTOLOGISTA" },
  { nome: "KILDARE SOARES SILVA", cns: "708604554440980", cbo: "225320 - MEDICO EM RADIOLOGIA E DIAGNOSTICO POR IMAGEM" },
  { nome: "KLEYTON ROBERTO LIRA SILVA", cns: "700003962953501", cbo: "225125 - MEDICO CLINICO" },
  { nome: "LARISSA BETHANIA DE SOUSA", cns: "703203675567491", cbo: "225120 - MEDICO CARDIOLOGISTA" },
  { nome: "LUDIMYLA MARIA RAMOS COSTA", cns: "705003442299053", cbo: "225270 - MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { nome: "LUIZ FLAVIO MONTE MARQUES", cns: "708502345573479", cbo: "225270 - MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { nome: "MAITE DOS SANTOS FEITOSA", cns: "704203795023791", cbo: "225320 - MEDICO EM RADIOLOGIA E DIAGNOSTICO POR IMAGEM" },
  { nome: "MAIKXON DENYS FEITOSA DE SOUSA", cns: "708105898958710", cbo: "225125 - MEDICO CLINICO" },
  { nome: "MARCUS VINICIUS ROCHA CHAMON", cns: "702601743545245", cbo: "225125 - MEDICO CLINICO" },
  { nome: "MATHEUS PEREIRA LEMES", cns: "705007796296053", cbo: "225285 - MEDICO UROLOGISTA" },
  { nome: "MIQUEIAS FEITOSA LEITE", cns: "706501378094491", cbo: "225270 - MEDICO ORTOPEDISTA E TRAUMATOLOGISTA" },
  { nome: "NAYARA BENEVIDES SOUSA DINIZ", cns: "700608913981782", cbo: "225165 - MEDICO GASTROENTEROLOGISTA" },
  { nome: "PATRICK FARIAS LOPES", cns: "705007640665057", cbo: "225230 - MEDICO CIRURGIAO PEDIATRICO" },
  { nome: "PAULO HENRIQUE DIAS DE MORAES", cns: "709209241540938", cbo: "225115 - MEDICO ANGIOLOGISTA" },
  { nome: "PEDRO GALDINO CORREA DE ALBUQUERQUE CAVALHO", cns: "707809659606116", cbo: "225112 - MEDICO NEUROLOGISTA" },
  { nome: "PETRINE HARMIONE DE CARVALHO FONSECA SALMEN", cns: "707809673336118", cbo: "225125 - MEDICO CLINICO" },
  { nome: "RICARDO MAIA DE SENA HORTA", cns: "700208951984829", cbo: "225275 - MEDICO OTORRINOLARINGOLOGISTA" },
  { nome: "RICARDO WAGNER MARTINS PEREIRA", cns: "700005651008082", cbo: "225255 - MEDICO MASTOLOGISTA" },
  { nome: "RICARDO WAGNER MARTINS PEREIRA", cns: "700005651008082", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "RUAN GABRIEL PINHO BOTELHO DOS SANTOS", cns: "708107150793540", cbo: "225203 - MEDICO EM CIRURGIA VASCULAR" },
  { nome: "SHIRLEY SUELY DOS SANTOS PEDRO", cns: "704048412791940", cbo: "225250 - MEDICO GINECOLOGISTA E OBSTETRA" },
  { nome: "SILVANA CORDOVIL SEREIO", cns: "708400713866663", cbo: "225125 - MEDICO CLINICO" },
  { nome: "TALIANE BRAGA BUBATO TRONCO", cns: "705006867078756", cbo: "225155 - MEDICO ENDOCRINOLOGISTA E METABOLOGISTA" },
  { nome: "THAMIRIS COUTINHO BRAGA", cns: "700003535194340", cbo: "225125 - MEDICO CLINICO" },
  { nome: "THAYS MORAES PASSARINHO LEITE", cns: "702104747363998", cbo: "225127 - MEDICO PNEUMOLOGISTA" },
  { nome: "THIAGO DE ALMEIDA FLAUZINO", cns: "708903976476312", cbo: "225280 - MEDICO COLOPROCTOLOGISTA" },
  { nome: "TIAGO SOARES FONSECA", cns: "700001565172900", cbo: "225103 - MEDICO INFECTOLOGISTA" },
  { nome: "VERONICA DE JESUS RODRIGUES CARDOZO COSTA", cns: "704805020096948", cbo: "225109 - MEDICO NEFROLOGISTA" },
  { nome: "VINICIUS DE MELO RODRIGUES", cns: "705041675195755", cbo: "225125 - MEDICO CLINICO" },
  { nome: "WILLIAN GOMES DE MEDEIROS", cns: "704709711594332", cbo: "225155 - MEDICO ENDOCRINOLOGISTA E METABOLOGISTA" }
];

async function importarProfissionais() {
  console.log('🔄 Iniciando importação de profissionais...\n');

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  // Buscar todas as unidades para vincular (vamos vincular todos a alguma unidade padrão se necessário)
  const unidades = await prisma.unidadeSaude.findMany({
    where: { ativo: true }
  });

  console.log(`📋 Total de unidades ativas: ${unidades.length}\n`);

  for (const profData of profissionaisData) {
    try {
      // Limpar CNS
      const cnsLimpo = profData.cns.replace(/\D/g, '');
      
      if (cnsLimpo.length !== 15) {
        console.log(`⚠️  CNS inválido para ${profData.nome}: ${profData.cns}`);
        erros++;
        continue;
      }

      // Extrair CBO (pegar apenas os dígitos)
      const cboMatch = profData.cbo.match(/^(\d{6}|\d{4}-\d{2})/);
      const cbo = cboMatch ? cboMatch[1].replace('-', '') : profData.cbo.substring(0, 6);

      // Verificar se já existe
      const existente = await prisma.profissional.findUnique({
        where: { cns: cnsLimpo }
      });

      if (existente) {
        console.log(`✅ Profissional já existe: ${profData.nome}`);
        atualizados++;
      } else {
        // Criar profissional
        await prisma.profissional.create({
          data: {
            nome: profData.nome.trim(),
            cns: cnsLimpo,
            cbo: cbo
          }
        });

        console.log(`✅ Profissional criado: ${profData.nome} (CNS: ${cnsLimpo})`);
        criados++;
      }
    } catch (error: any) {
      console.log(`❌ Erro ao processar ${profData.nome}: ${error.message}`);
      erros++;
    }
  }

  console.log('\n📊 Resumo da importação:');
  console.log(`   ✅ Criados: ${criados}`);
  console.log(`   🔄 Já existiam: ${atualizados}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📋 Total processado: ${profissionaisData.length}`);
}

importarProfissionais()
  .then(() => {
    console.log('\n✅ Importação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro na importação:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
