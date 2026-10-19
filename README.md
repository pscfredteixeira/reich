# Círculo Reich

Leitor EPUB interativo e caderno de estudos sobre *Psicologia de Massas do Fascismo*, de Wilhelm Reich.

## Como abrir

O projeto funciona como site estático: publique em **Settings → Pages → Deploy from a branch → main → / (root)**. Depois acesse `https://pscfredteixeira.github.io/reich/`.

Clique em **Importar EPUB** e selecione o livro no seu dispositivo. O EPUB não é enviado ao GitHub nem a outros servidores. Ele fica guardado no próprio navegador por meio de IndexedDB.

## O que tem

- Leitura integral do EPUB importado; índice de capítulos e seções; navegação por páginas.
- Controle de fonte e modo claro/escuro, progresso salvo, continuação da leitura.
- Explicações autorais interativas para os 13 capítulos, conceitos, questões para debate e quizzes.
- Trechos destacados, anotações pessoais, caderno por capítulo e exportação/importação dos estudos em JSON.
- Layout responsivo para desktop e celular.

## Tecnologia e direitos autorais

HTML, CSS, JavaScript e [ePub.js 0.3.93](https://www.npmjs.com/package/epubjs) (carregado por CDN). O aplicativo não inclui texto protegido por direitos autorais nem disponibiliza o EPUB publicamente. A leitura acontece apenas no navegador de quem importou seu próprio arquivo.

**Atenção:** dados não sincronizam entre dispositivos. Use o botão **Exportar dados** para fazer backup das suas notas.
