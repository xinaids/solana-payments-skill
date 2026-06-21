// Verbatim from skill/transaction-requests.md
import { Connection, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferCheckedInstruction, getMint } from '@solana/spl-token';

interface Order { splToken: string; recipient: string; amount: number; reference: string; number: string; }

async function handlePost(account: string, order: Order, rpcUrl?: string) {
  const payer = new PublicKey(account);
  const connection = new Connection(rpcUrl ?? clusterApiUrl('mainnet-beta'), 'confirmed');
  const mint = new PublicKey(order.splToken);
  const merchant = new PublicKey(order.recipient);
  const { decimals } = await getMint(connection, mint);
  const payerAta = await getAssociatedTokenAddress(mint, payer);
  const merchantAta = await getAssociatedTokenAddress(mint, merchant);
  const baseUnits = BigInt(Math.round(order.amount * 10 ** decimals));
  const ix = createTransferCheckedInstruction(payerAta, mint, merchantAta, payer, baseUnits, decimals);
  ix.keys.push({ pubkey: new PublicKey(order.reference), isSigner: false, isWritable: false });
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight });
  tx.add(ix);
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return { transaction: serialized.toString('base64'), message: `Pedido #${order.number}` };
}

export { handlePost };
