const { ethers } = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();

  console.log("=== Sela Network Account Abstraction Example ===\n");
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);

  // 1. Deploy independent SelaWalletFactory for each DApp
  console.log("\n1. Deploying SelaWalletFactory for each DApp...");

  const SelaWalletFactory = await ethers.getContractFactory(
    "SelaWalletFactory"
  );

  const dappFactories = [
    { name: "Sela DeFi Protocol", factory: null, address: null },
    { name: "Sela NFT Marketplace", factory: null, address: null },
    { name: "Sela GameFi Platform", factory: null, address: null },
  ];

  // Deploy independent factory for each DApp
  for (let i = 0; i < dappFactories.length; i++) {
    const factory = await SelaWalletFactory.deploy();
    await factory.deployed();

    const factoryAddress = factory.address;
    dappFactories[i].factory = factory;
    dappFactories[i].address = factoryAddress;

    console.log(
      `✅ ${dappFactories[i].name} factory deployed: ${factoryAddress}`
    );
  }

  // 2. Create smart wallets for each DApp factory
  console.log("\n2. Creating smart wallets for each DApp factory...");

  const wallets = [];

  for (let i = 0; i < dappFactories.length; i++) {
    const dapp = dappFactories[i];
    const salt = i + 1; // Simple salt value

    // Create wallet for user1
    const createTx = await dapp.factory
      .connect(user1)
      .createWallet(user1.address, salt);
    const receipt = await createTx.wait();

    // Extract wallet address from WalletCreated event
    const walletCreatedEvent = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "WalletCreated"
    );

    if (walletCreatedEvent) {
      const walletAddress = walletCreatedEvent.args[1];
      wallets.push({
        dappName: dapp.name,
        factoryAddress: dapp.address,
        walletAddress: walletAddress,
        owner: user1.address,
      });

      console.log(`✅ ${dapp.name} wallet created: ${walletAddress}`);
      console.log(`   Factory address (DApp identifier): ${dapp.address}`);
    }
  }

  // 3. Interact with created wallets
  console.log("\n3. Testing smart wallet functionality...");

  if (wallets.length > 0) {
    const testWallet = wallets[0];
    console.log(
      `Test target wallet: ${testWallet.walletAddress} (${testWallet.dappName})`
    );
    console.log(
      `DApp identifier (factory address): ${testWallet.factoryAddress}`
    );

    // Create SelaWallet contract instance
    const SelaWallet = await ethers.getContractFactory("SelaWallet");
    const wallet = SelaWallet.attach(testWallet.walletAddress);

    // Send ether to wallet
    console.log("\n3-1. Sending 0.1 ETH to wallet...");
    const sendTx = await user1.sendTransaction({
      to: testWallet.walletAddress,
      value: ethers.utils.parseEther("0.1"),
    });
    await sendTx.wait();

    const balance = await wallet.getBalance();
    console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);

    // Query wallet information
    console.log("\n3-2. Querying wallet information...");
    const walletInfo = await wallet.getWalletInfo();
    console.log(`Owner: ${walletInfo[0]}`);
    console.log(`Factory: ${walletInfo[1]}`);
    console.log(
      `Creation time: ${new Date(
        Number(walletInfo[2]) * 1000
      ).toLocaleString()}`
    );
    console.log(`Balance: ${ethers.utils.formatEther(walletInfo[3])} ETH`);

    // Send ether to another address (through wallet)
    console.log("\n3-3. Sending 0.05 ETH through wallet...");
    const transferAmount = ethers.utils.parseEther("0.05");
    const transferTx = await wallet.connect(user1).execute(
      user2.address, // Recipient
      transferAmount, // Amount
      "0x" // Empty data
    );
    await transferTx.wait();

    const newBalance = await wallet.getBalance();
    console.log(
      `Wallet balance after transfer: ${ethers.utils.formatEther(
        newBalance
      )} ETH`
    );

    // Executor permission management
    console.log("\n3-4. Managing executor permissions...");
    const addExecutorTx = await wallet
      .connect(user1)
      .addExecutor(user2.address);
    await addExecutorTx.wait();
    console.log(`✅ Added ${user2.address} as executor`);

    const isExecutor = await wallet.isAuthorizedExecutor(user2.address);
    console.log(`user2 executor permission: ${isExecutor}`);
  }

  // 4. Output statistics for each DApp
  console.log("\n4. DApp statistics information...");

  for (const dapp of dappFactories) {
    const totalWallets = await dapp.factory.getTotalWalletCount();
    const user1WalletCount = await dapp.factory.getUserWalletCount(
      user1.address
    );

    console.log(`\n${dapp.name}:`);
    console.log(`  Factory address: ${dapp.address}`);
    console.log(`  Total wallets created: ${totalWallets}`);
    console.log(`  Wallets owned by user1: ${user1WalletCount}`);
  }

  // 5. Example of DApp-specific wallet tracking (on-chain analysis)
  console.log(
    "\n5. DApp-specific wallet tracking (on-chain analysis example)..."
  );

  // Query all wallets from first DApp
  const firstDapp = dappFactories[0];
  const allWallets = await firstDapp.factory.getAllWallets();

  console.log(`\nAll wallets created by ${firstDapp.name}:`);
  console.log(`Factory address (DApp identifier): ${firstDapp.address}`);

  for (const walletAddr of allWallets) {
    const walletInfo = await firstDapp.factory.getWalletInfo(walletAddr);
    console.log(`  - ${walletAddr} (owner: ${walletInfo[0]})`);
  }

  // 6. Pagination example
  console.log("\n6. Pagination query example...");

  const [paginatedWallets, total] = await firstDapp.factory.getWalletsPaginated(
    0,
    10
  );
  console.log(`First 10 wallets query (total ${total}):`);
  for (const walletAddr of paginatedWallets) {
    console.log(`  - ${walletAddr}`);
  }

  console.log("\n=== Account Abstraction Example Completed ===");
  console.log("\n💡 Key improvements:");
  console.log("✅ Independent factory contract for each DApp");
  console.log("✅ Factory address = DApp identifier (no dappId needed)");
  console.log("✅ Simpler structure and gas efficiency");
  console.log("✅ Complete DApp independence");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred during execution:", error);
    process.exit(1);
  });
