const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer, user1, user2, user3, minter, burner] =
    await ethers.getSigners();

  console.log("=== Sela Power Token Example ===\n");
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  console.log("Minter:", minter.address);
  console.log("Burner:", burner.address);

  // 1. Deploy SelaPower contract (upgradeable)
  console.log("\n1. Deploying SelaPower contract (upgradeable)...");

  const SelaPower = await ethers.getContractFactory("SelaPower");
  const selaPower = await upgrades.deployProxy(
    SelaPower,
    [
      "Sela Power Token",
      "SPWR",
      ethers.utils.parseEther("1000") // 1000 SPWR initial supply
    ],
    { kind: "uups" }
  );
  await selaPower.deployed();

  const contractAddress = selaPower.address;
  console.log(`✅ SelaPower Proxy deployed: ${contractAddress}`);

  // Check initial state
  const initialSupply = await selaPower.totalSupply();
  const deployerBalance = await selaPower.balanceOf(deployer.address);
  const isDeployerMinter = await selaPower.isMinter(deployer.address);

  console.log(
    `Initial total supply: ${ethers.utils.formatEther(initialSupply)} SPWR`
  );
  console.log(
    `Deployer balance: ${ethers.utils.formatEther(deployerBalance)} SPWR`
  );
  console.log(`Deployer is minter: ${isDeployerMinter}`);

  // 2. Minter management
  console.log("\n2. Managing minter privileges...");

  // Add minter
  console.log(`Adding ${minter.address} as minter...`);
  const addMinterTx = await selaPower.addMinter(minter.address);
  await addMinterTx.wait();

  const isMinterNow = await selaPower.isMinter(minter.address);
  console.log(`✅ ${minter.address} is minter: ${isMinterNow}`);

  // 3. Burner management
  console.log("\n3. Managing burner privileges...");

  // Add burner
  console.log(`Adding ${burner.address} as burner...`);
  const addBurnerTx = await selaPower.addBurner(burner.address);
  await addBurnerTx.wait();

  const isBurnerNow = await selaPower.isBurner(burner.address);
  console.log(`✅ ${burner.address} is burner: ${isBurnerNow}`);

  // 4. Minting tokens
  console.log("\n4. Minting tokens...");

  // Mint by deployer (owner)
  console.log("Minting 100 SPWR to user1 (by deployer)...");
  const mintTx1 = await selaPower.mint(
    user1.address,
    ethers.utils.parseEther("100")
  );
  await mintTx1.wait();

  let user1Balance = await selaPower.balanceOf(user1.address);
  console.log(`User1 balance: ${ethers.utils.formatEther(user1Balance)} SPWR`);

  // Mint by authorized minter
  console.log("Minting 50 SPWR to user2 (by authorized minter)...");
  const mintTx2 = await selaPower
    .connect(minter)
    .mint(user2.address, ethers.utils.parseEther("50"));
  await mintTx2.wait();

  let user2Balance = await selaPower.balanceOf(user2.address);
  console.log(`User2 balance: ${ethers.utils.formatEther(user2Balance)} SPWR`);

  // 5. Batch minting
  console.log("\n5. Batch minting...");

  const recipients = [user1.address, user2.address, user3.address];
  const amounts = [
    ethers.utils.parseEther("20"),
    ethers.utils.parseEther("30"),
    ethers.utils.parseEther("40"),
  ];

  console.log("Batch minting to 3 users...");
  const batchMintTx = await selaPower.batchMint(recipients, amounts);
  await batchMintTx.wait();

  // Check updated balances
  for (let i = 0; i < recipients.length; i++) {
    const balance = await selaPower.balanceOf(recipients[i]);
    console.log(
      `  ${recipients[i]}: ${ethers.utils.formatEther(balance)} SPWR`
    );
  }

  // 6. Token transfers
  console.log("\n6. Token transfers...");

  console.log("User1 transfers 10 SPWR to user3...");
  const transferTx = await selaPower
    .connect(user1)
    .transfer(user3.address, ethers.utils.parseEther("10"));
  await transferTx.wait();

  user1Balance = await selaPower.balanceOf(user1.address);
  let user3Balance = await selaPower.balanceOf(user3.address);
  console.log(
    `User1 balance after transfer: ${ethers.utils.formatEther(
      user1Balance
    )} SPWR`
  );
  console.log(
    `User3 balance after transfer: ${ethers.utils.formatEther(
      user3Balance
    )} SPWR`
  );

  // 7. Token burning
  console.log("\n7. Token burning...");

  // Self burn
  console.log("User2 burns 15 SPWR from own balance...");
  const burnTx = await selaPower
    .connect(user2)
    .burn(ethers.utils.parseEther("15"));
  await burnTx.wait();

  user2Balance = await selaPower.balanceOf(user2.address);
  console.log(
    `User2 balance after self-burn: ${ethers.utils.formatEther(
      user2Balance
    )} SPWR`
  );

  // Burn from other account (by authorized burner)
  console.log("Authorized burner burns 5 SPWR from user3's balance...");
  const burnFromTx = await selaPower
    .connect(burner)
    .burnFrom(user3.address, ethers.utils.parseEther("5"));
  await burnFromTx.wait();

  user3Balance = await selaPower.balanceOf(user3.address);
  console.log(
    `User3 balance after burn: ${ethers.utils.formatEther(user3Balance)} SPWR`
  );

  // Owner force burn (emergency)
  console.log("Owner force burns 10 SPWR from user1 (emergency)...");
  const ownerBurnTx = await selaPower.ownerBurn(
    user1.address,
    ethers.utils.parseEther("10")
  );
  await ownerBurnTx.wait();

  user1Balance = await selaPower.balanceOf(user1.address);
  console.log(
    `User1 balance after owner burn: ${ethers.utils.formatEther(
      user1Balance
    )} SPWR`
  );

  // 8. Pause functionality
  console.log("\n8. Testing pause functionality...");

  console.log("Pausing contract...");
  const pauseTx = await selaPower.pause();
  await pauseTx.wait();

  const isPaused = await selaPower.paused();
  console.log(`Contract is paused: ${isPaused}`);

  // Try to transfer while paused (should fail)
  try {
    await selaPower
      .connect(user1)
      .transfer(user2.address, ethers.utils.parseEther("1"));
    console.log("❌ Transfer succeeded (unexpected)");
  } catch (error) {
    console.log("✅ Transfer failed as expected (contract is paused)");
  }

  console.log("Unpausing contract...");
  const unpauseTx = await selaPower.unpause();
  await unpauseTx.wait();

  const isUnpaused = !(await selaPower.paused());
  console.log(`Contract is unpaused: ${isUnpaused}`);

  // 9. Permission management - removing privileges
  console.log("\n9. Removing privileges...");

  console.log(`Removing minter privilege from ${minter.address}...`);
  const removeMinterTx = await selaPower.removeMinter(minter.address);
  await removeMinterTx.wait();

  const isMinterAfterRemoval = await selaPower.isMinter(minter.address);
  console.log(
    `${minter.address} is minter after removal: ${isMinterAfterRemoval}`
  );

  console.log(`Removing burner privilege from ${burner.address}...`);
  const removeBurnerTx = await selaPower.removeBurner(burner.address);
  await removeBurnerTx.wait();

  const isBurnerAfterRemoval = await selaPower.isBurner(burner.address);
  console.log(
    `${burner.address} is burner after removal: ${isBurnerAfterRemoval}`
  );

  // 10. Final statistics
  console.log("\n10. Final statistics...");

  const finalSupply = await selaPower.totalSupply();
  console.log(
    `Final total supply: ${ethers.utils.formatEther(finalSupply)} SPWR`
  );

  console.log("\nFinal balances:");
  const finalDeployerBalance = await selaPower.balanceOf(deployer.address);
  const finalUser1Balance = await selaPower.balanceOf(user1.address);
  const finalUser2Balance = await selaPower.balanceOf(user2.address);
  const finalUser3Balance = await selaPower.balanceOf(user3.address);

  console.log(
    `  Deployer: ${ethers.utils.formatEther(finalDeployerBalance)} SPWR`
  );
  console.log(`  User1: ${ethers.utils.formatEther(finalUser1Balance)} SPWR`);
  console.log(`  User2: ${ethers.utils.formatEther(finalUser2Balance)} SPWR`);
  console.log(`  User3: ${ethers.utils.formatEther(finalUser3Balance)} SPWR`);

  console.log("\n=== SelaPower Example Completed ===");
  console.log("\n💡 Key features demonstrated:");
  console.log("✅ Token deployment with initial supply");
  console.log("✅ Minter and burner privilege management");
  console.log("✅ Individual and batch minting");
  console.log("✅ Token transfers");
  console.log("✅ Self-burn, authorized burn, and owner force burn");
  console.log("✅ Pause/unpause functionality");
  console.log("✅ Permission removal");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred during execution:", error);
    process.exit(1);
  });
