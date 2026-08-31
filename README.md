# Painel PJ

Aplicação para organizar pagamentos de contratos PJ, incluindo salário mensal, ajuda de custo, 13ª nota e férias remuneradas.

## Fluxo de contribuição com GitHub CLI

Este guia mostra como clonar o repositório, criar uma branch, enviar alterações e abrir um Pull Request usando o [GitHub CLI](https://cli.github.com/).

### 1. Instale e autentique o GitHub CLI

Instale o GitHub CLI conforme o seu sistema operacional e autentique sua conta:

```bash
gh auth login
```

Siga as instruções do terminal para entrar na sua conta do GitHub e autorizar o acesso.

### 2. Clone o repositório

Substitua `ORGANIZACAO/REPOSITORIO` pelo caminho deste projeto no GitHub:

```bash
gh repo clone ORGANIZACAO/REPOSITORIO
cd REPOSITORIO
```

Confira se o repositório remoto foi configurado corretamente:

```bash
git remote -v
```

### 3. Crie uma branch para sua alteração

Antes de editar o código, atualize a branch principal e crie uma branch descritiva:

```bash
git switch main
git pull origin main
git switch -c feat/minha-alteracao
```

Use prefixos consistentes para facilitar a organização:

- `feat/` para funcionalidades novas;
- `fix/` para correções;
- `docs/` para documentação;
- `refactor/` para melhorias internas no código.

Exemplo para atualizar a documentação:

```bash
git switch -c docs/atualizar-readme
```

### 4. Faça e revise suas alterações

Após editar os arquivos, veja o que foi modificado:

```bash
git status
git diff
```

Adicione os arquivos desejados à área de stage:

```bash
git add .
```

Ou adicione arquivos específicos:

```bash
git add README.md src/routes/index.tsx
```

### 5. Crie um commit

Crie um commit com uma mensagem curta e objetiva:

```bash
git commit -m "feat: adiciona resumo de pagamentos"
```

Exemplos de mensagens:

```bash
git commit -m "fix: corrige cálculo das férias"
git commit -m "docs: documenta fluxo de contribuição"
git commit -m "refactor: simplifica calendário anual"
```

### 6. Envie a branch para o GitHub

Publique a branch criada no repositório remoto:

```bash
git push -u origin feat/minha-alteracao
```

Depois do primeiro envio, os próximos podem ser feitos apenas com:

```bash
git push
```

### 7. Abra um Pull Request

Crie o Pull Request pelo terminal:

```bash
gh pr create --base main --head feat/minha-alteracao --fill
```

A opção `--fill` usa o título e a descrição com base nos commits da branch. Para informar os textos manualmente:

```bash
gh pr create \
  --base main \
  --head feat/minha-alteracao \
  --title "feat: adiciona resumo de pagamentos" \
  --body "## O que foi alterado\n- Adiciona o resumo anual de pagamentos.\n\n## Como validar\n- Confira os valores exibidos no painel."
```

Ao finalizar, o terminal exibirá o link do Pull Request criado.

### 8. Acompanhe o Pull Request

Liste os Pull Requests abertos:

```bash
gh pr list
```

Visualize o Pull Request atual no navegador:

```bash
gh pr view --web
```

Verifique os checks e o status das validações:

```bash
gh pr checks
```

## Resumo rápido

```bash
# Clonar
gh repo clone ORGANIZACAO/REPOSITORIO
cd REPOSITORIO

# Criar branch
git switch main
git pull origin main
git switch -c feat/minha-alteracao

# Salvar e enviar alterações
git add .
git commit -m "feat: descreve a alteração"
git push -u origin feat/minha-alteracao

# Abrir Pull Request
gh pr create --base main --head feat/minha-alteracao --fill
```
