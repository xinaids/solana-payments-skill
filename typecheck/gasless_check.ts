// Verbatim from skill/gasless.md
import { Connection, PublicKey, Transaction, Keypair, TransactionInstruction } from '@solana/web3.js';
import { KoraClient } from '@solana/kora';

declare const SPONSOR_SECRET: Uint8Array;
declare const transferIx: TransactionInstruction;
declare const blockhash: string;
declare const lastValidBlockHeight: number;

function buildSponsored() {
  const sponsor = Keypair.fromSecretKey(SPONSOR_SECRET);
  const tx = new Transaction({ feePayer: sponsor.publicKey, blockhash, lastValidBlockHeight });
  tx.add(transferIx);
  tx.partialSign(sponsor);
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

async function sponsorSignViaKora(base64Transaction: string) {
  const kora = new KoraClient({ rpcUrl: process.env.KORA_RPC_URL! });
  return await kora.signTransaction({ transaction: base64Transaction });
}

export { buildSponsored, sponsorSignViaKora };
