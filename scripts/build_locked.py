#!/usr/bin/env python3
"""Publica somente conteúdo cifrado. A senha é gerada e entregue fora do site."""
import base64
import json
import os
import re
import secrets
import sys
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

source = Path(sys.argv[1] if len(sys.argv) > 1 else "fonte-privada/conteudo/original")
dest = Path(sys.argv[2] if len(sys.argv) > 2 else "book.lock")
parts = sorted(source.glob("parte-*.txt"))
if len(parts) != 11:
    raise SystemExit(f"Esperadas 11 partes na fonte privada, obtidas {len(parts)}.")
text = "".join(p.read_text(encoding="utf-8") for p in parts)

pat = re.compile(r"(?m)^Capitulo (XIII|XII|XI|VIII|VII|VI|IV|IX|III|II|X|V|I) - (.+)$")
matches = list(pat.finditer(text))
real = matches[:13]
if len(real) != 13 or [m.group(1) for m in real] != [
    "I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII"
]:
    raise SystemExit("Índice original incompatível com os 13 capítulos esperados. Operação abortada.")
chapters=[]
for i,m in enumerate(real):
    last=matches[i+1].start() if i+1 < 13 else matches[13].start() if len(matches)>13 else len(text)
    section=text[m.end():last].strip()
    if len(section)<1000: raise SystemExit("Capítulo de comprimento inesperado.")
    chapters.append({"n":i+1,"title":m.group(2).strip(),"text":section})

payload={"title":"Psicologia de Massas do Fascismo","author":"Wilhelm Reich","source":"Edição fornecida pelo usuário","chapters":chapters}
plain=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf-8")

password=secrets.token_urlsafe(25)
salt=os.urandom(16)
iv=os.urandom(12)
iterations=360_000
key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=iterations).derive(password.encode("utf-8"))
encrypted=AESGCM(key).encrypt(iv,plain,b"circulo-reich-v1")
b64=lambda data:base64.b64encode(data).decode("ascii")
dest.write_text(json.dumps({"format":"reich-aes256-gcm-v1","iterations":iterations,"salt":b64(salt),"iv":b64(iv),"data":b64(encrypted)},separators=(",",":")),encoding="utf-8")

secret_file=Path("senha-circulo-reich.txt")
secret_file.write_text(
    "CÍRCULO REICH — SENHA PARTICULAR\n\n"
    "Digite esta senha na tela do aplicativo:\n\n"
    f"{password}\n\n"
    "GUARDE ESTA SENHA. Ela não está salva no site nem no repositório.\n"
    "O livro é armazenado como texto cifrado (AES-256-GCM); a senha desbloqueia somente no seu navegador.\n"
    "Se a senha for perdida, é necessário gerar e publicar novamente o pacote criptografado.\n",encoding="utf-8"
)
os.chmod(secret_file,0o600)
print(f"Pacote cifrado gerado: {len(plain)} bytes originais, {len(chapters)} capítulos.")
print("Senha guardada em artefato privado; não será impressa no log.")
