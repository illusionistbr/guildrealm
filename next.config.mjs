import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl({
  // firebase-admin (via jwks-rsa -> jose ESM) quebra quando empacotado
  // no bundle serverless (ERR_REQUIRE_ESM em produção). Como pacote
  // externo, é carregado via require() em runtime — igual ao `next dev`.
  serverExternalPackages: ['firebase-admin'],
});
