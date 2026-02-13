import { prisma } from '../database/prisma';

export class TipoOciService {
    async list() {
        return await prisma.tipoOci.findMany({
            orderBy: { nome: 'asc' }
        });
    }

    async create(data: { nome: string; descricao?: string; ativo?: boolean }) {
        return await prisma.tipoOci.create({
            data
        });
    }

    async update(id: string, data: { nome?: string; descricao?: string; ativo?: boolean }) {
        return await prisma.tipoOci.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        // Verificar se existem vínculos antes de deletar
        const vinculos = await prisma.oci.count({
            where: { tipoId: id }
        });

        if (vinculos > 0) {
            throw new Error('Não é possível excluir este tipo pois existem OCIs vinculadas a ele.');
        }

        return await prisma.tipoOci.delete({
            where: { id }
        });
    }
}
