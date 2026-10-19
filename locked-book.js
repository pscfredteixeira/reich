/* O texto original é decifrado exclusivamente na memória deste dispositivo.
   A senha nunca é enviada ao servidor ou guardada em localStorage. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const b64bytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 let packageData=null;
 window.REICH_FULL_BOOK=null;
 async function initialize(){
   const area=$("lockArea");
   if(!area)return;
   try{
     const response=await fetch("./book.lock",{cache:"no-store"});
     if(!response.ok)return;
     const pack=await response.json();
     if(pack.format!=="reich-aes256-gcm-v1")return;
     packageData=pack;area.hidden=false;
     $("lockStatus").textContent="O texto integral está disponível, protegido por criptografia. Digite sua senha particular.";
   }catch(e){/* A versão importável do EPUB segue funcionando. */}
 }
 async function unlock(password){
   if(!packageData)throw new Error("O pacote protegido não está disponível.");
   if(!password)throw new Error("Digite sua senha.");
   const encoder=new TextEncoder();
   const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveKey"]);
   const key=await crypto.subtle.deriveKey(
     {name:"PBKDF2",salt:b64bytes(packageData.salt),iterations:packageData.iterations,hash:"SHA-256"},
     material,{name:"AES-GCM",length:256},false,["decrypt"]
   );
   const decrypted=await crypto.subtle.decrypt(
     {name:"AES-GCM",iv:b64bytes(packageData.iv),additionalData:encoder.encode("circulo-reich-v1")},
     key,b64bytes(packageData.data)
   );
   const book=JSON.parse(new TextDecoder("utf-8").decode(decrypted));
   if(!book||!Array.isArray(book.chapters)||book.chapters.length!==13)throw new Error("Pacote inválido.");
   return book;
 }
 window.addEventListener("DOMContentLoaded",()=>{
   initialize();
   const input=$("lockPassword"),button=$("unlockBook"),reset=$("lockReset");
   const form=$("unlockForm");
   form.addEventListener("submit",async e=>{
     e.preventDefault();button.disabled=true;button.textContent="Desbloqueando…";
     $("lockError").textContent="";
     try{
       window.REICH_FULL_BOOK=await unlock(input.value);
       input.value="";
       form.hidden=true;reset.hidden=false;
       $("lockStatus").textContent="✓ Livro integral desbloqueado neste navegador.";
       window.dispatchEvent(new CustomEvent("reich-unlocked"));
     }catch(err){
       $("lockError").textContent="Senha incorreta ou arquivo danificado. Confira sua senha e tente novamente.";
     }finally{button.disabled=false;button.textContent="Abrir meu livro";}
   });
   reset.addEventListener("click",()=>{
     window.REICH_FULL_BOOK=null;
     $("lockStatus").textContent="O livro foi bloqueado novamente.";
     reset.hidden=true;form.hidden=false;
     window.dispatchEvent(new CustomEvent("reich-unlocked"));
   });
 });
})();