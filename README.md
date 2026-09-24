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

## Estrutura

- `src/` — frontend
- `backend/` — API e persistência
- `tests/` — testes de fluxo
