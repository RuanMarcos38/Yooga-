# Delivery — localização em tempo real (Google Maps)

Melhoria isolada na branch de rastreamento; o fluxo existente de pedidos e as credenciais não são modificados.

## Utilização

### Fluxo do estabelecimento e do motoboy

- Crie um pedido em **Novo delivery**. Pedidos já entregues não são reabertos nem geram novos acessos.
- Abra **Preparar entrega / Motoboy e GPS**, informe destinatário, endereço e referência. Nome e telefone do motoboy podem ser preenchidos aqui ou por ele no celular.
- Salve para gerar links separados e QR codes. Compartilhe manualmente o acesso do motoboy somente com o responsável. O cliente recebe o acesso de acompanhamento.
- Alterar nome ou telefone do motoboy pela administração revoga os acessos anteriores, remove o GPS antigo e gera novos links que devem ser compartilhados novamente. A atualização dos próprios dados pelo motoboy mantém seu acesso.
- Use **Despachar** para liberar o pedido (`Pronto`). No painel do motoboy, confirme nome e telefone e toque em **Iniciar rota e compartilhar GPS**. O endereço deve estar cadastrado. O primeiro GPS aceito registra o início da rota.
- O motoboy pode abrir a rota no Google Maps e, após o recebimento, escolher **Finalizar entrega** e **Confirmar entrega recebida**. Isso marca o pedido como `Entregue`, registra a ação e remove o GPS. Não registra pagamento ou movimentação de caixa.
- Telefone, destinatário, endereço e referência são retornados somente à administração e ao link ativo do motoboy. O link do cliente recebe apenas identificação/status do pedido, nome do motoboy e GPS. Os links expiram em 24 horas.
- Dados da entrega ficam na coleção separada de tracking, sem migração dos pedidos existentes. Nenhuma localização é criada por endereço ou simulada em produção.


1. No TAPFOOD, entre em **Delivery**, abra **Google Maps · Rastrear entrega** no pedido e clique **Ativar rastreamento**.
2. Copie **link do cliente** e envie ao comprador, por WhatsApp ou outro canal.
3. Envie **link do entregador** somente à pessoa responsável pela entrega (ele permite enviar GPS e não deve ser divulgado ao cliente).
4. Ao passar o pedido para status **Pronto** (liberado para entrega), o entregador abre o próprio link **em HTTPS**, permite o uso de localização e toca em **Iniciar compartilhamento do GPS**.
5. O cliente acompanha a posição recebida, atualizada automaticamente em intervalos de aproximadamente 10 segundos; o administrador também pode visualizar.
6. Ao alterar o status para **Entregue**, **Finalizado** ou **Cancelado**, o sistema interrompe o rastreamento e remove as coordenadas persistidas. O administrador também pode clicar **Encerrar rastreamento**.

## Google Maps dentro da tela

A API **Google Maps Embed API** requer uma chave pública de navegador. Adicione **somente** `VITE_GOOGLE_MAPS_EMBED_KEY` como build arg do frontend no EasyPanel e habilite a Maps Embed API no Google Cloud. Restrinja a chave aos domínios do TAPFOOD via HTTP referrers e à Maps Embed API; jamais utilize uma chave administrativa não restrita. **Não edite ou substitua outras variáveis de ambiente**.

No build Docker, o ARG opcional `VITE_GOOGLE_MAPS_EMBED_KEY` será utilizado apenas pela interface; a chave de uma API de mapas para navegador é visível aos clientes por definição. Faça o deploy após configurar a variável. Sem ela, o link oficial **Abrir no Google Maps** permite visualizar a posição, mas não aparece mapa incorporado.

Fontes oficiais:
- https://developers.google.com/maps/documentation/embed/embedding-map
- https://developers.google.com/maps/documentation/urls/get-started

## Limitações e segurança

- Geolocalização real depende da permissão do entregador, GPS, HTTPS e conexão. Não existem coordenadas simuladas.
- Navegadores mobile podem suspender rastreamento em segundo plano ou tela bloqueada. Para operação contínua em background seria necessário app mobile nativo com autorização adequada.
- Links de rastreamento usam assinatura HMAC derivada da chave de sessão já existente, expiram após 24 horas e são individualizados por empresa, unidade e pedido.
- O link do cliente mostra somente número do pedido, status e posição durante a entrega. Ele não permite modificar o pedido nem atualizar GPS.
- O mapa informa quando a última posição está desatualizada. Não há previsão estimada de chegada, integração com frota/marketplaces ou acompanhamento quando o entregador não compartilhar localização.
- A localização fica armazenada numa coleção própria de tracking, sem sobrescrever dados de pedidos, caixa, usuários ou credenciais.

## Validação

Execute `npm run build`, `npm run backend:build` e `node delivery-tracking-test.mjs` em ambiente de teste isolado; as regressões existentes permanecem obrigatórias.
