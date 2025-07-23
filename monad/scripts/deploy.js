const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(await deployer.getBalance())
  );

  // SelaDataIntegrityRegistry contract deployment
  console.log("\n=== Deploying SelaDataIntegrityRegistry contract... ===");
  const SelaDataIntegrityRegistry = await ethers.getContractFactory(
    "SelaDataIntegrityRegistry"
  );
  const selaDataIntegrityRegistry = await SelaDataIntegrityRegistry.deploy();
  await selaDataIntegrityRegistry.deployed();

  const selaDataIntegrityRegistryAddress = selaDataIntegrityRegistry.address;
  console.log(
    "SelaDataIntegrityRegistry deployment completed:",
    selaDataIntegrityRegistryAddress
  );

  // SelaPoint contract deployment
  console.log("\n=== Deploying SelaPoint contract... ===");
  const SelaPoint = await ethers.getContractFactory("SelaPoint");
  const selaPoint = await SelaPoint.deploy(
    "Sela Point", // Token name
    "Sela", // Token symbol
    ethers.utils.parseEther("1000000") // Initial supply (1,000,000 Sela)
  );
  await selaPoint.deployed();

  const selaPointAddress = selaPoint.address;
  console.log("SelaPoint deployment completed:", selaPointAddress);

  // SelaWalletFactory contract deployment
  console.log("\n=== Deploying SelaWalletFactory contract... ===");
  const SelaWalletFactory = await ethers.getContractFactory(
    "SelaWalletFactory"
  );
  const selaWalletFactory = await SelaWalletFactory.deploy();
  await selaWalletFactory.deployed();

  const selaWalletFactoryAddress = selaWalletFactory.address;
  console.log(
    "SelaWalletFactory deployment completed:",
    selaWalletFactoryAddress
  );

  // Deployment information output
  console.log("\n=== Deployment Completed ===");
  console.log(
    "SelaDataIntegrityRegistry address:",
    selaDataIntegrityRegistryAddress
  );
  console.log("SelaPoint address:", selaPointAddress);
  console.log("SelaWalletFactory address:", selaWalletFactoryAddress);
  console.log("Deployer address:", deployer.address);

  // Network information check
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // SelaPoint token information check
  const name = await selaPoint.name();
  const symbol = await selaPoint.symbol();
  const totalSupply = await selaPoint.totalSupply();
  const deployerBalance = await selaPoint.balanceOf(deployer.address);

  console.log("\n=== SelaPoint Token Information ===");
  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
  console.log("Total supply:", ethers.utils.formatEther(totalSupply), "Sela");
  console.log(
    "Deployer balance:",
    ethers.utils.formatEther(deployerBalance),
    "Sela"
  );

  // SelaWalletFactory test - wallet creation
  console.log("\n=== SelaWalletFactory Test ===");

  // Create test smart wallet
  const salt = Math.floor(Math.random() * 1000000);
  const createWalletTx = await selaWalletFactory.createWallet(
    deployer.address, // Wallet owner
    salt // Salt
  );
  const receipt = await createWalletTx.wait();

  // Extract wallet address from WalletCreated event
  const walletCreatedEvent = receipt.events.find(
    (event) => event.event === "WalletCreated"
  );

  if (walletCreatedEvent) {
    const walletAddress = walletCreatedEvent.args[1];
    console.log("Test smart wallet creation completed:", walletAddress);
    console.log("Factory address (DApp identifier):", selaWalletFactoryAddress);

    // Check created wallet information
    const walletInfo = await selaWalletFactory.getWalletInfo(walletAddress);
    console.log("Wallet owner:", walletInfo[0]);
    console.log(
      "Creation time:",
      new Date(Number(walletInfo[1]) * 1000).toLocaleString()
    );

    // Check total wallet count
    const totalWallets = await selaWalletFactory.getTotalWalletCount();
    console.log(
      "Total wallets created by this factory:",
      totalWallets.toString()
    );
  }

  // Save information for verification
  const deploymentInfo = {
    network: {
      name: network.name,
      chainId: network.chainId.toString(),
    },
    contracts: {
      SelaDataIntegrityRegistry: selaDataIntegrityRegistryAddress,
      SelaPoint: selaPointAddress,
      SelaWalletFactory: selaWalletFactoryAddress,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Information (JSON) ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred during deployment:", error);
    process.exit(1);
  });
