/**
 * Jito Block Engine Production Example
 *
 * Demonstrates:
 * 1) gRPC authentication
 * 2) building Solana transactions
 * 3) adding priority fees
 * 4) adding Jito tip
 * 5) bundle submission
 */

import Client from "@triton-one/yellowstone-grpc";
import {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import fs from "fs";

// ----------------------------------
// Load gRPC Auth Key
// ----------------------------------

const authKeypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync("./jito-grpc-keypair.json"))
  )
);

// ----------------------------------
// Initialize Jito gRPC Client
// ----------------------------------

const client = new Client(
  "https://block-engine.mainnet.jito.wtf",
  undefined,
  {
    "x-jito-auth": authKeypair.publicKey.toBase58()
  }
);

// ----------------------------------
// Solana RPC Connection
// ----------------------------------

const connection = new Connection(
  clusterApiUrl("mainnet-beta"),
  "confirmed"
);

// ----------------------------------
// Trading Keypair
// ----------------------------------

const trader = Keypair.generate();

// ----------------------------------
// Jito Tip Account (example)
// ----------------------------------

const JITO_TIP_ACCOUNT =
  "96gYZGLnJYVFmbjzopPSXcL1H9sF3pF2pQ4wJ9Vv9P8M";

// ----------------------------------
// Build Transaction
// ----------------------------------

async function buildTransaction() {

  const { blockhash } = await connection.getLatestBlockhash();

  const tx = new Transaction({
    feePayer: trader.publicKey,
    recentBlockhash: blockhash
  });

  // Priority Fee
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 5000
    })
  );

  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000
    })
  );

  // Example instruction
  tx.add(
    SystemProgram.transfer({
      fromPubkey: trader.publicKey,
      toPubkey: trader.publicKey,
      lamports: 1000
    })
  );

  // Jito Tip
  tx.add(
    SystemProgram.transfer({
      fromPubkey: trader.publicKey,
      toPubkey: JITO_TIP_ACCOUNT,
      lamports: 5000
    })
  );

  tx.sign(trader);

  return tx;
}

// ----------------------------------
// Submit Bundle
// ----------------------------------

async function submitBundle(transactions) {

  const bundle = {
    transactions: transactions.map(tx =>
      tx.serialize().toString("base64")
    )
  };

  console.log("Submitting bundle...");

  try {

    const result = await client.sendBundle(bundle);

    console.log("Bundle Result:");
    console.log(result);

  } catch (err) {

    console.error("Bundle failed:");
    console.error(err);

  }
}

// ----------------------------------
// Main Execution
// ----------------------------------

async function main() {

  console.log("Connecting to Jito Block Engine...");

  try {

    const version = await client.getVersion();

    console.log("Connected to Jito.");
    console.log("Block Engine Version:", version);

  } catch (err) {

    console.error("Connection failed:");
    console.error(err);
    return;

  }

  console.log("Building transaction...");

  const tx = await buildTransaction();

  await submitBundle([tx]);

}

main();
