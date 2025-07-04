const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { GasPrice } = require("@cosmjs/stargate");
const readline = require("readline");
const fs = require("fs");
const http = require("http");

const RPC_ENDPOINT = "https://testnet-rpc.zigchain.com";
const ROUTER_CONTRACT_ADDRESS = "zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg";
const EXPLORER_URL = "https://explorer.testnet.zigchain.com/tx/";
const ZIG_DENOM = "uzig";
const ORO_DENOM = "coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro";
const AMOUNT_TO_SWAP = "250000";
const ZIG_AMOUNT_FOR_LP = "150000";
const DELAY_BETWEEN_STEPS = 15;
const DELAY_BETWEEN_CYCLES = 45;
const DELAY_AFTER_ERROR = 60;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function runCountdown(hours) {
  let seconds = hours * 3600;
  console.log(`\nBot will retry in ${hours} hour(s). Press CTRL+C to stop.`);
  while (seconds > 0) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    process.stdout.write(`Waiting: ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} \r`);
    await sleep(1000);
    seconds--;
  }
  console.log("\nCountdown finished. Resuming operations...");
}

async function getFormattedBalance(client, address, denom, symbol) {
  try {
    const balance = await client.getBalance(address, denom);
    return `${(parseInt(balance.amount) / 1000000).toFixed(4)} ${symbol}`;
  } catch (e) {
    return `0.0000 ${symbol}`;
  }
}

async function initializeClient(mnemonic, rpcEndpoint) {
  if (!mnemonic || !rpcEndpoint) {
    throw new Error("Mnemonic and RPC Endpoint must be provided.");
  }

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "zig" });
  const [account] = await wallet.getAccounts();

  const gasPrice = GasPrice.fromString("0.025uzig");
  const clientOptions = {
    gasPrice: gasPrice,
    connectionTimeout: 30000,
    keepAlive: true,
    httpAgent: new http.Agent({ keepAlive: true }),
  };

  const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet, clientOptions);
  return { account, client };
}

async function performSwap(client, senderAddress) {
  console.log("2️⃣ Executing SWAP operation...");
  const fundsToSend = [{ denom: ZIG_DENOM, amount: AMOUNT_TO_SWAP }];
  const swapMsg = {
    swap: {
      offer_asset: {
        info: { native_token: { denom: ZIG_DENOM } },
        amount: AMOUNT_TO_SWAP,
      },
      max_spread: "0.1",
    },
  };

  const result = await client.execute(senderAddress, ROUTER_CONTRACT_ADDRESS, swapMsg, "auto", "Auto Farming by Pro Bot", fundsToSend);
  console.log("   [✔] Transaction completed");
  console.log(`   🔗 View details: ${EXPLORER_URL}${result.transactionHash}`);
}

async function performAddLiquidity(client, senderAddress) {
  console.log("3️⃣ Processing LIQUIDITY addition...");

  console.log(`   - Liquidity simulation for ${parseInt(ZIG_AMOUNT_FOR_LP) / 1000000} ZIG`);
  const simulationQuery = {
    simulation: {
      offer_asset: {
        amount: ZIG_AMOUNT_FOR_LP,
        info: { native_token: { denom: ZIG_DENOM } },
      },
    },
  };
  const simulationResult = await client.queryContractSmart(ROUTER_CONTRACT_ADDRESS, simulationQuery);
  const requiredOroAmount = simulationResult.return_amount;
  console.log(`   - Required ORO: ${(parseInt(requiredOroAmount) / 1000000).toFixed(4)}`);

  const assets = [
    { info: { native_token: { denom: ORO_DENOM } }, amount: requiredOroAmount },
    { info: { native_token: { denom: ZIG_DENOM } }, amount: ZIG_AMOUNT_FOR_LP },
  ];
  const fundsForLiq = [
    { denom: ORO_DENOM, amount: requiredOroAmount },
    { denom: ZIG_DENOM, amount: ZIG_AMOUNT_FOR_LP },
  ];
  const liquidityMsg = {
    provide_liquidity: {
      assets: assets,
      slippage_tolerance: "0.1",
    },
  };

  const result = await client.execute(senderAddress, ROUTER_CONTRACT_ADDRESS, liquidityMsg, "auto", "Auto Farming by Pro Bot", fundsForLiq);
  console.log("   [✔] Liquidity successfully added");
  console.log(`   🔗 View details: ${EXPLORER_URL}${result.transactionHash}`);
}

async function runCycle(context, cycleCount) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB");
  const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });

  console.log("----------------------------------------------------------");
  console.log(`🛠️ Starting Operations | Date: ${dateStr}, Time: ${timeStr}`);
  console.log("----------------------------------------------------------");

  console.log("1️⃣ Checking wallet resources...");
  const zigBalance = await getFormattedBalance(context.client, context.account.address, ZIG_DENOM, "ZIG");
  const oroBalance = await getFormattedBalance(context.client, context.account.address, ORO_DENOM, "ORO");
  console.log(`   [✔] Balance: ${zigBalance} | ${oroBalance}`);

  await performSwap(context.client, context.account.address);
  await sleep(DELAY_BETWEEN_STEPS * 1000);

  await performAddLiquidity(context.client, context.account.address);
  console.log("----------------------------------------------------------");
  console.log("All operations completed successfully. Bot is ready for the next execution.");
  console.log("----------------------------------------------------------");
}

async function main() {
  console.log("███████╗██╗ ██████╗  ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗");
  console.log("╚══███╔╝██║██╔════╝ ██╔════╝██║  ██║██╔══██╗██║████╗  ██║");
  console.log("  ███╔╝ ██║██║  ███╗██║     ███████║███████║██║██╔██╗ ██║");
  console.log(" ███╔╝  ██║██║   ██║██║     ██╔══██║██╔══██║██║██║╚██╗██║");
  console.log("███████╗██║╚██████╔╝╚██████╗██║  ██║██║  ██║██║██║ ╚████║");
  console.log("╚══════╝╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═══╝");
  console.log("==========================================================");
  console.log("             Oroswap Auto-Farming Bot @BYAUTODROPCENTRAL");
  console.log("==========================================================");

  let mnemonic;
  try {
    mnemonic = fs.readFileSync("mnemonic.txt", "utf8").trim();
    if (!mnemonic) {
      throw new Error("mnemonic.txt is empty");
    }
  } catch (err) {
    console.error("Could not read mnemonic.txt");
    console.error("Please create a file named 'mnemonic.txt' with your 12/24-word phrase");
    process.exit(1);
  }

  let retryDelayHours = 12;

  try {
    console.log(">> Initializing connection...");
    const { account, client } = await initializeClient(mnemonic, RPC_ENDPOINT);
    console.log(`[✔] Wallet connected: ${account.address}`);

    let cycleCount = 1;
    const context = { client, account };

    while (true) {
      try {
        await runCycle(context, cycleCount);
        console.log(`\nWaiting ${DELAY_BETWEEN_CYCLES}s for next cycle...`);
        await sleep(DELAY_BETWEEN_CYCLES * 1000);
        cycleCount++;
      } catch (error) {
        console.error(`\nERROR in cycle #${cycleCount}:`);
        console.error(`${error.message || error.toString()}`);

        if (error.toString().includes("insufficient funds")) {
          console.log("\nInsufficient funds detected");
          await runCountdown(retryDelayHours);
        } else {
          console.log(`\nRetrying in ${DELAY_AFTER_ERROR}s...`);
          await sleep(DELAY_AFTER_ERROR * 1000);
        }
      }
    }
  } catch (initError) {
    console.error("\nFATAL INITIALIZATION ERROR");
    console.error(`${initError.message}`);
    console.error("Possible causes:");
    console.error("- Invalid mnemonic in mnemonic.txt");
    console.error("- RPC endpoint unavailable");
    console.error("- Network connectivity issues");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
