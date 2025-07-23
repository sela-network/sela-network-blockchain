const { ethers } = require("hardhat");

async function main() {
  const [deployer, user1, user2, user3, minter, burner] =
    await ethers.getSigners();

  console.log("=== Sela Point Token Example ===\n");
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  console.log("Minter:", minter.address);
  console.log("Burner:", burner.address);

  // 1. Deploy SelaPoint contract
  console.log("\n1. Deploying SelaPoint contract...");

  const SelaPoint = await ethers.getContractFactory("SelaPoint");
  const selaPoint = await SelaPoint.deploy(
    "Sela Point Token",
    "SELA",
    ethers.utils.parseEther("1000") // 1000 SELA initial supply
  );
  await selaPoint.deployed();

  const contractAddress = selaPoint.address;
  console.log(`✅ SelaPoint deployed: ${contractAddress}`);

  // Check initial state
  const initialSupply = await selaPoint.totalSupply();
  const deployerBalance = await selaPoint.balanceOf(deployer.address);
  const isDeployerMinter = await selaPoint.isMinter(deployer.address);

  console.log(
    `Initial total supply: ${ethers.utils.formatEther(initialSupply)} SELA`
  );
  console.log(
    `Deployer balance: ${ethers.utils.formatEther(deployerBalance)} SELA`
  );
  console.log(`Deployer is minter: ${isDeployerMinter}`);

  // 2. Minter management
  console.log("\n2. Managing minter privileges...");

  // Add minter
  console.log(`Adding ${minter.address} as minter...`);
  const addMinterTx = await selaPoint.addMinter(minter.address);
  await addMinterTx.wait();

  const isMinterNow = await selaPoint.isMinter(minter.address);
  console.log(`✅ ${minter.address} is minter: ${isMinterNow}`);

  // 3. Burner management
  console.log("\n3. Managing burner privileges...");

  // Add burner
  console.log(`Adding ${burner.address} as burner...`);
  const addBurnerTx = await selaPoint.addBurner(burner.address);
  await addBurnerTx.wait();

  const isBurnerNow = await selaPoint.isBurner(burner.address);
  console.log(`✅ ${burner.address} is burner: ${isBurnerNow}`);

  // 4. Minting tokens
  console.log("\n4. Minting tokens...");

  // Mint by deployer (owner)
  console.log("Minting 100 SELA to user1 (by deployer)...");
  const mintTx1 = await selaPoint.mint(
    user1.address,
    ethers.utils.parseEther("100")
  );
  await mintTx1.wait();

  let user1Balance = await selaPoint.balanceOf(user1.address);
  console.log(`User1 balance: ${ethers.utils.formatEther(user1Balance)} SELA`);

  // Mint by authorized minter
  console.log("Minting 50 SELA to user2 (by authorized minter)...");
  const mintTx2 = await selaPoint
    .connect(minter)
    .mint(user2.address, ethers.utils.parseEther("50"));
  await mintTx2.wait();

  let user2Balance = await selaPoint.balanceOf(user2.address);
  console.log(`User2 balance: ${ethers.utils.formatEther(user2Balance)} SELA`);

  // 5. Batch minting
  console.log("\n5. Batch minting...");

  const recipients = [user1.address, user2.address, user3.address];
  const amounts = [
    ethers.utils.parseEther("20"),
    ethers.utils.parseEther("30"),
    ethers.utils.parseEther("40"),
  ];

  console.log("Batch minting to 3 users...");
  const batchMintTx = await selaPoint.batchMint(recipients, amounts);
  await batchMintTx.wait();

  // Check updated balances
  for (let i = 0; i < recipients.length; i++) {
    const balance = await selaPoint.balanceOf(recipients[i]);
    console.log(
      `  ${recipients[i]}: ${ethers.utils.formatEther(balance)} SELA`
    );
  }

  // 6. Token transfers
  console.log("\n6. Token transfers...");

  console.log("User1 transfers 10 SELA to user3...");
  const transferTx = await selaPoint
    .connect(user1)
    .transfer(user3.address, ethers.utils.parseEther("10"));
  await transferTx.wait();

  user1Balance = await selaPoint.balanceOf(user1.address);
  let user3Balance = await selaPoint.balanceOf(user3.address);
  console.log(
    `User1 balance after transfer: ${ethers.utils.formatEther(
      user1Balance
    )} SELA`
  );
  console.log(
    `User3 balance after transfer: ${ethers.utils.formatEther(
      user3Balance
    )} SELA`
  );

  // 7. Token burning
  console.log("\n7. Token burning...");

  // Self burn
  console.log("User2 burns 15 SELA from own balance...");
  const burnTx = await selaPoint
    .connect(user2)
    .burn(ethers.utils.parseEther("15"));
  await burnTx.wait();

  user2Balance = await selaPoint.balanceOf(user2.address);
  console.log(
    `User2 balance after self-burn: ${ethers.utils.formatEther(
      user2Balance
    )} SELA`
  );

  // Burn from other account (by authorized burner)
  console.log("Authorized burner burns 5 SELA from user3's balance...");
  const burnFromTx = await selaPoint
    .connect(burner)
    .burnFrom(user3.address, ethers.utils.parseEther("5"));
  await burnFromTx.wait();

  user3Balance = await selaPoint.balanceOf(user3.address);
  console.log(
    `User3 balance after burn: ${ethers.utils.formatEther(user3Balance)} SELA`
  );

  // Owner force burn (emergency)
  console.log("Owner force burns 10 SELA from user1 (emergency)...");
  const ownerBurnTx = await selaPoint.ownerBurn(
    user1.address,
    ethers.utils.parseEther("10")
  );
  await ownerBurnTx.wait();

  user1Balance = await selaPoint.balanceOf(user1.address);
  console.log(
    `User1 balance after owner burn: ${ethers.utils.formatEther(
      user1Balance
    )} SELA`
  );

  // 8. Pause functionality
  console.log("\n8. Testing pause functionality...");

  console.log("Pausing contract...");
  const pauseTx = await selaPoint.pause();
  await pauseTx.wait();

  const isPaused = await selaPoint.paused();
  console.log(`Contract is paused: ${isPaused}`);

  // Try to transfer while paused (should fail)
  try {
    await selaPoint
      .connect(user1)
      .transfer(user2.address, ethers.utils.parseEther("1"));
    console.log("❌ Transfer succeeded (unexpected)");
  } catch (error) {
    console.log("✅ Transfer failed as expected (contract is paused)");
  }

  console.log("Unpausing contract...");
  const unpauseTx = await selaPoint.unpause();
  await unpauseTx.wait();

  const isUnpaused = !(await selaPoint.paused());
  console.log(`Contract is unpaused: ${isUnpaused}`);

  // 9. Permission management - removing privileges
  console.log("\n9. Removing privileges...");

  console.log(`Removing minter privilege from ${minter.address}...`);
  const removeMinterTx = await selaPoint.removeMinter(minter.address);
  await removeMinterTx.wait();

  const isMinterAfterRemoval = await selaPoint.isMinter(minter.address);
  console.log(
    `${minter.address} is minter after removal: ${isMinterAfterRemoval}`
  );

  console.log(`Removing burner privilege from ${burner.address}...`);
  const removeBurnerTx = await selaPoint.removeBurner(burner.address);
  await removeBurnerTx.wait();

  const isBurnerAfterRemoval = await selaPoint.isBurner(burner.address);
  console.log(
    `${burner.address} is burner after removal: ${isBurnerAfterRemoval}`
  );

  // 10. Final statistics
  console.log("\n10. Final statistics...");

  const finalSupply = await selaPoint.getTotalSupply();
  console.log(
    `Final total supply: ${ethers.utils.formatEther(finalSupply)} SELA`
  );

  console.log("\nFinal balances:");
  const finalDeployerBalance = await selaPoint.balanceOf(deployer.address);
  const finalUser1Balance = await selaPoint.balanceOf(user1.address);
  const finalUser2Balance = await selaPoint.balanceOf(user2.address);
  const finalUser3Balance = await selaPoint.balanceOf(user3.address);

  console.log(
    `  Deployer: ${ethers.utils.formatEther(finalDeployerBalance)} SELA`
  );
  console.log(`  User1: ${ethers.utils.formatEther(finalUser1Balance)} SELA`);
  console.log(`  User2: ${ethers.utils.formatEther(finalUser2Balance)} SELA`);
  console.log(`  User3: ${ethers.utils.formatEther(finalUser3Balance)} SELA`);

  console.log("\n=== SelaPoint Example Completed ===");
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
