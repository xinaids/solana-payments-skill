/**
 * solana-payments-skill — Devnet E2E Proof
 *
 * Demonstrates the full payment lifecycle against devnet:
 *   1. Generate a unique reference key (one per "order")
 *   2. Build a Solana Pay URL (encodeURL)
 *   3. Send a real SOL transfer with the reference attached (createTransfer)
 *   4. Locate the transaction by reference key (findReference)
 *   5. Validate recipient + amount + reference (validateTransfer)
 *
 * This is the exact flow documented in skill/verification.md, running
 * against real devnet — not just compiled, actually executed.
 *
 * Usage:
 *   cd demo
 *   npm install
 *   npx tsx devnet-e2e.ts
 */

import { readFileSync } from 'node:fs';
import {
  address,
  airdropFactory,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  devnet,
  generateKeyPairSigner,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  createTransactionMessage,
} from '@solana/kit';

import {
  encodeURL,
  findReference,
  validateTransfer,
  createTransfer,
  FindReferenceError,
  ValidateTransferError,
} from '@solana/pay';

// ─── config ─────────────────────────────────────────────────────────────────

const DEVNET_RPC_URL = process.env.DEVNET_RPC_OVERRIDE ?? 'https://api.devnet.solana.com';
const DEVNET_RPC = devnet(DEVNET_RPC_URL);
const DEVNET_WS  = DEVNET_RPC_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const PAYMENT_AMOUNT = 0.001; // 0.001 SOL — minimal, just to prove the flow

// ─── helpers ─────────────────────────────────────────────────────────────────

const ok   = (msg: string) => console.log(`  ✅ ${msg}`);
const info = (msg: string) => console.log(`  ℹ  ${msg}`);
const fail = (msg: string) => { console.error(`  ❌ ${msg}`); process.exit(1); };
const hr   = (title: string) => console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`);

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  hr('0 · Setup');

  const rpc              = createSolanaRpc(DEVNET_RPC);
  const rpcSubscriptions = createSolanaRpcSubscriptions(DEVNET_WS);
  const airdrop          = airdropFactory({ rpc });
  const sendAndConfirm   = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

  // payer = the "customer" funding this demo
  // Load from --keypair flag if provided (avoids airdrop rate limits)
  const keypairFlag = process.argv.indexOf('--keypair');
  let payer;
  if (keypairFlag !== -1 && process.argv[keypairFlag + 1]) {
    const keypairPath = process.argv[keypairFlag + 1];
    const secretKeyArray = JSON.parse(readFileSync(keypairPath, 'utf8')) as number[];
    payer = await createKeyPairSignerFromBytes(Uint8Array.from(secretKeyArray));
    info(`Loaded keypair from: ${keypairPath}`);
  } else {
    payer = await generateKeyPairSigner();
    info('No --keypair provided, will request airdrop …');
    await airdrop({
      recipientAddress: payer.address,
      lamports: lamports(100_000_000n),
      commitment: 'confirmed',
    });
    ok('Airdrop confirmed');
  }

  // merchant = the recipient of the payment (always fresh)
  const merchant = await generateKeyPairSigner();

  info(`Payer:    ${payer.address}`);
  info(`Merchant: ${merchant.address}`);

  // ── 1: Generate a unique reference key (one per order) ──────────────────
  hr('1 · Generate reference key');

  const referenceSigner = await generateKeyPairSigner();
  const reference       = referenceSigner.address;
  info(`Reference: ${reference}`);
  ok('Reference generated — would be persisted to DB with orderId before showing QR');

  // ── 2: Build the Solana Pay URL ─────────────────────────────────────────
  hr('2 · Build Solana Pay URL (encodeURL)');

  const url = encodeURL({
    recipient: merchant.address,
    amount:    PAYMENT_AMOUNT,    // plain number, UI units — NOT BigNumber
    reference,
    label:     'Demo Merchant',
    message:   'Order #demo-001 — devnet E2E proof',
  });
  ok(`URL built: ${url.toString().slice(0, 72)}…`);

  // ── 3: Send the payment ─────────────────────────────────────────────────
  hr('3 · Send payment (createTransfer → devnet)');

  info('Building transfer instructions via @solana/pay createTransfer …');
  const instructions = await createTransfer(rpc, payer, {
    recipient: merchant.address,
    amount:    PAYMENT_AMOUNT,
    reference,
  });

  const { value: latestBlockhash } = await rpc
    .getLatestBlockhash({ commitment: 'confirmed' })
    .send();

  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(payer, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions(instructions, tx),
  );

  const signedTx = await signTransactionMessageWithSigners(txMessage);

  info('Sending to devnet …');
  await sendAndConfirm(signedTx, { commitment: 'confirmed' });

  // Extract the transaction signature for display
  const txSig = Object.keys(
    (signedTx as { signatures: Record<string, unknown> }).signatures ?? {}
  )[0] ?? 'unknown';

  ok(`Transaction confirmed: ${txSig}`);
  info(`Explorer: https://explorer.solana.com/tx/${txSig}?cluster=devnet`);

  // ── 4: findReference ────────────────────────────────────────────────────
  hr('4 · Locate payment by reference (findReference)');
  info('Searching for transaction by reference key (no signature needed) …');

  let signatureInfo;
  for (let i = 1; i <= 12; i++) {
    try {
      signatureInfo = await findReference(rpc, reference, { commitment: 'confirmed' });
      break;
    } catch (e) {
      if (e instanceof FindReferenceError) {
        info(`Not indexed yet, retry ${i}/12 …`);
        await sleep(1500);
      } else throw e;
    }
  }

  if (!signatureInfo) fail('findReference: transaction not found after retries');
  ok(`Found transaction: ${signatureInfo!.signature}`);

  // ── 5: validateTransfer ─────────────────────────────────────────────────
  hr('5 · Validate payment (validateTransfer)');
  info('Checking recipient + amount + reference against chain …');

  try {
    await validateTransfer(
      rpc,
      signatureInfo!.signature,
      {
        recipient: merchant.address,
        amount:    PAYMENT_AMOUNT,      // plain number, UI units
        reference,
      },
      { commitment: 'confirmed' },
    );
  } catch (e) {
    if (e instanceof ValidateTransferError) {
      fail(`validateTransfer failed: ${(e as Error).message}`);
    }
    throw e;
  }

  ok('validateTransfer PASSED — recipient, amount, and reference all confirmed on-chain');

  // ── Summary ──────────────────────────────────────────────────────────────
  hr('✅ E2E PROOF COMPLETE');
  console.log(`
  encodeURL       → built a valid solana: URL with a unique reference
  createTransfer  → constructed the transfer instruction with reference attached
  devnet tx       → transaction confirmed on-chain
  findReference   → located the tx by reference key alone (no signature needed)
  validateTransfer→ confirmed recipient + amount + reference match

  This is the verification path from skill/verification.md running
  against real devnet — not just compiled, actually executed.

  Transaction: https://explorer.solana.com/tx/${txSig}?cluster=devnet
  `);
}

main().catch(e => { console.error('\n❌ Fatal error:', e); process.exit(1); });
