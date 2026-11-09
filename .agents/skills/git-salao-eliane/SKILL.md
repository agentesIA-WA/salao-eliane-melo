---
name: git-salao-eliane
description: >-
  Realiza commit e push automático do código do projeto Salão Eliane Melo para o
  repositório https://github.com/agentesIA-WA/salao-eliane-melo.git usando a
  credencial autenticada agentesIA-WA. Use esta skill sempre que o usuário pedir
  para fazer commit, salvar versão, subir alterações ou publicar o código no GitHub.
---

# Publicação e Commit no GitHub (`git-salao-eliane`)

Esta skill padroniza e automatiza o fluxo de verificação de segurança, criação de commit semântico e envio (`git push`) do código para o repositório `agentesIA-WA/salao-eliane-melo` no GitHub.

## Configuração do Repositório e Autenticação

- **Repositório remoto (`origin`):** `https://github.com/agentesIA-WA/salao-eliane-melo.git`
- **Conta GitHub autenticada no `gh` CLI:** `agentesIA-WA` (`testesagenteia6@gmail.com`)
- **Branch principal:** `main`
- **Script auxiliar:** [github_publish.sh](./scripts/github_publish.sh) (desativa o `GIT_ASKPASS` do VS Code para usar a credencial `agentesIA-WA` do GitHub CLI via `!gh auth git-credential`).

## Passo a Passo para Executar

1. **Inspecione as alterações pendentes**
   Execute `git status -s` e `git diff --stat` para revisar os arquivos modificados e novos antes de montar a mensagem de commit.

2. **Verifique arquivos sensíveis**
   Certifique-se de que arquivos `backend/.env`, `.env.local` ou chaves privadas **não** estão sendo incluídos no stage. O script [github_publish.sh](./scripts/github_publish.sh) bloqueia automaticamente commits caso algum arquivo `.env` sensível esteja no stage.

3. **Defina uma mensagem de commit clara (Conventional Commits em português)**
   Se o usuário não especificou uma mensagem, elabore uma mensagem descritiva resumindo as alterações:
   - `feat: ...` para novas funcionalidades
   - `fix: ...` para correções de bugs
   - `chore: ...` para configurações, scripts ou manutenção
   - `refactor: ...` para refatorações de código

4. **Execute o script de commit e push**
   Rode o script [github_publish.sh](./scripts/github_publish.sh) passando a mensagem de commit:
   ```bash
   bash .agents/skills/git-salao-eliane/scripts/github_publish.sh "sua mensagem de commit"
   ```

5. **Validação pós-publicação**
   Confirme na saída do script o hash do commit gerado, a URL do repositório remoto e que `git status` reporta a árvore limpa e sincronizada com `origin/main`.
