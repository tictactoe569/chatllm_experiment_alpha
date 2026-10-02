# Strategic Blueprint

> Focus on the **what** and **why**. The code will follow.

**Hard rule**: AI agents must not edit this file and must not draft paste-ready content for it.

## The Problem
_State clearly what you are trying to achieve and the architectural constraints, avoiding implementation specifics of HOW to do it. Focus on WHAT and WHY._

Na tarefa 1, é necessario implementar um sistema de login e logout na aplicacao, com o objetivo de deixar privado os chats dos usuarios, ou seja, para que nenhum usuario acesse o chat que nao é o seu.

## Architecture

vou usar JWT Tokens como estrategia de segurança

## Data model

o modelo user deve ter os seguintes campos: login (que deve ser um nome de usuario) e senha.
a senha deve seguir as seguintes regras:
    1- mais de 8 caracteres
    2- ao menos uma letra maiuscula
    3- ao menos uma letra minuscula
    4- ao menos um numero
    5- ao menos um caracter especial

## Steps
- [ ] Criar um sistema de login em que o usuario tem que digitar seu nome de usuario e sua senha para conseguir ver seus chats
- [ ] Criar um sistema de logout em que, para o usuario rever seus chats, deve fazer login novamente

## Success Looks Like
- [ ] O usuario digitar a senha certa e conseguir acessar seus chats
- [ ] O sistema nao deve permitir dois usuarios com o mesmo nome
- [ ] O sistema nao permitir um usuario entrar com a senha errada
- [ ] O sistema nao permitir senhas que nao obedeçam todas as 5 regras impostas para a senha

## Notes
- [ ] _Any specific edge cases, libraries to consider, or potential pitfalls._

---
**⚠️ HUMAN ONLY**: This file is your strategic space. AI agents must not edit it.

