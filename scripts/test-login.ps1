# Script de Teste de Login - Sistema OCI SUS

Write-Host "🔍 Testando login do sistema..." -ForegroundColor Cyan

$body = @{
    email = "admin@oci.sus"
    senha = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "   Token recebido: $($response.token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   Usuário: $($response.usuario.nome)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro no login:" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Mensagem: $($errorObj.message)" -ForegroundColor Yellow
    } else {
        Write-Host "   Mensagem: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Write-Host "`n💡 Verifique:" -ForegroundColor Cyan
    Write-Host "   1. Se o servidor está rodando (npm run dev:server)" -ForegroundColor White
    Write-Host "   2. Se o seed foi executado (npm run db:seed)" -ForegroundColor White
    Write-Host "   3. Se o PostgreSQL está rodando" -ForegroundColor White
}
