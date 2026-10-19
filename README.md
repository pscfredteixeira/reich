# Círculo Reich — livro integral e grupo de estudos

Aplicativo de leitura pessoal de *Psicologia de Massas do Fascismo*, Wilhelm Reich, com texto original protegido por senha e atividades interativas.

## Situação de privacidade

- Repositório GitHub: **PRIVADO**.
- Texto original integral fornecido pelo usuário: na branch privada **`conteudo-privado`**, pasta `conteudo/original`. NÃO aponte nenhum site ou GitHub Pages para essa branch.
- Site: lê **`book.lock`**, que contém apenas bytes cifrados com AES-256-GCM e PBKDF2 (360 mil iterações). Não há texto integral legível em `main`.
- Senha: **NÃO ESTÁ no código, no site nem nos logs**. É gerada de forma criptograficamente aleatória pela automação e guardada em um artefato privado do GitHub Actions.
- Leitura: o aplicativo descriptografa na memória do navegador após inserir a senha. A senha não é guardada no dispositivo.
- As explicações, perguntas e flashcards permanecem separados do original.

**CUIDADO:** um repositório privado NÃO implica que um site estático publicado esteja privado. O GitHub Pages não deve publicar jamais a branch `conteudo-privado`. A branch `main` contém apenas o pacote cifrado e código do app, podendo ser publicado como site estático sem expor o texto em claro. Para restringir também o acesso à página inteira, coloque Cloudflare Access na frente do site.

## Como obter a senha do livro

1. Acesse a aba **Actions** deste repositório privado.
2. Abra o fluxo **Preparar livro protegido por senha** e escolha a execução concluída com sucesso.
3. Na seção **Artifacts**, baixe **`senha-circulo-reich`** (arquivo ZIP).
4. Abra `senha-circulo-reich.txt` e guarde a senha em um gerenciador seguro. Não envie a senha por chat ou a terceiros.
5. Abra o site publicado, digite a senha na caixa **Minha biblioteca particular** e escolha **Abrir meu livro**.

**Se a senha for perdida**, execute novamente a ação manualmente em Actions > Preparar livro protegido por senha > Run workflow. Isso substitui `book.lock` por uma nova versão, gerando uma nova senha. Os artefatos de senha têm retenção limitada.

## Para usar no iPhone

Conecte a branch `main` a uma hospedagem estática, como Cloudflare Pages (ou habilite GitHub Pages caso seu plano permita publicação do repositório privado). **Nunca publique o ramo com o texto em claro**. A página publicada pode ser acessível publicamente, mas o livro continuará cifrado. Idealmente também ative login em Cloudflare Access.

No Safari, visite a URL publicada, digite a senha e use **Compartilhar > Adicionar à Tela de Início** para instalar o PWA.

## Recursos

- **Livro integral (13 capítulos):** ao desbloquear, abra qualquer capítulo e expanda **Ler o texto integral original deste capítulo**.
- **A Clivagem:** na primeira seção comentada, abra **Texto original de Reich nesta seção** para ler o trecho literal.
- **Grupo de estudos:** texto comentado, conceito, pausas para reflexão e caderno.
- **26 quizzes e 39 flashcards**, notas por capítulo, progresso de leitura.
- **Modo claro/noturno e instalação como aplicativo web**.
- **Opção EPUB local:** alternativa para leitores que não usam o pacote protegido; importar apenas uma vez e continuar no mesmo navegador.

## Criptografia e reconstrução

A rotina `scripts/build_locked.py` é executada por `.github/workflows/book-lock.yml`. Ela obtém o texto de `conteudo-privado`, separa os 13 capítulos, gera uma senha aleatória, cifra o conteúdo e publica apenas `book.lock` em `main`. Nunca confirme o arquivo de senha ou os textos de `conteudo-privado` em `main`.

## Testes

`node --test tests/smoke.test.mjs`

**Limite de proteção:** a criptografia protege o livro contra visitantes sem senha. Qualquer pessoa que tenha a senha e acesso ao site conseguirá lê-lo. Não reutilize senhas de outras contas.
