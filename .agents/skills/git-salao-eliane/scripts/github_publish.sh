#!/usr/bin/env bash
set -euo pipefail

COMMIT_MSG="${1:-}"
MODE="${2:-normal}"
EXPECTED_REMOTE="https://github.com/agentesIA-WA/salao-eliane-melo.git"

if [ -z "$COMMIT_MSG" ]; then
  echo "Erro: Informe a mensagem do commit como primeiro argumento."
  echo "Uso: bash .agents/skills/git-salao-eliane/scripts/github_publish.sh \"feat: mensagem\" [--force-first-sync]"
  exit 1
fi

echo "==> [1/5] Verificando repositório remoto..."
REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
if [ -z "$REMOTE_URL" ]; then
  git remote add origin "$EXPECTED_REMOTE"
  REMOTE_URL="$EXPECTED_REMOTE"
elif [ "$REMOTE_URL" != "$EXPECTED_REMOTE" ]; then
  git remote set-url origin "$EXPECTED_REMOTE"
  REMOTE_URL="$EXPECTED_REMOTE"
fi
echo "Remote origin: $REMOTE_URL"

echo "==> [2/5] Adicionando alterações ao stage (git add -A)..."
git add -A

# Proteção contra vazamento de arquivos .env
LEAKED_ENV=$(git diff --cached --name-only | grep -E '(^|/)(\.env|\.env\..*)$' | grep -v '\.env\.example$' || true)
if [ -n "$LEAKED_ENV" ]; then
  echo "ERRO DE SEGURANÇA: Arquivos de ambiente sensíveis detectados no stage:"
  echo "$LEAKED_ENV"
  git reset HEAD -- $LEAKED_ENV
  exit 1
fi

echo "==> [3/5] Verificando alterações no stage..."
if git diff --cached --quiet; then
  echo "Nenhuma alteração pendente para commit."
else
  echo "==> [4/5] Criando commit..."
  git commit -m "$COMMIT_MSG"
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "==> [5/5] Enviando (push) para origin/$BRANCH com credencial agentesIA-WA..."

if [ "$MODE" = "--force-first-sync" ]; then
  GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper="!gh auth git-credential" push -u origin "$BRANCH" --force
else
  if ! GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper="!gh auth git-credential" push -u origin "$BRANCH"; then
    echo ""
    echo "Falha no push. Verifique se o GitHub CLI está autenticado na conta agentesIA-WA (gh auth status)."
    exit 1
  fi
fi

LAST_COMMIT=$(git log -1 --oneline)
echo ""
echo "Sucesso! Código publicado em: $REMOTE_URL (branch: $BRANCH)"
echo "Último commit: $LAST_COMMIT"
