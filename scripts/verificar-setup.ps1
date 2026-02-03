# Script de Verificação de Setup - Sistema OCI SUS
# PowerShell Script para Windows

Write-Host "🔍 Verificando setup do Sistema OCI SUS..." -ForegroundColor Cyan

$erros = @()

# Verificar Prisma Client
Write-Host "`n📦 Verificando Prisma Client..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma\client") {
    Write-Host "✅ Prisma Client encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma Client não encontrado" -ForegroundColor Red
    Write-Host "   Execute: npm run db:generate" -ForegroundColor Yellow
    $erros += "Prisma Client não gerado"
}

# Verificar migrações
Write-Host "`n📦 Verificando migrações..." -ForegroundColor Yellow
if (Test-Path "prisma\migrations") {
    $migrations = Get-ChildItem "prisma\migrations" -Directory
    if ($migrations.Count -gt 0) {
        Write-Host "✅ Migrações encontradas: $($migrations.Count)" -ForegroundColor Green
    } else {
        Write-Host "❌ Nenhuma migração encontrada" -ForegroundColor Red
        Write-Host "   Execute: npm run db:migrate" -ForegroundColor Yellow
        $erros += "Migrações não executadas"
    }
} else {
    Write-Host "❌ Pasta de migrações não encontrada" -ForegroundColor Red
    Write-Host "   Execute: npm run db:migrate" -ForegroundColor Yellow
    $erros += "Migrações não executadas"
}

# Verificar arquivo .env
Write-Host "`n⚙️  Verificando configuração..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
    
    $envContent = Get-Content .env -Raw
    if ($envContent -match 'DATABASE_URL="postgresql://') {
        Write-Host "✅ DATABASE_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  DATABASE_URL pode não estar configurado corretamente" -ForegroundColor Yellow
    }
    
    if ($envContent -match 'JWT_SECRET=') {
        Write-Host "✅ JWT_SECRET configurado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  JWT_SECRET não configurado" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Arquivo .env não encontrado" -ForegroundColor Red
    Write-Host "   Execute: copy .env.example .env" -ForegroundColor Yellow
    $erros += ".env não encontrado"
}

# Resumo
Write-Host "`n" -NoNewline
if ($erros.Count -eq 0) {
    Write-Host "✅ Setup verificado com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Certifique-se de que o PostgreSQL está rodando" -ForegroundColor White
    Write-Host "   2. Execute: npm run db:seed (se ainda não executou)" -ForegroundColor White
    Write-Host "   3. Inicie o servidor: npm run dev" -ForegroundColor White
} else {
    Write-Host "❌ Encontrados $($erros.Count) problema(s):" -ForegroundColor Red
    foreach ($erro in $erros) {
        Write-Host "   - $erro" -ForegroundColor Yellow
    }
    Write-Host "`n📖 Consulte docs/INSTALACAO.md para mais detalhes" -ForegroundColor Cyan
}
