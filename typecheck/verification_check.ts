// Verbatim from skill/verification.md
import { generateKeyPairSigner, createSolanaRpc, address, createSolanaRpcSubscriptions } from '@solana/kit';
import { findReference, validateTransfer, watchReference, FindReferenceError, ValidateTransferError } from '@solana/pay';

interface Order { id: string; reference: string; recipient: string; amount: number; splToken?: string; }

const rpc = createSolanaRpc('https://api.devnet.solana.com');

async function newReference() {
  const referenceSigner = await generateKeyPairSigner();
  return referenceSigner.address;
}

async function verifyOrder(order: Order): Promise<{ status: 'paid'; signature: string } | { status: 'pending' }> {
  const reference = address(order.reference);
  let signatureInfo;
  try {
    signatureInfo = await findReference(rpc, reference, { commitment: 'confirmed' });
  } catch (err) {
    if (err instanceof FindReferenceError) return { status: 'pending' };
    throw err;
  }
  try {
    await validateTransfer(rpc, signatureInfo.signature, {
      recipient: address(order.recipient),
      amount: Number(order.amount),
      splToken: order.splToken ? address(order.splToken) : undefined,
      reference,
    }, { commitment: 'confirmed' });
  } catch (err) {
    if (err instanceof ValidateTransferError) return { status: 'pending' };
    throw err;
  }
  return { status: 'paid', signature: signatureInfo.signature };
}

const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com');
async function watchForPayment(reference: string) {
  const controller = new AbortController();
  try {
    return await watchReference(rpcSubscriptions, address(reference), { commitment: 'confirmed', abortSignal: controller.signal });
  } catch (err) {
    if (err instanceof FindReferenceError) return null;
    throw err;
  }
}

export { newReference, verifyOrder, watchForPayment };
