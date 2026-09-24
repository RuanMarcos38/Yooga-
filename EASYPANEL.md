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
