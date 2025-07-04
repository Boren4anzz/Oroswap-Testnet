const readline = require("readline");
const { GasPrice } = require("@cosmjs/stargate");
const fs = require("fs");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const http = require("http");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");

const NETWORK_CONFIG = {
  rpcUrl: "https://testnet-rpc.zigchain.com",
  explorerBase: "https://explorer.testnet.zigchain.com/tx/",
  routerAddress: "zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg",
};

const OPERATION_DELAYS = {
  betweenSteps: 15,
  betweenCycles: 45,
  afterError: 60,
};

const TOKEN_SETTINGS = {
  zigDenom: "uzig",
  oroDenom: "coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro",
  swapAmount: "250000",
  liquidityZigAmount: "150000",
};

const waitFor = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function displayHeader() {
  console.log("\n");

  console.log("███████╗██╗ ██████╗  ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗");
  console.log("╚══███╔╝██║██╔════╝ ██╔════╝██║  ██║██╔══██╗██║████╗  ██║");
  console.log("  ███╔╝ ██║██║  ███╗██║     ███████║███████║██║██╔██╗ ██║");
  console.log(" ███╔╝  ██║██║   ██║██║     ██╔══██║██╔══██║██║██║╚██╗██║");
  console.log("███████╗██║╚██████╔╝╚██████╗██║  ██║██║  ██║██║██║ ╚████║");
  console.log("╚══════╝╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═══╝");
  console.log("==========================================================");
  console.log("        Oroswap Auto-Farming Bot @BYAUTODROPCENTRAL      ");
  console.log("==========================================================");

  console.log("\n");
}

async function executeSwapOperation(cosmosClient, walletAddress) {
  console.log("Starting SWAP operation...");

  const swapFunds = [{ denom: TOKEN_SETTINGS.zigDenom, amount: TOKEN_SETTINGS.swapAmount }];
  const swapInstruction = {
    swap: {
      offer_asset: {
        info: { native_token: { denom: TOKEN_SETTINGS.zigDenom } },
        amount: TOKEN_SETTINGS.swapAmount,
      },
      max_spread: "0.1",
    },
  };

  const txResult = await cosmosClient.execute(walletAddress, NETWORK_CONFIG.routerAddress, swapInstruction, "auto", "Auto Farming by Pro Bot", swapFunds);

  console.log("   Transaction completed");
  console.log(`   View details: ${NETWORK_CONFIG.explorerBase}${txResult.transactionHash}`);
}

function createUserPrompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

async function getTokenBalance(client, address, denomination, tokenSymbol) {
  try {
    const balanceInfo = await client.getBalance(address, denomination);
    return `${(parseInt(balanceInfo.amount) / 1000000).toFixed(4)} ${tokenSymbol}`;
  } catch (error) {
    return `0.0000 ${tokenSymbol}`;
  }
}

async function performLiquidityAddition(cosmosClient, walletAddress) {
  console.log("Processing LIQUIDITY addition...");

  console.log(`    Liquidity Add ${parseInt(TOKEN_SETTINGS.liquidityZigAmount) / 1000000} ZIG`);

  const simulationRequest = {
    simulation: {
      offer_asset: {
        amount: TOKEN_SETTINGS.liquidityZigAmount,
        info: { native_token: { denom: TOKEN_SETTINGS.zigDenom } },
      },
    },
  };

  const simulationResponse = await cosmosClient.queryContractSmart(NETWORK_CONFIG.routerAddress, simulationRequest);
  const neededOroAmount = simulationResponse.return_amount;
  console.log(`    Required ORO: ${(parseInt(neededOroAmount) / 1000000).toFixed(4)}`);

  const liquidityAssets = [
    { info: { native_token: { denom: TOKEN_SETTINGS.oroDenom } }, amount: neededOroAmount },
    { info: { native_token: { denom: TOKEN_SETTINGS.zigDenom } }, amount: TOKEN_SETTINGS.liquidityZigAmount },
  ];

  const liquidityFunds = [
    { denom: TOKEN_SETTINGS.oroDenom, amount: neededOroAmount },
    { denom: TOKEN_SETTINGS.zigDenom, amount: TOKEN_SETTINGS.liquidityZigAmount },
  ];

  const liquidityInstruction = {
    provide_liquidity: {
      assets: liquidityAssets,
      slippage_tolerance: "0.1",
    },
  };

  const txResult = await cosmosClient.execute(walletAddress, NETWORK_CONFIG.routerAddress, liquidityInstruction, "auto", "Auto Farming by Pro Bot", liquidityFunds);

  console.log("   Liquidity successfully added");
  console.log(`   View details: ${NETWORK_CONFIG.explorerBase}${txResult.transactionHash}`);
}

async function createCosmosConnection(seedPhrase, rpcEndpoint) {
  if (!seedPhrase || !rpcEndpoint) {
    throw new Error("Mnemonic and RPC Endpoint must be provided.");
  }

  const hdWallet = await DirectSecp256k1HdWallet.fromMnemonic(seedPhrase, { prefix: "zig" });
  const [walletAccount] = await hdWallet.getAccounts();

  const networkGasPrice = GasPrice.fromString("0.025uzig");
  const connectionOptions = {
    gasPrice: networkGasPrice,
    connectionTimeout: 30000,
    keepAlive: true,
    httpAgent: new http.Agent({ keepAlive: true }),
  };

  const cosmosClient = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, hdWallet, connectionOptions);
  return { walletAccount, cosmosClient };
}

async function executeWaitingCountdown(waitHours) {
  let totalSeconds = waitHours * 3600;
  console.log(`\nBot will retry in ${waitHours} hour(s). Press CTRL+C to stop.`);

  while (totalSeconds > 0) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    process.stdout.write(`Waiting: ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} \r`);
    await waitFor(1000);
    totalSeconds--;
  }

  console.log("\nCountdown finished. Resuming operations...");
}

async function executeFarmingCycle(botContext, currentCycle) {
  const currentTime = new Date();
  const formattedDate = currentTime.toLocaleDateString("en-GB");
  const formattedTime = currentTime.toLocaleTimeString("en-GB", { hour12: false });

  console.log("----------------------------------------------------------");
  console.log(`Starting Operations | Date: ${formattedDate}, Time: ${formattedTime}`);
  console.log("----------------------------------------------------------");

  console.log("Checking wallet balance...");
  const currentZigBalance = await getTokenBalance(botContext.cosmosClient, botContext.walletAccount.address, TOKEN_SETTINGS.zigDenom, "ZIG");
  const currentOroBalance = await getTokenBalance(botContext.cosmosClient, botContext.walletAccount.address, TOKEN_SETTINGS.oroDenom, "ORO");
  console.log(`   Balance: ${currentZigBalance} | ${currentOroBalance}`);

  await executeSwapOperation(botContext.cosmosClient, botContext.walletAccount.address);
  await waitFor(OPERATION_DELAYS.betweenSteps * 1000);

  await performLiquidityAddition(botContext.cosmosClient, botContext.walletAccount.address);
  console.log("----------------------------------------------------------");
  console.log("All operations completed successfully. Bot is ready for the next execution.");
  console.log("----------------------------------------------------------");
}

async function startBot() {
  displayHeader();

  let seedPhrase;
  try {
    seedPhrase = fs.readFileSync("mnemonic.txt", "utf8").trim();
    if (!seedPhrase) {
      throw new Error("mnemonic.txt is empty");
    }
  } catch (fileError) {
    console.error("Could not read mnemonic.txt");
    console.error("Please create a file named 'mnemonic.txt' with your 12/24-word phrase");
    process.exit(1);
  }

  let retryWaitHours = 12;

  try {
    console.log(">> Initializing connection...");
    const { walletAccount, cosmosClient } = await createCosmosConnection(seedPhrase, NETWORK_CONFIG.rpcUrl);
    console.log(`Wallet connected: ${walletAccount.address}`);

    let cycleCounter = 1;
    const botContext = { cosmosClient, walletAccount };

    while (true) {
      try {
        await executeFarmingCycle(botContext, cycleCounter);
        console.log(`\nWaiting ${OPERATION_DELAYS.betweenCycles}s for next cycle...`);
        await waitFor(OPERATION_DELAYS.betweenCycles * 1000);
        cycleCounter++;
      } catch (cycleError) {
        console.error(`\nERROR in cycle #${cycleCounter}:`);
        console.error(`${cycleError.message || cycleError.toString()}`);

        if (cycleError.toString().includes("insufficient funds")) {
          console.log("\nInsufficient funds detected");
          await executeWaitingCountdown(retryWaitHours);
        } else {
          console.log(`\nRetrying in ${OPERATION_DELAYS.afterError}s...`);
          await waitFor(OPERATION_DELAYS.afterError * 1000);
        }
      }
    }
  } catch (initializationError) {
    console.error("\nFATAL INITIALIZATION ERROR");
    console.error(`${initializationError.message}`);
    console.error("Possible causes:");
    console.error("- Invalid mnemonic in mnemonic.txt");
    console.error("- RPC endpoint unavailable");
    console.error("- Network connectivity issues");
    process.exit(1);
  }
}

startBot().catch((fatalError) => {
  console.error("FATAL ERROR:", fatalError);
  process.exit(1);
});
