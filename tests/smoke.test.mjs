import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file,root),"utf8");

test("O código JavaScript tem sintaxe válida", () => {
  for (const file of ["app.js","studies.js","reading.js","sw.js"]) assert.doesNotThrow(() => new vm.Script(read(file),{filename:file}));
});

test("O guia possui 13 capítulos completos e 26 perguntas", () => {
  const context = {window:{}};
  vm.createContext(context);
  vm.runInContext(read("studies.js"),context);
  const items=context.window.REICH_STUDIES;
  assert.equal(items.length,13);
  assert.deepEqual(Array.from(items,x=>x.id),Array.from({length:13},(_,i)=>i+1));
  let total=0;
  for (const chapter of items){
    assert.ok(chapter.title.length>8 && chapter.lead.length>30);
    assert.equal(chapter.concepts.length,3);
    assert.ok(chapter.debate.endsWith("?"));
    assert.equal(chapter.quiz.length,2);
    for(const q of chapter.quiz){
      assert.equal(q[1].length,3);
      assert.ok(Number.isInteger(q[2]) && q[2]>=0 && q[2]<3);
      assert.ok(q[3].length>25);
      total++;
    }
  }
  assert.equal(total,26);
});

test("HTML declara componentes e conteúdo privado", () => {
  const html=read("index.html");
  for(const id of ["reader","epubInput","chapterNav","tocList","chapterNotes","quizList","conceptCards","highlightsList","backupBtn"]){
    assert.ok(html.includes('id="'+id+'"'),"Elemento ausente: "+id);
  }
  assert.ok(html.includes('src="studies.js"'));
  assert.ok(html.includes('src="reading.js"'));
  assert.ok(html.includes('id="interactiveReader"'));
  assert.ok(html.includes('id="modeOriginal"'));
  assert.ok(html.includes('id="flashcardBox"'));
  assert.ok(html.includes('src="app.js"'));
  assert.ok(!html.includes("book-data.js"));
});

test("Manifesto de aplicativo é válido", () => {
  const manifest=JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.lang,"pt-BR");
  assert.ok(manifest.icons.length>0);
});

test("Leitura integrada possui 13 capítulos e perguntas de reflexão", () => {
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(read("reading.js"),context);
  const chapters=context.window.REICH_READING;
  assert.equal(chapters.length,13);
  for(const chapter of chapters){
    assert.ok(chapter.title.length>10);
    assert.ok(chapter.intro.length>80);
    assert.ok(chapter.sections.length>=2);
    for(const section of chapter.sections){
      assert.ok(section.p.length>=2);
      assert.ok(section.p.every(p=>p.length>=100));
      assert.ok(section.pause.endsWith("?"));
    }
  }
});
test("Releitura pessoal mantém separação entre conteúdo público e EPUB", () => {
  const src=read("app.js");
  assert.ok(src.includes('indexedDB.open('));
  assert.ok(src.includes('setReadingMode('));
  assert.ok(src.includes('renderInteractive()'));
  assert.ok(src.includes('renderFlashcards()'));
  assert.ok(!read("index.html").includes('book-data.js'));
});

test("O texto original é carregado do EPUB do usuário, não do código do site", () => {
  const app=read("app.js");
  const html=read("index.html");
  assert.ok(app.includes("function extractOriginalSection("));
  assert.ok(app.includes("section.load(book.load.bind(book))"));
  assert.ok(app.includes("function makeOriginalExcerptControl("));
  assert.ok(app.includes("function renderOriginalSections("));
  assert.ok(html.includes('id="originalSectionLinks"'));
  assert.ok(app.includes("A fonte e cada parágrafo são preservados"));
});
