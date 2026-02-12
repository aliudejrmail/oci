import { validarProcedimentosObrigatoriosOci, ProcedimentoObrigatorio, ExecucaoParaValidacao } from '../src/utils/validacao-apac.utils';

const procedimentosObrigatorios: ProcedimentoObrigatorio[] = [
    { id: '1', codigo: '0301010072', nome: 'CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA' },
    { id: '2', codigo: '0301010307', nome: 'TELECONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA' },
    { id: '3', codigo: '0201010066', nome: 'BIÓPSIA DO COLO UTERINO' },
    { id: '4', codigo: '0203020081', nome: 'EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO-BIÓPSIA' }
];

const execucoes: ExecucaoParaValidacao[] = [
    { status: 'REALIZADO', procedimento: { id: '3', codigo: '0201010066', nome: 'BIÓPSIA DO COLO UTERINO' } },
    { status: 'REALIZADO', procedimento: { id: '1', codigo: '0301010072', nome: 'CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA' } },
    { status: 'DISPENSADO', procedimento: { id: '2', codigo: '0301010307', nome: 'TELECONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA' } },
    { status: 'REALIZADO', procedimento: { id: '4', codigo: '0203020081', nome: 'EXAME ANATOMO-PATOLÓGICO DO COLO UTERINO-BIÓPSIA' } }
];

const resultado = validarProcedimentosObrigatoriosOci(procedimentosObrigatorios, execucoes);
console.log('REGRAS ATUAIS:');
console.log('Valido:', resultado.valido);
console.log('Erro:', resultado.erro);
