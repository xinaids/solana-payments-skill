// Verbatim from skill/stablecoins.md
import { fetchMint } from '@solana-program/token';
import { createSolanaRpc, address } from '@solana/kit';
import { getMint } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

async function getDecimalsKit(mintAddress: string) {
  const rpc = createSolanaRpc('https://api.devnet.solana.com');
  const mintAccount = await fetchMint(rpc, address(mintAddress));
  return mintAccount.data.decimals;
}

async function getDecimalsWeb3(connection: Connection, mintPubkey: PublicKey) {
  const mintInfo = await getMint(connection, mintPubkey);
  return mintInfo.decimals;
}

export { getDecimalsKit, getDecimalsWeb3 };
