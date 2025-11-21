const { ethers, upgrades } = require("hardhat");

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

  // SelaPower contract deployment (upgradeable via UUPS proxy)
  console.log("\n=== Deploying SelaPower contract (upgradeable)... ===");
  const SelaPower = await ethers.getContractFactory("SelaPower");
  const selaPower = await upgrades.deployProxy(
    SelaPower,
    [
      "Sela Power", // Token name
      "SPWR", // Token symbol
      ethers.utils.parseEther("0"), // Initial supply (1,000,000 SPWR)
    ],
    { kind: "uups" }
  );
  await selaPower.deployed();

  const selaPowerAddress = selaPower.address;
  const selaPowerImplementation =
    await upgrades.erc1967.getImplementationAddress(selaPowerAddress);
  console.log("SelaPower Proxy deployment completed:", selaPowerAddress);
  console.log("SelaPower Implementation address:", selaPowerImplementation);

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
  console.log("SelaPower address:", selaPowerAddress);
  console.log("SelaWalletFactory address:", selaWalletFactoryAddress);
  console.log("Deployer address:", deployer.address);

  // Network information check
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // SelaPower token information check
  const name = await selaPower.name();
  const symbol = await selaPower.symbol();
  const totalSupply = await selaPower.totalSupply();
  const deployerBalance = await selaPower.balanceOf(deployer.address);
  const contractVersion = await selaPower.version();

  console.log("\n=== SelaPower Token Information ===");
  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
  console.log("Contract version:", contractVersion);
  console.log("Total supply:", ethers.utils.formatEther(totalSupply), "SPWR");
  console.log(
    "Deployer balance:",
    ethers.utils.formatEther(deployerBalance),
    "SPWR"
  );
  console.log("Upgradeable: Yes (UUPS Proxy)");

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
      SelaPower: {
        proxy: selaPowerAddress,
        implementation: selaPowerImplementation,
      },
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
