# Deploy no EasyPanel

Este projeto agora está preparado para rodar em dois serviços separados no EasyPanel: frontend e backend.

## Backend

- Tipo: Dockerfile
- Dockerfile: `Dockerfile.backend`
- Porta interna: `80`
- Domínio sugerido: `https://api.tapfood.com.br`
- Volume persistente: `/data`

Variáveis:

```env
PORT=80
DATA_DIR=/data
PUBLIC_API_URL=https://api.tapfood.com.br
CORS_ORIGIN=https://tapfood.com.br,https://www.tapfood.com.br
```

Integrações reais opcionais do backend:

```env
TAPFOOD_GA_MEASUREMENT_ID=G-SEU_ID_REAL
TAPFOOD_META_PIXEL_ID=SEU_PIXEL_ID_REAL
TAPFOOD_WEBHOOK_URL=https://seu-webhook-real
TAPFOOD_WEBHOOK_SECRET=segredo-para-assinar-eventos
TAPFOOD_META_CAPI_ACCESS_TOKEN=token-oficial-meta-capi
```

`TAPFOOD_GA_MEASUREMENT_ID` e `TAPFOOD_META_PIXEL_ID` são IDs públicos usados pelo frontend para carregar GA4 e Meta Pixel. `TAPFOOD_WEBHOOK_URL`, `TAPFOOD_WEBHOOK_SECRET` e `TAPFOOD_META_CAPI_ACCESS_TOKEN` devem ficar somente no ambiente do backend.

Também é possível preencher o ID GA4, o Pixel ID e o webhook n8n pela Central de Integrações da plataforma. Ao clicar em `Testar conexão`, o backend salva os campos informados e só marca a integração como `Ativo` quando a validação passa; no n8n, esse teste envia um ping real para a URL configurada. Segredos, tokens e chaves privadas continuam fora da tela e devem ser mantidos como variáveis de ambiente no EasyPanel.

Healthcheck:

```text
/api/_healthcheck
```

## Frontend

- Tipo: Dockerfile
- Dockerfile: `Dockerfile.frontend`
- Porta interna: `80`
- Domínio sugerido: `https://tapfood.com.br` e `https://www.tapfood.com.br`

Variável de ambiente do serviço frontend:

```env
VITE_API_BASE_URL=https://api.tapfood.com.br
```

O Dockerfile também aceita esse valor como build argument, mas a variável de ambiente em runtime já é suficiente no EasyPanel.

Se preferir publicar o backend em outro subdomínio, use esse endereço em `VITE_API_BASE_URL`, `PUBLIC_API_URL` e `CORS_ORIGIN`.

## Deploy automático pelo GitHub

Há duas formas seguras de fazer o EasyPanel atualizar automaticamente quando a branch `main` receber mudanças no GitHub.

### Opção recomendada: Auto Deploy nativo do EasyPanel

Em cada serviço do EasyPanel, confirme que a origem está configurada como GitHub:

- Repositório: `RuanMarcos38/Yooga-`
- Branch: `main`
- Build path: `/`
- Backend: Dockerfile `Dockerfile.backend`
- Frontend: Dockerfile `Dockerfile.frontend`

Depois, entre em `Overview` no serviço e clique em `Enable Auto Deploy`. Faça isso nos dois serviços: backend e frontend.

### Opção alternativa: GitHub Actions com Deployment Trigger URL

Este repositório também inclui o workflow `.github/workflows/easypanel-deploy.yml`. Ele roda em todo push na branch `main` e chama os gatilhos de deploy do EasyPanel.

Para ativar:

1. No EasyPanel, abra o serviço backend e copie o `Deployment Trigger URL`.
2. No GitHub, abra `Settings > Secrets and variables > Actions > New repository secret`.
3. Crie o secret `EASYPANEL_BACKEND_DEPLOY_URL` com a URL do backend.
4. Repita o processo no serviço frontend e crie o secret `EASYPANEL_FRONTEND_DEPLOY_URL`.

Essas URLs contêm token secreto. Nunca coloque esses valores no código, README, issues ou commits.

## Observações

- O backend grava dados e imagens em `/data`; por isso o volume persistente é obrigatório.
- As imagens enviadas no cardápio ficam disponíveis em `/uploads/...` no domínio do backend.
- A API aberta continua protegida por `x-api-key`, criada em `Configurações > API Aberta`.
# Acesso administrativo

Antes de publicar em produção, configure `ADMIN_PASSWORD` no ambiente do serviço backend com uma senha forte. `ADMIN_EMAIL` é opcional e define o e-mail do administrador principal. A senha de demonstração não é aceita em produção.

As rotas internas e a interface administrativa exigem perfil `Administrador` ou `Super Admin`. Clientes, visitantes, gestores e operadores não têm acesso às informações internas. O portal da mesa usa respostas limitadas ao atendimento e o assistente público opera sempre no modo cliente.

Configure `AUTH_SECRET` com um segredo privado ou mantenha o volume persistente em `DATA_DIR`; na ausência dessa variável, o backend gera e persiste um segredo exclusivo para as sessões. Sessões antigas assinadas com o segredo público de demonstração deixam de funcionar e exigem novo login.

