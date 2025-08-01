# NEON GOLF '85 - Setup Script
# Run this script to enable "git commit golf" command

Write-Host "🎮 Setting up NEON GOLF '85 Easter Egg... 🎮" -ForegroundColor Magenta

# Create git alias for direct golf command
git config --global alias.golf "!start index.html"

# Add current directory to PATH for the session (so git-commit-golf.bat works)
$currentDir = Get-Location
$env:PATH = "$currentDir;$env:PATH"

Write-Host "⚡ SETUP COMPLETE! ⚡" -ForegroundColor Cyan
Write-Host ""
Write-Host "🏌️‍♂️ How to play:" -ForegroundColor Yellow
Write-Host "   • Type: git golf" -ForegroundColor Green
Write-Host "   • Or run: git-commit-golf.bat" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Enjoy your EXTREME NEON mini golf! 🎯" -ForegroundColor Magenta 