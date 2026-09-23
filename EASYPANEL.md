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

## Observações

- O backend grava dados e imagens em `/data`; por isso o volume persistente é obrigatório.
- As imagens enviadas no cardápio ficam disponíveis em `/uploads/...` no domínio do backend.
- A API aberta continua protegida por `x-api-key`, criada em `Configurações > API Aberta`.
