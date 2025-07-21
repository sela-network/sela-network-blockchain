const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Account Abstraction - Sela Wallet System", function () {
  let selaWalletFactory;
  let deployer, user1, user2, user3;
  let factoryAddress;

  beforeEach(async function () {
    [deployer, user1, user2, user3] = await ethers.getSigners();

    // SelaWalletFactory deploy
    const SelaWalletFactory = await ethers.getContractFactory(
      "SelaWalletFactory"
    );
    selaWalletFactory = await SelaWalletFactory.deploy();
    await selaWalletFactory.waitForDeployment();
    factoryAddress = await selaWalletFactory.getAddress();
  });

  describe("SelaWalletFactory", function () {
    it("should create smart wallet properly", async function () {
      const salt = 12345;

      // Create wallet
      await expect(
        selaWalletFactory.connect(user1).createWallet(user1.address, salt)
      ).to.emit(selaWalletFactory, "WalletCreated");

      // Check user wallet count
      const userWalletCount = await selaWalletFactory.getUserWalletCount(
        user1.address
      );
      expect(userWalletCount).to.equal(1);

      // Check total wallet count
      const totalWalletCount = await selaWalletFactory.getTotalWalletCount();
      expect(totalWalletCount).to.equal(1);
    });

    it("should be able to compute wallet address in advance", async function () {
      const salt = 12345;

      // Compute wallet address in advance
      const predictedAddress = await selaWalletFactory.computeWalletAddress(
        user1.address,
        salt
      );

      // Actually create wallet
      const tx = await selaWalletFactory
        .connect(user1)
        .createWallet(user1.address, salt);
      const receipt = await tx.wait();

      // Extract actual address from event
      const walletCreatedEvent = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "WalletCreated"
      );
      const actualAddress = walletCreatedEvent.args[1];

      expect(actualAddress).to.equal(predictedAddress);
    });

    it("should allow multiple users to create wallets each", async function () {
      const salt1 = 12345;
      const salt2 = 67890;

      // Create user1 wallet
      await selaWalletFactory.connect(user1).createWallet(user1.address, salt1);

      // Create user2 wallet
      await selaWalletFactory.connect(user2).createWallet(user2.address, salt2);

      // Check each user's wallet count
      expect(
        await selaWalletFactory.getUserWalletCount(user1.address)
      ).to.equal(1);
      expect(
        await selaWalletFactory.getUserWalletCount(user2.address)
      ).to.equal(1);

      // Check total wallet count
      expect(await selaWalletFactory.getTotalWalletCount()).to.equal(2);
    });

    it("should allow same user to create multiple wallets", async function () {
      const salt1 = 12345;
      const salt2 = 67890;

      // user1 creates two wallets
      await selaWalletFactory.connect(user1).createWallet(user1.address, salt1);
      await selaWalletFactory.connect(user1).createWallet(user1.address, salt2);

      // Check user1's wallet count
      expect(
        await selaWalletFactory.getUserWalletCount(user1.address)
      ).to.equal(2);

      // Check user1's wallet list
      const userWallets = await selaWalletFactory.getUserWallets(user1.address);
      expect(userWallets.length).to.equal(2);
    });

    it("should work pagination properly", async function () {
      // Create 5 wallets
      for (let i = 0; i < 5; i++) {
        await selaWalletFactory
          .connect(user1)
          .createWallet(user1.address, i + 1);
      }

      // Query first 3
      const [wallets1, total1] = await selaWalletFactory.getWalletsPaginated(
        0,
        3
      );
      expect(wallets1.length).to.equal(3);
      expect(total1).to.equal(5);

      // Query remaining 2
      const [wallets2, total2] = await selaWalletFactory.getWalletsPaginated(
        3,
        3
      );
      expect(wallets2.length).to.equal(2);
      expect(total2).to.equal(5);

      // Query out of range
      const [wallets3, total3] = await selaWalletFactory.getWalletsPaginated(
        10,
        3
      );
      expect(wallets3.length).to.equal(0);
      expect(total3).to.equal(5);
    });

    it("should work user-specific pagination properly", async function () {
      // user1 creates 3 wallets
      for (let i = 0; i < 3; i++) {
        await selaWalletFactory
          .connect(user1)
          .createWallet(user1.address, i + 1);
      }

      // user2 creates 2 wallets
      for (let i = 0; i < 2; i++) {
        await selaWalletFactory
          .connect(user2)
          .createWallet(user2.address, i + 10);
      }

      // Query user1's wallets with pagination
      const [user1Wallets, user1Total] =
        await selaWalletFactory.getUserWalletsPaginated(user1.address, 0, 2);
      expect(user1Wallets.length).to.equal(2);
      expect(user1Total).to.equal(3);

      // Query user2's wallets
      const [user2Wallets, user2Total] =
        await selaWalletFactory.getUserWalletsPaginated(user2.address, 0, 10);
      expect(user2Wallets.length).to.equal(2);
      expect(user2Total).to.equal(2);
    });
  });

  describe("SelaWallet", function () {
    let walletAddress;
    let wallet;

    beforeEach(async function () {
      const salt = 12345;

      // Create wallet
      const tx = await selaWalletFactory
        .connect(user1)
        .createWallet(user1.address, salt);
      const receipt = await tx.wait();

      // Extract created wallet address
      const walletCreatedEvent = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "WalletCreated"
      );
      walletAddress = walletCreatedEvent.args[1];

      // Create SelaWallet contract instance
      const SelaWallet = await ethers.getContractFactory("SelaWallet");
      wallet = SelaWallet.attach(walletAddress);
    });

    it("should have wallet information set correctly", async function () {
      expect(await wallet.owner()).to.equal(user1.address);
      expect(await wallet.factory()).to.equal(factoryAddress);
      expect(await wallet.isAuthorizedExecutor(user1.address)).to.be.true;
    });

    it("should be able to receive ether", async function () {
      const amount = ethers.parseEther("1");

      await expect(user1.sendTransaction({ to: walletAddress, value: amount }))
        .to.emit(wallet, "Received")
        .withArgs(user1.address, amount);

      expect(await wallet.getBalance()).to.equal(amount);
    });

    it("should only allow owner to execute transactions", async function () {
      // Send ether to wallet
      await user1.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther("1"),
      });

      const transferAmount = ethers.parseEther("0.5");

      // Owner's transaction execution (should succeed)
      await expect(
        wallet.connect(user1).execute(user2.address, transferAmount, "0x")
      ).to.emit(wallet, "Executed");

      // Non-owner's transaction execution (should fail)
      await expect(
        wallet.connect(user2).execute(user3.address, transferAmount, "0x")
      ).to.be.revertedWith("Not authorized to execute");
    });

    it("should be able to manage executor permissions", async function () {
      // Initially user2 is not an executor
      expect(await wallet.isAuthorizedExecutor(user2.address)).to.be.false;

      // Add user2 as executor
      await expect(wallet.connect(user1).addExecutor(user2.address))
        .to.emit(wallet, "ExecutorAdded")
        .withArgs(user2.address);

      // user2 becomes executor
      expect(await wallet.isAuthorizedExecutor(user2.address)).to.be.true;

      // Remove user2 from executor
      await expect(wallet.connect(user1).removeExecutor(user2.address))
        .to.emit(wallet, "ExecutorRemoved")
        .withArgs(user2.address);

      // user2 is no longer executor
      expect(await wallet.isAuthorizedExecutor(user2.address)).to.be.false;
    });

    it("should be able to execute batch transactions", async function () {
      // Send ether to wallet
      await user1.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther("2"),
      });

      const targets = [user2.address, user3.address];
      const values = [ethers.parseEther("0.5"), ethers.parseEther("0.3")];
      const datas = ["0x", "0x"];

      await expect(
        wallet.connect(user1).executeBatch(targets, values, datas)
      ).to.emit(wallet, "Executed");
    });

    it("should be able to change owner", async function () {
      await expect(wallet.connect(user1).changeOwner(user2.address))
        .to.emit(wallet, "OwnerChanged")
        .withArgs(user1.address, user2.address);

      expect(await wallet.owner()).to.equal(user2.address);
      expect(await wallet.isAuthorizedExecutor(user2.address)).to.be.true;
      expect(await wallet.isAuthorizedExecutor(user1.address)).to.be.false;
    });

    it("should work signature-based transaction execution", async function () {
      // Send ether to wallet
      await user1.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther("1"),
      });

      const target = user2.address;
      const value = ethers.parseEther("0.1");
      const data = "0x";
      const nonce = 1;

      // Generate message hash
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address", "uint256", "bytes", "uint256", "uint256"],
          [
            walletAddress,
            target,
            value,
            data,
            nonce,
            (await ethers.provider.getNetwork()).chainId,
          ]
        )
      );

      // Sign with user1
      const signature = await user1.signMessage(ethers.getBytes(messageHash));

      // Execute transaction with signature
      await expect(
        wallet
          .connect(user3)
          .executeWithSignature(target, value, data, nonce, signature)
      ).to.emit(wallet, "Executed");

      // Check if nonce is used
      expect(await wallet.isNonceUsed(nonce)).to.be.true;

      // Executing again with same nonce should fail
      await expect(
        wallet
          .connect(user3)
          .executeWithSignature(target, value, data, nonce, signature)
      ).to.be.revertedWith("Nonce already used");
    });
  });

  describe("Multi-Factory System", function () {
    it("should allow each DApp to have independent factory", async function () {
      // Deploy second factory (for different DApp)
      const SelaWalletFactory = await ethers.getContractFactory(
        "SelaWalletFactory"
      );
      const secondFactory = await SelaWalletFactory.deploy();
      await secondFactory.waitForDeployment();
      const secondFactoryAddress = await secondFactory.getAddress();

      // Create wallets from each factory
      await selaWalletFactory.connect(user1).createWallet(user1.address, 1);
      await secondFactory.connect(user1).createWallet(user1.address, 1);

      // Check statistics per factory
      expect(await selaWalletFactory.getTotalWalletCount()).to.equal(1);
      expect(await secondFactory.getTotalWalletCount()).to.equal(1);

      // Check factory addresses are different (serve as DApp identifiers)
      expect(factoryAddress).to.not.equal(secondFactoryAddress);
    });

    it("should manage wallets independently per factory even for same user", async function () {
      // Deploy second factory
      const SelaWalletFactory = await ethers.getContractFactory(
        "SelaWalletFactory"
      );
      const secondFactory = await SelaWalletFactory.deploy();
      await secondFactory.waitForDeployment();

      // Create 2 wallets from first factory
      await selaWalletFactory.connect(user1).createWallet(user1.address, 1);
      await selaWalletFactory.connect(user1).createWallet(user1.address, 2);

      // Create 1 wallet from second factory
      await secondFactory.connect(user1).createWallet(user1.address, 1);

      // Check user1's wallet count per factory
      expect(
        await selaWalletFactory.getUserWalletCount(user1.address)
      ).to.equal(2);
      expect(await secondFactory.getUserWalletCount(user1.address)).to.equal(1);
    });
  });
});
