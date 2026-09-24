# TAPFOOD

SaaS completo para operação de restaurantes, desenvolvido com frontend React/Vite e backend persistente.

## Prévia online

https://tapfood.com.br/

## Layout

Interface inspirada na referência enviada: sidebar clara, busca e filtros no topo, categorias, catálogo de produtos em cards e painel de pedido/pagamento à direita.

## Módulos

- Dashboard e PDV
- Mesas
- Cozinha / KDS
- Delivery
- Produtos
- Estoque com movimentação
- Financeiro com lançamentos
- Clientes / CRM
- Relatórios
- Configurações persistentes

## Backend

Rotas implementadas para estado do sistema, pedidos, produtos, mesas, clientes, estoque, financeiro e configurações.

## Deploy no EasyPanel

O projeto está pronto para publicar em dois serviços Docker no EasyPanel:

- Frontend: `Dockerfile.frontend`, porta interna `80`, domínio `https://tapfood.com.br`.
- Backend: `Dockerfile.backend`, porta interna `80`, domínio `https://api.tapfood.com.br`, volume persistente em `/data`.

No frontend, configure a variável `VITE_API_BASE_URL=https://api.tapfood.com.br`.
No backend, configure `PUBLIC_API_URL=https://api.tapfood.com.br`, `DATA_DIR=/data` e `CORS_ORIGIN=https://tapfood.com.br,https://www.tapfood.com.br`.

Veja o passo a passo completo em `EASYPANEL.md`.

### Deploy automático

O repositório inclui o workflow `.github/workflows/easypanel-deploy.yml` para acionar o deploy do EasyPanel quando houver push na branch `main`. Configure os secrets `EASYPANEL_BACKEND_DEPLOY_URL` e `EASYPANEL_FRONTEND_DEPLOY_URL` no GitHub com os `Deployment Trigger URL` de cada serviço.

## Estrutura

- `src/` — frontend
- `backend/` — API e persistência
- `tests/` — testes de fluxo
