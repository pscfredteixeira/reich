# Círculo Reich — livro interativo

Experiência de leitura e estudo para celular baseada em *Psicologia de Massas do Fascismo*, de Wilhelm Reich.

## Como abrir

Ative GitHub Pages em Settings → Pages → Deploy from a branch → main → / (root).

Endereço previsto: https://pscfredteixeira.github.io/reich/

No iPhone, abra o endereço no Safari e selecione Compartilhar → Adicionar à Tela de Início.

## Recursos

- **Leitura interativa imediata:** 13 capítulos de explicações autorais baseadas na obra, organizados em seções. Não é transcrição integral.
- **Pausas para pensar:** perguntas ao longo da leitura e reflexões salvas.
- **Quizzes:** 26 questões com correção e justificativas.
- **Flashcards:** 39 cartões com frente, verso e marcação de domínio.
- **Caderno:** notas por capítulo e trechos destacados no EPUB.
- **Progresso:** capítulos concluídos, índice e revisão.
- **Minha edição integral:** importe uma única vez seu EPUB. O livro fica armazenado localmente no navegador para ser reaberto nas visitas seguintes.
- **Backup:** exportação e importação de anotações e progresso em JSON.
- **Modo app:** instalável na tela inicial do iPhone, tema claro/escuro e PWA.

## Direitos autorais e privacidade

O texto apresentado automaticamente é material didático autoral, não o livro completo. O repositório é público e não inclui o EPUB ou sua tradução integral. O arquivo pessoal importado fica armazenado **somente no dispositivo**, sem upload ao GitHub. Dados não sincronizam entre dispositivos.

## Tecnologia

HTML, CSS e JavaScript estáticos; ePub.js, IndexedDB, localStorage e manifesto PWA. Não há conta, servidor de dados ou API paga.

## Testes

Execute: node --test tests/smoke.test.mjs
