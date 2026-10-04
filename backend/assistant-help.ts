// Local guidance stays available without an external AI provider.
export function assistantHelp(message: string, customer: boolean): string {
  const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (customer) {
    if (/caixa|financeiro|estoque|crm|relatorio|configur|custo|margem|administr|outra.*mesa/.test(text)) {
      return 'Essas informações são restritas ao estabelecimento. Fale com a equipe para receber ajuda. Posso orientar sobre seu pedido, chamar o garçom ou solicitar a conta.';
    }
    if (/garcom|atendimento/.test(text)) return 'Na tela da sua mesa, toque em Chamar garçom. A equipe receberá a solicitação. Aguarde o atendimento; esta conversa não envia o chamado.';
    if (/conta|pagamento|pagar|pix|cartao|dinheiro/.test(text)) return 'Na tela da sua mesa, use Solicitar conta e escolha uma forma de pagamento disponível. A equipe confirma o fechamento. Esta conversa não solicita a conta nem confirma pagamentos.';
    if (/pedido|status|acompanhar|entreg|pronto|demora/.test(text)) return 'Abra a área de pedidos da sua mesa para acompanhar os itens e o status: Novo, Preparando, Pronto ou Entregue. Entregue significa que o pedido saiu da cozinha; ele permanece na mesa até o fechamento. Para confirmar prazo ou entrega, fale com a equipe.';
    if (/notific/.test(text)) return 'Use a opção de notificações na tela da sua mesa e permita as notificações quando o navegador perguntar. Se estiverem bloqueadas, consulte as permissões do site no navegador.';
    return 'Posso orientar sobre acompanhar seu pedido, chamar o garçom, solicitar a conta e ativar notificações. Qual desses assuntos você precisa?';
  }
  if (/test|diagnostic|erro|funciona/.test(text)) return 'Abra Suporte / Testes, escolha Testar Sistema e execute Teste completo. As verificações são somente leitura. Elas analisam a consistência dos dados e configurações; não garantem entrega de mensagens, impressão física ou funcionamento de serviços externos.';
  if (/caixa/.test(text)) return 'Entre em Histórico / Caixa. Para abrir, use Abrir caixa e informe o valor de abertura. Para fechar, use Fechar caixa e confirme após conferir as movimentações. O Dashboard também tem acesso ao caixa. Esta conversa apenas orienta e não altera o caixa.';
  if (/foto|imagem/.test(text) && /produto|cardapio|cadastr/.test(text)) return 'Abra Produtos ou Montar cardápio, cadastre ou edite o produto e use o campo de imagem para enviar a foto. Confira nome, categoria, preço e disponibilidade e salve. Depois confira o produto no cardápio.';
  if (/mesa/.test(text)) return 'Abra Mesas e selecione a mesa desejada. Adicione os produtos e salve o pedido. A mesa fica Ocupada durante o atendimento e passa para Fechamento depois da entrega do último pedido. Após conferir a conta, altere a mesa para Livre para encerrar o atendimento.';
  if (/cozinha|kds|prepar|entreg|status/.test(text)) return 'Abra Cozinha / KDS, localize o pedido e avance o status conforme a operação: Novo → Preparando → Pronto → Entregue. Entregue encerra o preparo, mas a conta da mesa continua aberta até o fechamento.';
  if (/pedido|pdv/.test(text)) return 'Abra Pedidos / PDV, selecione o canal e a mesa quando aplicável, adicione produtos e quantidades, escolha a forma de pagamento e use Finalizar pedido. Confira o pedido em Cozinha / KDS.';
  if (/produto|cardapio/.test(text)) return 'Abra Produtos para cadastrar ou editar um produto. Em Montar cardápio, organize categorias, preços, imagens e canais disponíveis. Salve e confira o resultado no cardápio.';
  if (/estoque/.test(text)) return 'Abra Estoque, localize o item e confira a quantidade e o mínimo. Use o ajuste de estoque para registrar a movimentação. Confira o saldo após salvar.';
  if (/financeiro/.test(text)) return 'Abra Financeiro para consultar entradas e saídas e registrar lançamentos. Confira descrição, tipo e valor antes de salvar.';
  if (/cliente|crm/.test(text)) return 'Abra Clientes / CRM para consultar o cadastro e histórico comercial. Ao cadastrar um cliente, informe nome e telefone válidos e confira os dados antes de salvar.';
  if (/relatorio/.test(text)) return 'Abra Relatórios para consultar os indicadores da operação. Confira os filtros e o período antes de interpretar os totais.';
  if (/integrac|api|n8n|impressor/.test(text)) return 'Abra Configurações e acesse a integração ou impressão desejada. Confira a configuração e depois use Testar Sistema → Integrações ou API Aberta. Esse diagnóstico não testa impressão física nem transações reais com parceiros.';
  return 'Posso orientar sobre Mesas, Pedidos / PDV, Cozinha / KDS, Histórico / Caixa, Produtos, Estoque, Financeiro e testes do sistema. Diga o módulo e o que deseja fazer. Esta conversa não executa alterações.';
}
