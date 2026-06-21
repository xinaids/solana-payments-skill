// Verbatim from skill/kit-interop.md
import { PublicKey } from '@solana/web3.js';
import { createSolanaRpc, address } from '@solana/kit';
import { findReference } from '@solana/pay';

function legacyPubkeyToKitAddress(pk: PublicKey) {
  return address(pk.toBase58());
}

async function run(orderReference: string, rpcUrl: string) {
  const rpc = createSolanaRpc(rpcUrl);
  return await findReference(rpc, address(orderReference), { commitment: 'confirmed' });
}

export { legacyPubkeyToKitAddress, run };
