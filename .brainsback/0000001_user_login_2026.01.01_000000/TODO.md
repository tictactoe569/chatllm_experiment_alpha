# Strategic Blueprint

> Focus on the **what** and **why**. The code will follow.

**Hard rule**: AI agents must not edit this file and must not draft paste-ready content for it.

## The Problem
É ncessário  permitir que o usuário possa se registrar na aplicação, ou seja, criar uma conta com os dados requisitados. Ele deve ser capaz de fazer o login para acessar os dados de sua conta e sessões anteriores. Também deve ser possível que ele possar fazer logout. Seu dados de login devem ser persistidos de forma segura. Deve se levar em consideração questões como: como validar a sessão, como armazenar senha, requisitos para autemticação, entre outros.

## Steps
Para uma nova implementação:
- [ ] Compreender a estrutura atual do projeto
- [ ] Montar um plano de ação, ou seja, definir quais arquivos deverem ser incrementados ou criados

Para implementar login e logout:

*Backend
- [ ] Em models.py, criar um novo modelo User
- [ ] Em backend/schemas/auth.py, criar os schemas de autenticação: userCreate, userLogin e userResponse
- [ ] Em backend/routers/auth.py, criar os seguintes endpoints de auth: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, /api/auth/me
- [ ] Em main.py, registrar nova rota

*Frontend
- [ ] Em frontend/src/auth.jsx, criar tela de login/cadastro
- [ ] Em App.jsx, gerenciar estado de auth
- [ ] Em api.js, criar as novas funções login e logout como: register(...), login(...) e logout(...)
- [ ] Em main.py, registrar nova rota

## Success Looks Like

Usuário efetua login:

Happy path
- [ ] Endpoint retorna 200 ok e é exibido um feedback visual positivo para o usuário.

Unhappy path
- [ ] Endpoint retorna código de erro, o qual é interpretado pelo backend e um feedback visual é exbido indicando se o usuário informou uma senha incorreta ou se usário não está registrado.

## Notes
- [ ] Pode-se considerar utlizar bcrypt (pacote python) para senha + token simples (uuid gerado na hora) guardado em localStorage + Depends() de verificação nas rotas.

---
**⚠️ HUMAN ONLY**: This file is your strategic space. AI agents must not edit it.
