param(
    [string]$Message = "docs: actualizar docs/architecture.md",
    [string]$File = "docs/architecture.md",
    [switch]$All
)

Write-Host "Ejecutando push-changes.ps1 desde: $(Get-Location)"

# Check git availability
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git no está instalado o no está en PATH. Instala git o ejecuta los comandos manualmente en tu máquina."
    exit 1
}

# Ensure we're in a git repo
$repoRoot = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "El directorio actual no parece estar dentro de un repositorio git. Sitúate en la raíz del repo y vuelve a ejecutar."
    exit 1
}

Write-Host "Repositorio detectado: $repoRoot"

# Print current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Rama actual: $branch"

# Show status summary
git status --porcelain

# Stage files
if ($All) {
    Write-Host "Añadiendo todos los cambios..."
    git add -A
} else {
    Write-Host "Añadiendo: $File"
    git add -- $File
}

# Check if there's anything to commit
$diffIndex = git diff --cached --name-only
if (-not $diffIndex) {
    Write-Host "No hay cambios en el área de staging para commitear. Nada que pushar."
    git status
    exit 0
}

# Commit
Write-Host "Creando commit con mensaje: $Message"
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo al crear el commit. Revisa el estado y vuelve a intentar."
    exit 1
}

# Push
Write-Host "Haciendo push a remoto..."
git push
if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo al hacer git push. Verifica permisos/credenciales y vuelve a intentar."
    exit 1
}

Write-Host "Push completado. Último commit:" 
git log -1 --oneline

Write-Host "Remotos configurados:" 
git remote -v
