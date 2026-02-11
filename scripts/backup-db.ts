import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backup() {
    console.log('🚀 Iniciando backup do banco de dados Neon...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const fileName = `backup_oci_${timestamp[0]}_${timestamp[1].slice(0, 5)}.json`;
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const backupPath = path.join(backupDir, fileName);

    try {
        // Lista de modelos para backup (conforme definido no seu schema.prisma)
        const data: any = {};

        console.log('--- Coletando dados das tabelas ---');

        data.usuarios = await prisma.usuario.findMany();
        console.log(`✅ Usuarios: ${data.usuarios.length}`);

        data.unidades_saude = await prisma.unidadeSaude.findMany();
        console.log(`✅ Unidades de Saúde: ${data.unidades_saude.length}`);

        data.pacientes = await prisma.paciente.findMany();
        console.log(`✅ Pacientes: ${data.pacientes.length}`);

        data.cbos = await prisma.cbo.findMany();
        console.log(`✅ CBOs: ${data.cbos.length}`);

        data.profissionais = await prisma.profissional.findMany();
        console.log(`✅ Profissionais: ${data.profissionais.length}`);

        data.profissionais_unidades = await prisma.profissionalUnidade.findMany();
        console.log(`✅ Vínculos Profissional/Unidade: ${data.profissionais_unidades.length}`);

        data.ocis = await prisma.oci.findMany();
        console.log(`✅ OCIs: ${data.ocis.length}`);

        data.procedimentos_oci = await prisma.procedimentoOci.findMany();
        console.log(`✅ Procedimentos OCI: ${data.procedimentos_oci.length}`);

        data.solicitacoes_oci = await prisma.solicitacaoOci.findMany();
        console.log(`✅ Solicitações OCI: ${data.solicitacoes_oci.length}`);

        data.execucoes_procedimentos = await prisma.execucaoProcedimento.findMany();
        console.log(`✅ Execuções: ${data.execucoes_procedimentos.length}`);

        data.status_execucao = await prisma.statusExecucao.findMany();
        console.log(`✅ Tabela de Status: ${data.status_execucao.length}`);

        // Escrevendo o arquivo
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

        console.log('\n=========================================');
        console.log(`✨ BKP CONCLUÍDO COM SUCESSO!`);
        console.log(`📂 Arquivo: backups/${fileName}`);
        console.log(`📏 Local: ${backupPath}`);
        console.log('=========================================');

    } catch (error) {
        console.error('❌ Erro durante o backup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

backup();
