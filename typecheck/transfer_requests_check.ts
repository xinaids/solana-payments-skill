// Verbatim from skill/transfer-requests.md
import { encodeURL, createQR, parseURL } from '@solana/pay';
import { address, generateKeyPairSigner } from '@solana/kit';

async function build() {
  const recipient = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const referenceSigner = await generateKeyPairSigner();
  const reference = referenceSigner.address;
  const USDC = address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  return encodeURL({ recipient, amount: 4.20, splToken: USDC, reference, label: 'Loja', message: 'Pedido #1042' });
}

function parse(url: string) {
  const parsed = parseURL(url);
  if ('recipient' in parsed) {
    const { recipient, amount, splToken, reference, label, message, memo } = parsed;
    return { kind: 'transfer' as const, recipient, amount, splToken, reference, label, message, memo };
  }
  const { link, label, message } = parsed;
  return { kind: 'transaction' as const, link, label, message };
}

export { build, parse };
