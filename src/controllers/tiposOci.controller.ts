import { Request, Response } from 'express';
import { TipoOciService } from '../services/tiposOci.service';

export class TipoOciController {
    private service: TipoOciService;

    constructor() {
        this.service = new TipoOciService();
    }

    index = async (_req: Request, res: Response) => {
        try {
            const tipos = await this.service.list();
            return res.json(tipos);
        } catch (error: any) {
            return res.status(500).json({ message: error.message || 'Erro ao listar tipos de OCI' });
        }
    };

    store = async (req: Request, res: Response) => {
        try {
            const { nome, descricao, ativo } = req.body;

            if (!nome) {
                return res.status(400).json({ message: 'Nome é obrigatório' });
            }

            const tipo = await this.service.create({ nome, descricao, ativo });
            return res.status(201).json(tipo);
        } catch (error: any) {
            // Tratamento específico para violação de chave única (nome duplicado)
            if (error.code === 'P2002') {
                return res.status(400).json({ message: 'Já existe um tipo com este nome.' });
            }
            return res.status(400).json({ message: error.message || 'Erro ao criar tipo de OCI' });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { nome, descricao, ativo } = req.body;

            const tipo = await this.service.update(id, { nome, descricao, ativo });
            return res.json(tipo);
        } catch (error: any) {
            if (error.code === 'P2002') {
                return res.status(400).json({ message: 'Já existe um tipo com este nome.' });
            }
            if (error.code === 'P2025') {
                return res.status(404).json({ message: 'Tipo não encontrado.' });
            }
            return res.status(400).json({ message: error.message || 'Erro ao atualizar tipo de OCI' });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await this.service.delete(id);
            return res.status(204).send();
        } catch (error: any) {
            if (error.code === 'P2025') {
                return res.status(404).json({ message: 'Tipo não encontrado.' });
            }
            return res.status(400).json({ message: error.message || 'Erro ao excluir tipo de OCI' });
        }
    };
}
