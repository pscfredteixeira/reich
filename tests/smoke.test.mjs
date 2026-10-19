import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(new URL(file,root),"utf8");

test("O código JavaScript tem sintaxe válida", () => {
  for (const file of ["app.js","studies.js","sw.js"]) assert.doesNotThrow(() => new vm.Script(read(file),{filename:file}));
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
  assert.ok(html.includes('src="app.js"'));
  assert.ok(!html.includes("book-data.js"));
});

test("Manifesto de aplicativo é válido", () => {
  const manifest=JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.lang,"pt-BR");
  assert.ok(manifest.icons.length>0);
});