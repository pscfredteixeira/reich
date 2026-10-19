/* Círculo Reich — EPUB e dados locais. Nenhum texto do livro é publicado ou enviado. */
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const studies = window.REICH_STUDIES || [];
  const KEY = "circulo-reich-notas-v1";
  const DB_NAME = "circulo-reich-livro";
  const FILE_STORE = "files";
  const defaults = {theme:"light",font:100,chapter:0,mode:"interactive",reflections:{},cards:{},completed:{},notes:{},answers:{},highlights:[],cfi:null,seen:false,filename:null};
  let state = loadState();
  let currentCard = 0, cardFlipped = false;
  let book = null, rendition = null, chapterHrefs = [], chapterSpines = [], chapterSections = [], toc = [], bookPercent = 0, noteTimer = 0, toastTimer = 0, resizing = 0, restoring = false;
  function loadState(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(e){return Object.assign({},defaults);}}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){notify("O navegador está sem espaço para guardar as notas.");}}
  function notify(msg){const t=$("toast");t.textContent=msg;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),3600);}
  function formatNumber(x){return String(x).padStart(2,"0");}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function openDatabase(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error("IndexedDB indisponível"));return;}const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(FILE_STORE))r.result.createObjectStore(FILE_STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function saveBook(bytes){const db=await openDatabase();return new Promise((resolve,reject)=>{const tr=db.transaction(FILE_STORE,"readwrite");tr.objectStore(FILE_STORE).put(bytes,"current");tr.oncomplete=()=>{db.close();resolve();};tr.onerror=()=>{db.close();reject(tr.error);};});}
  async function storedBook(){const db=await openDatabase();return new Promise((resolve,reject)=>{const tr=db.transaction(FILE_STORE,"readonly");const req=tr.objectStore(FILE_STORE).get("current");req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>{db.close();reject(req.error);};});}
  function showReader(){state.seen=true;$("intro").hidden=true;$("readerLayout").hidden=false;persist();}
  function showWelcome(){$("intro").hidden=false;$("readerLayout").hidden=true;}
  function renderNav(){
    const nav=$("chapterNav");nav.textContent="";
    studies.forEach((s,i)=>{
      const b=document.createElement("button");b.type="button";b.className="nav-item"+(state.chapter===i?" active":"");b.setAttribute("aria-current",state.chapter===i?"page":"false");
      const num=document.createElement("span");num.className="nav-num";num.textContent=formatNumber(i+1);
      const title=document.createElement("span");title.className="nav-text";title.textContent=s.title;
      b.append(num,title);
      if(state.completed[s.id]){const mark=document.createElement("span");mark.className="nav-check";mark.textContent="✓";b.append(mark);}
      b.addEventListener("click",()=>{openChapter(i,true);closeNav();});
      nav.append(b);
    });
    updateProgress();
  }
  function updateProgress(){
    const done=Object.keys(state.completed).filter(k=>state.completed[k]).length;
    const p=book && bookPercent>0 ? Math.round(bookPercent*100) : Math.round(done/studies.length*100);
    $("progressLabel").textContent=p+"%";$("progressFill").style.width=p+"%";
    $("progressDetail").textContent=done+" de "+studies.length+" capítulos estudados"+(book&&bookPercent>0?" · "+Math.round(bookPercent*100)+"% lido":"");
  }
  function setReadingMode(mode){
    state.mode=mode==="original"?"original":"interactive";
    $("interactiveReader").hidden=state.mode!=="interactive";
    $("epubReaderPanel").hidden=state.mode!=="original";
    $("modeInteractive").classList.toggle("active",state.mode==="interactive");
    $("modeOriginal").classList.toggle("active",state.mode==="original");
    $("modeInteractive").setAttribute("aria-pressed",String(state.mode==="interactive"));
    $("modeOriginal").setAttribute("aria-pressed",String(state.mode==="original"));
    if(state.mode==="original"&&!book)showEmptyBook();
    if(state.mode==="original"&&rendition){setTimeout(()=>{try{rendition.resize();}catch(e){}},100);}
    persist();
  }
  function renderInteractive(){
    const s=(window.REICH_READING||[])[state.chapter];
    const panel=$("interactiveReader");
    panel.textContent="";
    if(!s){panel.textContent="Não foi possível carregar o capítulo interativo.";return;}
    const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
    const cover=el("header","reading-chapter-cover");
    cover.append(el("div","reading-kicker","CÍRCULO REICH / CAPÍTULO "+formatNumber(s.n)));
    cover.append(el("h1","reading-title",s.title));
    cover.append(el("p","reading-intro",s.intro));
    const note=el("div","reading-source","Os parágrafos comentados são nossos. Para ler as palavras exatas de Reich, abra «Texto original de Reich» dentro de cada seção após importar seu EPUB.");
    cover.append(note);
    panel.append(cover);
    const mini=el("nav","reading-minitoc");mini.setAttribute("aria-label","Seções deste capítulo");
    mini.append(el("div","reading-small-label","NESTE CAPÍTULO"));
    s.sections.forEach((section,i)=>{
      const link=el("button","reading-mini-link",formatNumber(i+1)+" · "+section.h);
      link.type="button";link.addEventListener("click",()=>{const target=$("textsec-"+i);if(target)target.scrollIntoView({behavior:"smooth",block:"start"});});
      mini.append(link);
    });
    panel.append(mini);
    s.sections.forEach((section,i)=>{
      const article=el("section","reading-section");article.id="textsec-"+i;
      article.append(el("div","reading-section-tag",section.tag));
      article.append(el("h2","reading-section-title",section.h));
      for(const p of section.p)article.append(el("p","reading-paragraph",p));
      article.append(makeOriginalExcerptControl(state.chapter,i,section.h,s.sections.length));
      const c=studies[state.chapter]?.concepts?.[i%3];
      if(c){
        const details=el("details","reading-concept");
        const summary=el("summary","","⊕  Entenda o conceito: "+c[0]);
        details.append(summary,el("p","",c[1]));article.append(details);
      }
      const pause=el("div","reading-pause");
      const h=el("div","reading-pause-heading","✦  PAUSA PARA PENSAR");
      const question=el("p","reading-pause-question",section.pause);
      const key=state.chapter+"-"+i;
      const box=el("textarea","reading-reflection");
      box.placeholder="Escreva sua interpretação. Sua resposta ficará salva no dispositivo.";
      box.rows=3;box.setAttribute("aria-label","Sua reflexão sobre: "+section.pause);
      box.value=(state.reflections||{})[key]||"";
      const saved=el("div","reading-reflection-save",box.value?"✓ Reflexão guardada":"Anotações salvas automaticamente");
      let delay;
      box.addEventListener("input",()=>{saved.textContent="Salvando…";clearTimeout(delay);delay=setTimeout(()=>{state.reflections=state.reflections||{};state.reflections[key]=box.value;persist();saved.textContent="✓ Reflexão guardada";},260);});
      const copyDebate=el("button","reading-debate-copy","↗ Copiar pergunta e minha resposta para discutir");
      copyDebate.type="button";
      copyDebate.addEventListener("click",async()=>{
        const message="Grupo de estudos Reich — Capítulo "+formatNumber(s.n)+": "+s.title+"\nSeção: "+section.h+"\nPergunta: "+section.pause+"\nMinha reflexão: "+(box.value.trim()||"(ainda não escrevi)")+"\nVamos debater minha interpretação, identificando a hipótese de Reich, os limites e um contraponto freudiano.";
        try{await navigator.clipboard.writeText(message);notify("Copiado! Cole na nossa conversa para debatermos.");}
        catch(e){box.focus();box.select();notify("Não foi possível copiar automaticamente. Selecione o texto e copie.");}
      });
      pause.append(h,question,box,saved,copyDebate);article.append(pause);
      panel.append(article);
    });
    const check=el("section","reading-selfcheck");
    check.append(el("div","reading-section-tag","PARA FIXAR"));
    check.append(el("h2","reading-section-title","Você consegue explicar?"));
    check.append(el("p","reading-paragraph","Responda sem consultar suas anotações. Depois confira a explicação."));
    for(let i=0;i<(studies[state.chapter]?.quiz||[]).length;i++){
      const quiz=studies[state.chapter].quiz[i];
      const key=studies[state.chapter].id+"-"+i;
      const saved=state.answers[key];
      const card=el("div","reading-check-card");
      card.append(el("div","reading-small-label","QUESTÃO "+formatNumber(i+1)));
      card.append(el("p","reading-check-prompt",quiz[0]));
      quiz[1].forEach((option,j)=>{
        const button=el("button","reading-check-option",String.fromCharCode(65+j)+". "+option);
        button.type="button";
        if(saved!==undefined){button.disabled=true;if(j===quiz[2])button.classList.add("correct");else if(j===saved)button.classList.add("wrong");}
        button.addEventListener("click",()=>{state.answers[key]=j;persist();renderInteractive();renderQuizzes();const card2=$("readingQuiz-"+i);if(card2)card2.scrollIntoView({behavior:"smooth",block:"center"});});
        card.append(button);
      });
      if(saved!==undefined){
        card.append(el("p","reading-check-feedback",(saved===quiz[2]?"✓ Correto. ":"Vale revisar. ")+quiz[3]));
        const reset=el("button","reading-reset","↻ Refazer");reset.type="button";
        reset.addEventListener("click",()=>{delete state.answers[key];persist();renderInteractive();renderQuizzes();});
        card.append(reset);
      }
      card.id="readingQuiz-"+i;
      check.append(card);
    }
    panel.append(check);
    const foot=el("div","reading-finish");
    foot.append(el("p","","Chegou ao fim deste capítulo? Registre o encontro no seu percurso."));
    const done=!!state.completed[s.n];
    const btn=el("button","reading-finish-btn",done?"✓ Capítulo estudado — desfazer":"✓ Concluir este capítulo");
    btn.type="button";
    btn.addEventListener("click",()=>{state.completed[s.n]=!state.completed[s.n];persist();renderNav();renderComplete();renderInteractive();notify(state.completed[s.n]?"Capítulo concluído.":"Marcação desfeita.");});
    foot.append(btn);
    const nxt=el("button","reading-next","Próximo capítulo →");
    nxt.type="button";nxt.disabled=state.chapter===studies.length-1;
    nxt.addEventListener("click",()=>openChapter(state.chapter+1,true));
    foot.append(nxt);
    panel.append(foot);
  }
  function renderGuide(){
    const s=studies[state.chapter];if(!s)return;
    renderInteractive();
    $("eyebrow").textContent="LIVRO INTERATIVO · CAPÍTULO "+formatNumber(s.id);
    $("topTitle").textContent=s.title;
    $("guideKicker").textContent="ENCONTRO "+formatNumber(s.id)+" · "+s.tag.toUpperCase();
    $("guideTitle").textContent=s.title;
    $("guideLead").textContent=s.lead;
    $("debateQuestion").textContent=s.debate;
    const wrap=$("conceptCards");wrap.textContent="";
    s.concepts.forEach((entry,i)=>{
      const outer=document.createElement("div");outer.className="concept-card";
      const btn=document.createElement("button");btn.type="button";btn.setAttribute("aria-expanded","false");
      const n=document.createElement("span");n.className="concept-num";n.textContent=formatNumber(i+1);
      const name=document.createElement("span");name.className="concept-name";name.textContent=entry[0];
      const plus=document.createElement("span");plus.className="concept-plus";plus.textContent="+";
      btn.append(n,name,plus);
      const detail=document.createElement("div");detail.className="concept-body";detail.textContent=entry[1];detail.hidden=true;
      btn.addEventListener("click",()=>{detail.hidden=!detail.hidden;plus.textContent=detail.hidden?"+":"−";btn.setAttribute("aria-expanded",String(!detail.hidden));});
      outer.append(btn,detail);wrap.append(outer);
    });
    $("chapterNotes").value=state.notes[s.id]||"";
    $("saveStatus").textContent="Salvo automaticamente no navegador";
    renderQuizzes();currentCard=0;cardFlipped=false;renderFlashcards();renderHighlights();renderOriginalSections();renderComplete();renderNav();
    $("prevChapter").disabled=state.chapter===0;
    $("nextChapter").disabled=state.chapter===studies.length-1;
  }
  function renderQuizzes(){
    const s=studies[state.chapter];const host=$("quizList");host.textContent="";
    s.quiz.forEach((q,i)=>{
      const key=s.id+"-"+i;const saved=state.answers[key];
      const outer=document.createElement("article");outer.className="quiz-card";
      const lbl=document.createElement("div");lbl.className="quiz-label";lbl.textContent="QUESTÃO "+formatNumber(i+1);
      const h=document.createElement("h3");h.textContent=q[0];outer.append(lbl,h);
      q[1].forEach((opt,j)=>{
        const b=document.createElement("button");b.className="answer";b.type="button";b.textContent=String.fromCharCode(65+j)+". "+opt;
        if(saved!==undefined){b.disabled=true;if(j===q[2])b.classList.add("correct");else if(saved===j)b.classList.add("wrong");}
        b.addEventListener("click",()=>{state.answers[key]=j;persist();renderQuizzes();});
        outer.append(b);
      });
      if(saved!==undefined){
        const f=document.createElement("div");f.className="feedback";f.textContent=(saved===q[2]?"✓ Resposta correta. ":"Uma boa pergunta para revisar. ")+q[3];
        const retry=document.createElement("button");retry.type="button";retry.className="inline-link";retry.textContent="Refazer esta questão ↻";retry.style.marginTop="9px";retry.addEventListener("click",()=>{delete state.answers[key];persist();renderQuizzes();});
        outer.append(f,retry);
      }
      host.append(outer);
    });
  }
  function renderFlashcards(){
    const host=$("flashcardBox");host.textContent="";
    const concepts=studies[state.chapter]?.concepts||[];
    if(!concepts.length)return;
    currentCard=Math.max(0,Math.min(concepts.length-1,currentCard));
    const score=concepts.filter((x,i)=>state.cards[studies[state.chapter].id+"-"+i]==="known").length;
    const label=document.createElement("div");label.className="flashcard-progress";
    label.textContent="CARTÃO "+(currentCard+1)+" DE "+concepts.length+"   ·   "+score+" DOMINADO"+(score===1?"":"S");
    const flash=document.createElement("button");flash.className="flashcard";flash.type="button";flash.setAttribute("aria-label","Virar cartão: "+concepts[currentCard][0]);
    const caption=document.createElement("div");caption.className="flashcard-caption";caption.textContent=cardFlipped?"VERSO · EXPLICAÇÃO":"FRENTE · CONCEITO";
    const body=document.createElement("div");body.className="flashcard-body";body.textContent=cardFlipped?concepts[currentCard][1]:concepts[currentCard][0];
    const tip=document.createElement("div");tip.className="flashcard-tip";tip.textContent="↻ Toque para virar";
    flash.append(caption,body,tip);
    flash.addEventListener("click",()=>{cardFlipped=!cardFlipped;renderFlashcards();});
    const controls=document.createElement("div");controls.className="flashcard-controls";
    const back=document.createElement("button");back.type="button";back.textContent="← Anterior";
    back.disabled=currentCard===0;
    back.addEventListener("click",()=>{currentCard--;cardFlipped=false;renderFlashcards();});
    const known=document.createElement("button");known.type="button";known.className="flashcard-know";known.textContent="✓ Sei explicar";
    known.addEventListener("click",()=>{state.cards=state.cards||{};state.cards[studies[state.chapter].id+"-"+currentCard]="known";persist();if(currentCard<concepts.length-1){currentCard++;cardFlipped=false;}renderFlashcards();});
    const next=document.createElement("button");next.type="button";next.textContent="Próximo →";
    next.disabled=currentCard===concepts.length-1;
    next.addEventListener("click",()=>{currentCard++;cardFlipped=false;renderFlashcards();});
    controls.append(back,known,next);
    const reset=document.createElement("button");reset.type="button";reset.className="flashcard-reset";reset.textContent="↻ Reiniciar avaliação deste capítulo";
    reset.addEventListener("click",()=>{concepts.forEach((_,i)=>delete state.cards[studies[state.chapter].id+"-"+i]);currentCard=0;cardFlipped=false;persist();renderFlashcards();});
    host.append(label,flash,controls,reset);
  }
  function renderComplete(){
    const isDone=!!state.completed[studies[state.chapter].id],b=$("completeChapter");
    b.classList.toggle("done",isDone);b.textContent=isDone?"✓ Estudado":"✓ Marcar estudado";
  }
  function renderHighlights(){
    const host=$("highlightsList");host.textContent="";
    const arr=state.highlights.filter(h=>h.chapter===state.chapter);
    $("noteCount").textContent=String(state.highlights.length);
    if(!arr.length){const p=document.createElement("p");p.className="empty-text";p.textContent="Nenhum trecho destacado neste capítulo. Selecione uma passagem no leitor para guardá-la aqui.";host.append(p);return;}
    arr.forEach(item=>{
      const card=document.createElement("div");card.className="highlight-card";
      const quote=document.createElement("blockquote");quote.textContent="“"+item.text+"”";card.append(quote);
      const textarea=document.createElement("textarea");textarea.rows=2;textarea.placeholder="Minha observação sobre este trecho…";textarea.value=item.note||"";
      textarea.addEventListener("input",()=>{item.note=textarea.value;persist();});
      card.append(textarea);
      const actions=document.createElement("div");actions.className="highlight-actions";
      const jump=document.createElement("button");jump.type="button";jump.textContent="Ver no livro ↗";jump.addEventListener("click",()=>{if(rendition)rendition.display(item.cfi).catch(()=>notify("Não foi possível abrir este trecho."));else notify("Importe o EPUB para abrir o trecho.");});
      const remove=document.createElement("button");remove.type="button";remove.textContent="Excluir destaque";remove.addEventListener("click",()=>{state.highlights=state.highlights.filter(x=>x.id!==item.id);try{rendition&&rendition.annotations.remove(item.cfi,"highlight");}catch(e){}persist();renderHighlights();});
      actions.append(jump,remove);card.append(actions);host.append(card);
    });
  }
  function openChapter(i,navigate){
    state.chapter=Math.max(0,Math.min(studies.length-1,i));showReader();renderGuide();
    if(book && rendition && navigate && state.mode==="original"){
      const href=chapterHrefs[state.chapter];
      if(href)rendition.display(href).catch(()=>notify("Não foi possível abrir este capítulo no EPUB."));
    }else if(!book)showEmptyBook();
    if(navigate)window.scrollTo({top:0,behavior:"smooth"});
    persist();
  }
  function showEmptyBook(){
    $("reader").innerHTML='<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:32px"><div style="font-size:53px;color:#789781">◫</div><div style="font:500 23px/1.3 Georgia,serif;color:#496653">Seu livro, seu ritmo.</div><p style="font:12px/1.8 Arial,sans-serif;color:#8b9e8d;max-width:270px">O guia de estudos já está disponível. Importe o EPUB para ler o texto original nesta área.</p><button id="emptyImport" class="primary">Abrir arquivo EPUB →</button></div>';
    $("emptyImport").addEventListener("click",()=>$("epubInput").click());
    $("readerCaption").textContent="LEITURA DO TEXTO ORIGINAL · EPUB NÃO IMPORTADO";
    $("pageStatus").textContent="Aguardando seu arquivo";
  }
  function flattenToc(items,depth,out){(items||[]).forEach(x=>{out.push({label:x.label||"",href:x.href||"",depth:depth});if(x.subitems&&x.subitems.length)flattenToc(x.subitems,depth+1,out);});return out;}
  function renderToc(){
    const host=$("tocList");host.textContent="";
    const flat=flattenToc(toc,0,[]);
    if(!flat.length){const p=document.createElement("p");p.className="hint";p.textContent="Este arquivo EPUB não informa um índice.";host.append(p);return;}
    flat.forEach(item=>{
      const b=document.createElement("button");b.type="button";b.className="toc-row"+(item.depth>0?" sub":"");b.textContent=item.label;b.title=item.label;
      b.addEventListener("click",()=>{if(rendition)rendition.display(item.href).then(()=>closeNav()).catch(()=>notify("Não foi possível abrir esta seção."));});
      host.append(b);
    });
  }
  function mapChapters(){
    const flat=flattenToc(toc,0,[]);
    const main=flat.filter(x=>x.depth===0 && /^cap[ií]tulo\s+[ivxlcdm0-9]+\b/i.test(x.label.trim()));
    chapterHrefs=studies.map((s,i)=>main[i]?.href||null);
    chapterSpines=chapterHrefs.map(h=>{try{const sp=book.spine.get(h?.split("#")[0]);return sp?sp.index:NaN;}catch(e){return NaN;}});
    chapterSections=studies.map((study,i)=>{
      const heading=main[i];if(!heading)return [];
      const start=flat.indexOf(heading),found=[];
      for(let p=start+1;p<flat.length && flat[p].depth>heading.depth;p++){
        if(flat[p].depth===heading.depth+1 && flat[p].href)found.push(flat[p]);
      }
      return found.length?found:[{label:"Ler o capítulo original",href:heading.href,depth:0}];
    });
    if(main.length!==13)notify("Esta edição possui índice diferente: verifique os títulos no índice do EPUB.");
  }
  function renderOriginalSections(){
    const host=$("originalSectionLinks"),hint=$("originalSectionHint");
    if(!host||!hint)return;
    host.textContent="";
    const sections=chapterSections[state.chapter]||[];
    if(!book || !sections.length){
      const b=document.createElement("button");b.type="button";b.className="original-link primary-original";
      b.textContent="↥ Importar meu EPUB para ler o texto exato";
      b.addEventListener("click",()=>$("epubInput").click());host.append(b);
      hint.textContent="O texto original é carregado somente do seu arquivo, neste dispositivo.";
      return;
    }
    sections.forEach((item,i)=>{
      const b=document.createElement("button");b.type="button";b.className="original-link";
      const n=document.createElement("span");n.className="original-num";n.textContent=formatNumber(i+1);
      const label=document.createElement("span");label.className="original-text";label.textContent=item.label;
      const arrow=document.createElement("span");arrow.className="original-arrow";arrow.textContent="↗";
      b.append(n,label,arrow);
      b.addEventListener("click",async()=>{
        if(!rendition)return notify("Importe o EPUB para ler o texto original.");
        try{
          setReadingMode("original");
          await rendition.display(item.href);
          $("readerCaption").textContent="TEXTO ORIGINAL · "+item.label.toUpperCase();
          host.querySelectorAll(".original-link").forEach(link=>link.classList.remove("selected"));
          b.classList.add("selected");
          if(window.innerWidth<990)document.querySelector(".reader-main").scrollIntoView({behavior:"smooth",block:"start"});
        }catch(e){notify("Não foi possível abrir esta seção. Consulte o Índice original.");}
      });
      host.append(b);
    });
    hint.textContent="Este conteúdo vem literalmente do seu EPUB. Nenhum trecho integral está publicado no GitHub.";
  }
  function canonicalLabel(label){
    return String(label).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
  }
  function getOriginalRef(chapter,index,label,count){
    const refs=chapterSections[chapter]||[];
    if(!refs.length)return null;
    if(refs.length===count)return refs[index]||null;
    const exact=refs.find(r=>canonicalLabel(r.label)===canonicalLabel(label));
    return exact||null;
  }
  function cleanEpubNode(src){
    if(src.nodeType===3)return document.createTextNode(src.nodeValue);
    if(src.nodeType!==1)return null;
    const tag=(src.localName||"").toLowerCase();
    if(["script","style","iframe","object","form","input","button","svg","video","audio","meta","link"].includes(tag))return null;
    const allowed=new Set(["p","blockquote","ul","ol","li","table","thead","tbody","tfoot","tr","th","td","b","strong","i","em","u","small","sup","sub","br","hr","h1","h2","h3","h4","h5","h6","span"]);
    const clone=allowed.has(tag)?document.createElement(tag):document.createDocumentFragment();
    for(const child of Array.from(src.childNodes)){
      const safe=cleanEpubNode(child);if(safe)clone.appendChild(safe);
    }
    return clone;
  }
  async function extractOriginalSection(href){
    if(!book)throw new Error("É preciso importar o seu EPUB primeiro.");
    const [path,anchor]=href.split("#");
    const section=book.spine.get(path);
    if(!section)throw new Error("Seção não encontrada no EPUB importado.");
    const dom=await section.load(book.load.bind(book));
    const src=section.document || dom.ownerDocument || dom;
    const body=src.querySelector?.("body") || src.getElementsByTagName?.("body")?.[0];
    if(!body)throw new Error("Este EPUB não forneceu conteúdo legível para a seção.");
    const children=Array.from(body.children);
    let start=0;
    if(anchor){
      let node=src.getElementById(decodeURIComponent(anchor));
      if(!node)throw new Error("O marcador desta seção não foi encontrado.");
      while(node.parentElement && node.parentElement!==body)node=node.parentElement;
      const ix=children.indexOf(node);
      if(ix>=0)start=ix;
    }
    const fragment=document.createDocumentFragment();
    // A fonte e cada parágrafo são preservados, sem copiar ou parafrasear palavras.
    for(const child of children.slice(start)){
      const safe=cleanEpubNode(child);if(safe)fragment.appendChild(safe);
    }
    return fragment;
  }
  function makeOriginalExcerptControl(chapter,index,label,count){
    const shell=document.createElement("div");shell.className="reading-original";
    const btn=document.createElement("button");btn.type="button";btn.className="reading-original-btn";
    btn.textContent="▤ Texto original de Reich nesta seção ↘";
    const note=document.createElement("p");note.className="reading-original-note";
    note.textContent="Ao abrir, as palavras aparecem diretamente do seu EPUB, sem adaptações.";
    const content=document.createElement("div");content.className="reading-original-text";content.hidden=true;
    shell.append(btn,note,content);
    let loaded=false;
    btn.addEventListener("click",async()=>{
      if(!book){
        notify("Importe seu EPUB: o aplicativo nunca publica o livro no repositório.");
        $("epubInput").click();return;
      }
      const ref=getOriginalRef(chapter,index,label,count);
      if(!ref){
        setReadingMode("original");
        await rendition.display(chapterHrefs[chapter]).catch(()=>{});
        notify("Esta subdivisão é nossa, não existe no sumário de Reich. O livro original foi aberto ao lado.");
        return;
      }
      if(loaded){
        content.hidden=!content.hidden;btn.textContent=content.hidden?"▤ Mostrar texto original de Reich ↘":"▤ Recolher texto original de Reich ↑";return;
      }
      btn.disabled=true;btn.textContent="Carregando o texto original…";
      try{
        const frag=await extractOriginalSection(ref.href);
        content.replaceChildren(frag);
        if(!content.textContent.trim())throw new Error("O trecho estava vazio.");
        content.hidden=false;loaded=true;
        btn.textContent="▤ Recolher texto original de Reich ↑";
        note.textContent="Trecho da edição que você importou · «"+ref.label+"». Comentários e perguntas aparecem fora desta caixa.";
      }catch(e){
        btn.textContent="▤ Tentar abrir o texto original ↘";
        notify(e.message||"Não foi possível extrair este trecho do EPUB.");
      }finally{btn.disabled=false;}
    });
    return shell;
  }
  function rememberLocation(loc){
    if(!loc||!loc.start)return;
    if(loc.start.cfi){state.cfi=loc.start.cfi;persist();}
    if(book){
      try{
        const p=book.locations.percentageFromCfi(loc.start.cfi);
        if(Number.isFinite(p)){bookPercent=Math.min(1,Math.max(0,p));updateProgress();}
      }catch(e){}
      try{
        const sp=book.spine.get(loc.start.href);const idx=sp&&sp.index;
        if(Number.isFinite(idx)){
          let next=state.chapter;
          chapterSpines.forEach((n,i)=>{if(Number.isFinite(n)&&n<=idx)next=i;});
          if(next!==state.chapter && !restoring){state.chapter=next;renderGuide();}
        }
      }catch(e){}
    }
    const disp=loc.start.displayed;
    $("pageStatus").textContent=disp&&disp.total?"Página "+disp.page+" de "+disp.total:"Posição salva";
  }
  function addHighlight(cfi,contents){
    const text=((contents&&contents.window&&contents.window.getSelection&&contents.window.getSelection().toString())||"").trim();
    if(!text||text.length<2)return;
    if(state.highlights.some(x=>x.cfi===cfi))return;
    const id=Date.now()+"-"+Math.floor(Math.random()*1e6);
    state.highlights.push({id:id,chapter:state.chapter,cfi:cfi,text:text.slice(0,1200),note:"",created:new Date().toISOString()});
    try{rendition.annotations.highlight(cfi,{id:id},null,"reich-mark",{"fill":"#d5a849","fill-opacity":"0.37"});}catch(e){}
    try{contents.window.getSelection().removeAllRanges();}catch(e){}
    persist();renderHighlights();notify("Trecho destacado. Você pode comentá-lo no Caderno.");
  }
  function applyTheme(){
    document.body.classList.toggle("dark",state.theme==="dark");
    $("lightMode").classList.toggle("active",state.theme!=="dark");
    $("darkMode").classList.toggle("active",state.theme==="dark");
    if(rendition)try{rendition.themes.select(state.theme==="dark"?"reich-dark":"reich-light");}catch(e){}
    persist();
  }
  function applyFont(){
    $("fontLabel").textContent=state.font+"%";
    $("interactiveFontLabel").textContent=state.font+"%";
    document.documentElement.style.setProperty("--reader-scale",String(state.font/100));
    if(rendition)try{rendition.themes.fontSize(state.font+"%");}catch(e){}
    persist();
  }
  async function bootReader(bytes,restore){
    if(typeof window.ePub!=="function")throw new Error("O leitor ePub.js não carregou. Verifique a conexão com a internet.");
    restoring=true;
    const intendedMode=state.mode;
    showReader();
    setReadingMode("original");
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(rendition){try{rendition.destroy();}catch(e){}}
    if(book){try{book.destroy();}catch(e){}}
    $("reader").textContent="";
    $("readerCaption").textContent="LEITURA DO TEXTO ORIGINAL";
    $("pageStatus").textContent="Preparando páginas…";
    book=window.ePub(bytes);
    await book.ready;
    const nav=await book.loaded.navigation;
    toc=nav.toc||[];
    renderToc();mapChapters();
    rendition=book.renderTo("reader",{width:"100%",height:"100%",flow:"paginated",spread:"none",allowScriptedContent:false});
    rendition.themes.register("reich-light",{body:{"background":"#fffef9","color":"#25362e","font-family":"Georgia, serif","line-height":"1.8"},p:{"line-height":"1.8"}});
    rendition.themes.register("reich-dark",{body:{"background":"#26352e","color":"#e9eee6","font-family":"Georgia, serif","line-height":"1.8"},p:{"line-height":"1.8"}});
    rendition.on("relocated",rememberLocation);
    rendition.on("selected",addHighlight);
    state.highlights.forEach(h=>{try{rendition.annotations.highlight(h.cfi,{id:h.id},null,"reich-mark",{"fill":"#d5a849","fill-opacity":"0.37"});}catch(e){}});
    applyTheme();applyFont();
    let target=restore&&state.cfi?state.cfi:chapterHrefs[state.chapter]||undefined;
    try{await rendition.display(target);}catch(e){await rendition.display();}
    showReader();renderGuide();restoring=false;setReadingMode(intendedMode);notify("Livro integral disponível para leitura neste dispositivo.");
    setTimeout(()=>{if(book)book.locations.generate(1200).then(()=>{const current=rendition.currentLocation();if(current)rememberLocation(current);}).catch(()=>{});},800);
  }
  async function receiveEpub(file){
    if(!file)return;
    if(!/\.epub$/i.test(file.name)){notify("Selecione um arquivo EPUB (.epub).");return;}
    $("importBtnText").textContent="Abrindo…";
    try{
      const bytes=await file.arrayBuffer();
      if(state.filename&&state.filename!==file.name){
        state.cfi=null;state.highlights=[];bookPercent=0;notify("Novo livro detectado: a posição de leitura foi reiniciada.");
      }
      state.filename=file.name;state.seen=true;
      await bootReader(bytes,false);
      try{await saveBook(bytes);}catch(e){notify("EPUB aberto, mas o navegador não permitiu guardá-lo para a próxima visita.");}
      persist();
    }catch(e){console.error(e);showReader();showEmptyBook();notify("Falha ao ler EPUB: "+(e&&e.message?e.message:"arquivo incompatível"));}
    finally{$("importBtnText").textContent="Trocar EPUB";$("epubInput").value="";}
  }
  function setTab(tab){
    ["guide","practice","cards","notes"].forEach(k=>{
      $(k+"Pane").hidden=k!==tab;
      const el=document.querySelector('[data-tab="'+k+'"]');el.classList.toggle("active",k===tab);el.setAttribute("aria-selected",String(k===tab));
    });
  }
  function exportData(){
    const out={app:"circulo-reich",version:1,exportedAt:new Date().toISOString(),state:state};
    const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="circulo-reich-estudos-"+new Date().toISOString().slice(0,10)+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    notify("Seu backup de estudos foi exportado. O EPUB não é incluído.");
  }
  async function importData(file){
    if(!file)return;
    try{
      const obj=JSON.parse(await file.text());
      if(obj.app!=="circulo-reich"||!obj.state||!Array.isArray(obj.state.highlights))throw new Error("Formato inválido");
      const copy=Object.assign({},defaults,obj.state);
      copy.chapter=Math.max(0,Math.min(studies.length-1,Number(copy.chapter)||0));
      copy.font=Math.max(85,Math.min(145,Number(copy.font)||100));
      state=copy;applyTheme();applyFont();openChapter(state.chapter,true);notify("Anotações e progresso restaurados.");
    }catch(e){notify("Este arquivo não parece ser um backup válido do Círculo Reich.");}
    $("backupInput").value="";
  }
  function closeNav(){$("sidebar").classList.remove("open");$("backdrop").hidden=true;}
  function bind(){
    $("openNav").addEventListener("click",()=>{$("sidebar").classList.add("open");$("backdrop").hidden=false;});
    $("closeNav").addEventListener("click",closeNav);$("backdrop").addEventListener("click",closeNav);
    ["importBtn","heroImport"].forEach(id=>$(id).addEventListener("click",()=>$("epubInput").click()));
    $("heroExplore").addEventListener("click",()=>{setReadingMode("interactive");openChapter(state.chapter,false);});
    $("modeInteractive").addEventListener("click",()=>setReadingMode("interactive"));
    $("modeOriginal").addEventListener("click",()=>setReadingMode("original"));
    $("epubInput").addEventListener("change",e=>receiveEpub(e.target.files[0]));
    $("prevPage").addEventListener("click",()=>rendition?rendition.prev():notify("Importe o EPUB para ler o texto."));
    $("nextPage").addEventListener("click",()=>rendition?rendition.next():notify("Importe o EPUB para ler o texto."));
    $("prevChapter").addEventListener("click",()=>openChapter(state.chapter-1,true));
    $("nextChapter").addEventListener("click",()=>openChapter(state.chapter+1,true));
    $("completeChapter").addEventListener("click",()=>{const id=studies[state.chapter].id;state.completed[id]=!state.completed[id];persist();renderComplete();renderNav();renderInteractive();notify(state.completed[id]?"Capítulo marcado como estudado.":"Marcação retirada.");});
    $("chapterNotes").addEventListener("input",e=>{const s=studies[state.chapter];state.notes[s.id]=e.target.value;$("saveStatus").textContent="Salvando…";clearTimeout(noteTimer);noteTimer=setTimeout(()=>{persist();$("saveStatus").textContent="✓ Salvo neste navegador";},300);});
    $("debateToNotes").addEventListener("click",()=>{setTab("notes");$("chapterNotes").focus();});
    document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
    $("lightMode").addEventListener("click",()=>{state.theme="light";applyTheme();});
    $("darkMode").addEventListener("click",()=>{state.theme="dark";applyTheme();});
    $("readerFontMinus").addEventListener("click",()=>{state.font=Math.max(85,state.font-5);applyFont();});
    $("readerFontPlus").addEventListener("click",()=>{state.font=Math.min(145,state.font+5);applyFont();});
    $("fontMinus").addEventListener("click",()=>{state.font=Math.max(85,state.font-5);applyFont();});
    $("fontPlus").addEventListener("click",()=>{state.font=Math.min(145,state.font+5);applyFont();});
    $("exportBtn").addEventListener("click",exportData);
    $("backupBtn").addEventListener("click",()=>$("backupInput").click());
    $("backupInput").addEventListener("change",e=>importData(e.target.files[0]));
    window.addEventListener("keydown",e=>{if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.key==="ArrowRight"&&rendition){rendition.next();e.preventDefault();}if(e.key==="ArrowLeft"&&rendition){rendition.prev();e.preventDefault();}});
    window.addEventListener("resize",()=>{clearTimeout(resizing);resizing=setTimeout(()=>{try{rendition&&rendition.resize();}catch(e){}},220);});
  }
  async function init(){
    bind();renderNav();applyTheme();applyFont();setReadingMode(state.mode);
    if(state.seen){showReader();renderGuide();showEmptyBook();}else{showWelcome();}
    try{
      const bytes=await storedBook();
      if(bytes){await bootReader(bytes,true);$("importBtnText").textContent="Trocar EPUB";}
    }catch(e){if(state.seen)notify("Importe seu EPUB para retomar a leitura.");}
  }
  if ('serviceWorker' in navigator && location.protocol==='https:') {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  init();
})();