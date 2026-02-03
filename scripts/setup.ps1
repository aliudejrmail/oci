# Script de Setup Inicial - Sistema OCI SUS
# PowerShell Script para Windows

Write-Host "🚀 Configurando Sistema OCI SUS..." -ForegroundColor Cyan

# Verificar Node.js
Write-Host "`n📦 Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js não encontrado. Instale Node.js 18+ primeiro." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion encontrado" -ForegroundColor Green

# Verificar PostgreSQL
Write-Host "`n📦 Verificando PostgreSQL..." -ForegroundColor Yellow
$pgVersion = psql --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PostgreSQL não encontrado no PATH. Certifique-se de que está instalado." -ForegroundColor Yellow
} else {
    Write-Host "✅ PostgreSQL encontrado" -ForegroundColor Green
}

# Instalar dependências do backend
Write-Host "`n📦 Instalando dependências do backend..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do backend" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependências do backend instaladas" -ForegroundColor Green

# Instalar dependências do frontend
Write-Host "`n📦 Instalando dependências do frontend..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do frontend" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Verificar arquivo .env
Write-Host "`n⚙️  Verificando configuração..." -ForegroundColor Yellow
if (-Not (Test-Path .env)) {
    Write-Host "📝 Criando arquivo .env a partir do .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  IMPORTANTE: Configure o arquivo .env com suas credenciais do banco de dados!" -ForegroundColor Yellow
} else {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
}

# Gerar Prisma Client
Write-Host "`n🔧 Gerando Prisma Client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao gerar Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client gerado" -ForegroundColor Green

# Executar migrações
Write-Host "`n🗄️  Executando migrações do banco de dados..." -ForegroundColor Yellow
Write-Host "⚠️  Certifique-se de que o PostgreSQL está rodando e o banco foi criado!" -ForegroundColor Yellow
$confirm = Read-Host "Deseja executar as migrações agora? (S/N)"
if ($confirm -eq "S" -or $confirm -eq "s") {
    npm run db:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrações executadas" -ForegroundColor Green
        
        # Executar seed
        $seedConfirm = Read-Host "Deseja popular o banco com dados iniciais? (S/N)"
        if ($seedConfirm -eq "S" -or $seedConfirm -eq "s") {
            npm run db:seed
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Banco populado com dados iniciais" -ForegroundColor Green
                Write-Host "`n📋 Credenciais padrão:" -ForegroundColor Cyan
                Write-Host "   Email: admin@oci.sus" -ForegroundColor White
                Write-Host "   Senha: admin123" -ForegroundColor White
            }
        }
    }
} else {
    Write-Host "⏭️  Migrações puladas. Execute manualmente com: npm run db:migrate" -ForegroundColor Yellow
}

Write-Host "`n✅ Setup concluído!" -ForegroundColor Green
Write-Host "`n📚 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Configure o arquivo .env com suas credenciais" -ForegroundColor White
Write-Host "   2. Crie o banco de dados PostgreSQL: CREATE DATABASE oci_sus;" -ForegroundColor White
Write-Host "   3. Execute as migrações: npm run db:migrate" -ForegroundColor White
Write-Host "   4. Execute o seed: npm run db:seed" -ForegroundColor White
Write-Host "   5. Inicie o servidor: npm run dev" -ForegroundColor White
Write-Host "`n📖 Consulte a documentação em docs/INSTALACAO.md para mais detalhes" -ForegroundColor Cyan
