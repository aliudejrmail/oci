import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../database/prisma';

const router = Router();

router.use(authenticate);

// Listar pacientes (busca por nome, CNS ou CPF)
router.get('/', async (req, res) => {
  try {
    const { search, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search && typeof search === 'string' && search.trim()) {
      const termo = search.trim();
      const termoNumeros = termo.replace(/\D/g, '');
      const condicoes: any[] = [
        { nome: { contains: termo, mode: 'insensitive' } }
      ];
      if (termoNumeros.length > 0) {
        condicoes.push(
          { cpf: { contains: termoNumeros } },
          { cns: { contains: termoNumeros } }
        );
      } else {
        condicoes.push(
          { cpf: { contains: termo } },
          { cns: { contains: termo } }
        );
      }
      where.OR = condicoes;
    }

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          cpf: true,
          cns: true,
          dataNascimento: true,
          sexo: true,
          municipio: true,
          uf: true,
          telefone: true,
          email: true
        }
      }),
      prisma.paciente.count({ where })
    ]);

    return res.json({
      pacientes,
      paginacao: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    const isPrisma = error?.code && String(error.code).startsWith('P');
    return res.status(500).json({
      message: error?.message || 'Erro ao listar pacientes',
      ...(isPrisma && { code: error.code, hint: 'Verifique DATABASE_URL no .env e execute: npx prisma generate' })
    });
  }
});

// Buscar paciente por ID
router.get('/:id', async (req, res) => {
  try {
    const paciente = await prisma.paciente.findUnique({
      where: { id: req.params.id },
      include: {
        solicitacoes: {
          include: {
            oci: {
              select: {
                id: true,
                codigo: true,
                nome: true
              }
            }
          },
          orderBy: { dataSolicitacao: 'desc' }
        }
      }
    });

    if (!paciente) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    return res.json(paciente);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Criar paciente
router.post('/', async (req, res) => {
  try {
    const {
      nome,
      cpf,
      cns,
      dataNascimento,
      sexo,
      responsavel,
      cep,
      logradouro,
      numero,
      bairro,
      municipio,
      uf,
      telefone,
      email
    } = req.body;

    if (!nome?.trim() || !cpf?.trim() || !dataNascimento || !sexo?.trim() || !municipio?.trim() || !uf?.trim()) {
      return res.status(400).json({
        message: 'Campos obrigatórios: nome, CPF, data de nascimento, sexo, município e UF.'
      });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ message: 'CPF deve conter 11 dígitos.' });
    }

    const existente = await prisma.paciente.findUnique({
      where: { cpf: cpfLimpo }
    });
    if (existente) {
      return res.status(400).json({ message: 'Já existe paciente cadastrado com este CPF.' });
    }

    const paciente = await prisma.paciente.create({
      data: {
        nome: nome.trim(),
        cpf: cpfLimpo,
        cns: cns ? cns.replace(/\D/g, '') : null,
        dataNascimento: new Date(dataNascimento),
        sexo: sexo.trim(),
        responsavel: responsavel?.trim() || null,
        cep: cep?.replace(/\D/g, '') || null,
        logradouro: logradouro?.trim() || null,
        numero: numero?.trim() || null,
        bairro: bairro?.trim() || null,
        municipio: municipio.trim(),
        uf: uf.trim().toUpperCase().slice(0, 2),
        telefone: telefone?.replace(/\D/g, '') || null,
        email: email?.trim() || null
      }
    });
    return res.status(201).json(paciente);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// Atualizar paciente
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      nome,
      cpf,
      cns,
      dataNascimento,
      sexo,
      responsavel,
      cep,
      logradouro,
      numero,
      bairro,
      municipio,
      uf,
      telefone,
      email
    } = req.body;

    if (!nome?.trim() || !cpf?.trim() || !dataNascimento || !sexo?.trim() || !municipio?.trim() || !uf?.trim()) {
      return res.status(400).json({
        message: 'Campos obrigatórios: nome, CPF, data de nascimento, sexo, município e UF.'
      });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ message: 'CPF deve conter 11 dígitos.' });
    }

    const existente = await prisma.paciente.findFirst({
      where: {
        cpf: cpfLimpo,
        id: { not: id }
      }
    });
    if (existente) {
      return res.status(400).json({ message: 'Já existe outro paciente cadastrado com este CPF.' });
    }

    const paciente = await prisma.paciente.update({
      where: { id },
      data: {
        nome: nome.trim(),
        cpf: cpfLimpo,
        cns: cns ? cns.replace(/\D/g, '') : null,
        dataNascimento: new Date(dataNascimento),
        sexo: sexo.trim(),
        responsavel: responsavel?.trim() || null,
        cep: cep?.replace(/\D/g, '') || null,
        logradouro: logradouro?.trim() || null,
        numero: numero?.trim() || null,
        bairro: bairro?.trim() || null,
        municipio: municipio.trim(),
        uf: uf.trim().toUpperCase().slice(0, 2),
        telefone: telefone?.replace(/\D/g, '') || null,
        email: email?.trim() || null
      }
    });
    return res.json(paciente);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

// Excluir paciente
router.delete('/:id', requireRole('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar se o paciente existe
    const pacienteExistente = await prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        _count: {
          select: {
            solicitacoes: true
          }
        }
      }
    });

    if (!pacienteExistente) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    // Verificar se possui solicitações associadas
    if (pacienteExistente._count.solicitacoes > 0) {
      return res.status(400).json({
        message: `Não é possível excluir o paciente "${pacienteExistente.nome}". Existem ${pacienteExistente._count.solicitacoes} solicitação(ões) associada(s) a este paciente.`,
        totalSolicitacoes: pacienteExistente._count.solicitacoes
      });
    }

    // Excluir o paciente
    await prisma.paciente.delete({
      where: { id }
    });

    return res.json({
      message: `Paciente "${pacienteExistente.nome}" excluído com sucesso`
    });

  } catch (error: any) {
    console.error('Erro ao excluir paciente:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor ao excluir paciente',
      error: error.message
    });
  }
});

export default router;
