const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SelaPoint", function () {
  let selaPoint;
  let owner, user1, user2, user3, minter, burner;
  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 Sela

  beforeEach(async function () {
    [owner, user1, user2, user3, minter, burner] = await ethers.getSigners();

    // SelaPoint deploy
    const SelaPoint = await ethers.getContractFactory("SelaPoint");
    selaPoint = await SelaPoint.deploy("Sela Point", "Sela", initialSupply);
    await selaPoint.waitForDeployment();
  });

  describe("Deployment and Initial State", function () {
    it("should deploy contract correctly", async function () {
      expect(await selaPoint.name()).to.equal("Sela Point");
      expect(await selaPoint.symbol()).to.equal("Sela");
      expect(await selaPoint.decimals()).to.equal(18);
      expect(await selaPoint.totalSupply()).to.equal(initialSupply);
      expect(await selaPoint.balanceOf(owner.address)).to.equal(initialSupply);
      expect(await selaPoint.owner()).to.equal(owner.address);
    });

    it("should have deployer with default minter privilege", async function () {
      expect(await selaPoint.minters(owner.address)).to.be.true;
      expect(await selaPoint.isMinter(owner.address)).to.be.true;
    });

    it("should be deployable even with zero initial supply", async function () {
      const SelaPoint = await ethers.getContractFactory("SelaPoint");
      const zeroSupplyToken = await SelaPoint.deploy("Zero Sela", "ZSela", 0);
      await zeroSupplyToken.waitForDeployment();

      expect(await zeroSupplyToken.totalSupply()).to.equal(0);
      expect(await zeroSupplyToken.balanceOf(owner.address)).to.equal(0);
    });
  });

  describe("Mint Function", function () {
    it("should allow minter to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(selaPoint.connect(owner).mint(user1.address, mintAmount))
        .to.emit(selaPoint, "TokensMinted")
        .withArgs(user1.address, mintAmount, owner.address);

      expect(await selaPoint.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await selaPoint.totalSupply()).to.equal(
        initialSupply + mintAmount
      );
    });

    it("should not allow unauthorized user to mint", async function () {
      const mintAmount = ethers.parseEther("1000");

      await expect(
        selaPoint.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("should allow authorized minter to mint", async function () {
      const mintAmount = ethers.parseEther("500");

      // Grant minter privilege
      await expect(selaPoint.connect(owner).addMinter(minter.address))
        .to.emit(selaPoint, "MinterAdded")
        .withArgs(minter.address);

      expect(await selaPoint.isMinter(minter.address)).to.be.true;

      // Minter mints tokens
      await expect(selaPoint.connect(minter).mint(user1.address, mintAmount))
        .to.emit(selaPoint, "TokensMinted")
        .withArgs(user1.address, mintAmount, minter.address);

      expect(await selaPoint.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("should not allow minting to zero address", async function () {
      const mintAmount = ethers.parseEther("100");

      await expect(
        selaPoint.connect(owner).mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("should not allow minting zero or negative amount", async function () {
      await expect(
        selaPoint.connect(owner).mint(user1.address, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should not allow minting when paused", async function () {
      const mintAmount = ethers.parseEther("100");

      // Pause contract
      await selaPoint.connect(owner).pause();

      await expect(
        selaPoint.connect(owner).mint(user1.address, mintAmount)
      ).to.be.revertedWithCustomError(selaPoint, "EnforcedPause");
    });
  });

  describe("Burn Function", function () {
    beforeEach(async function () {
      // Mint test tokens
      const mintAmount = ethers.parseEther("1000");
      await selaPoint.connect(owner).mint(user1.address, mintAmount);
      await selaPoint.connect(owner).mint(user2.address, mintAmount);
    });

    it("should allow user to burn own tokens", async function () {
      const burnAmount = ethers.parseEther("500");
      const initialBalance = await selaPoint.balanceOf(user1.address);

      await expect(selaPoint.connect(user1).burn(burnAmount))
        .to.emit(selaPoint, "TokensBurned")
        .withArgs(user1.address, burnAmount, user1.address);

      expect(await selaPoint.balanceOf(user1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("should allow burner to burn tokens from other accounts", async function () {
      const burnAmount = ethers.parseEther("300");

      // Grant burner privilege
      await expect(selaPoint.connect(owner).addBurner(burner.address))
        .to.emit(selaPoint, "BurnerAdded")
        .withArgs(burner.address);

      const initialBalance = await selaPoint.balanceOf(user1.address);

      await expect(
        selaPoint.connect(burner).burnFrom(user1.address, burnAmount)
      )
        .to.emit(selaPoint, "TokensBurned")
        .withArgs(user1.address, burnAmount, burner.address);

      expect(await selaPoint.balanceOf(user1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("should allow Owner to force burn tokens from other accounts", async function () {
      const burnAmount = ethers.parseEther("200");
      const initialBalance = await selaPoint.balanceOf(user1.address);

      await expect(
        selaPoint.connect(owner).ownerBurn(user1.address, burnAmount)
      )
        .to.emit(selaPoint, "OwnerBurn")
        .withArgs(user1.address, burnAmount);

      expect(await selaPoint.balanceOf(user1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("should not allow unauthorized user to burn from other accounts", async function () {
      const burnAmount = ethers.parseEther("100");

      await expect(
        selaPoint.connect(user3).burnFrom(user1.address, burnAmount)
      ).to.be.revertedWith("Not authorized to burn");
    });

    it("should not allow burning more than balance", async function () {
      const balance = await selaPoint.balanceOf(user1.address);
      const excessAmount = balance + ethers.parseEther("1");

      await expect(
        selaPoint.connect(user1).burn(excessAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("should not allow burning zero or negative amount", async function () {
      await expect(selaPoint.connect(user1).burn(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });

    it("should not allow burning from zero address", async function () {
      const burnAmount = ethers.parseEther("100");

      await expect(
        selaPoint.connect(owner).burnFrom(ethers.ZeroAddress, burnAmount)
      ).to.be.revertedWith("Cannot burn from zero address");
    });

    it("should not allow burning when paused", async function () {
      const burnAmount = ethers.parseEther("100");

      // Pause contract
      await selaPoint.connect(owner).pause();

      await expect(
        selaPoint.connect(user1).burn(burnAmount)
      ).to.be.revertedWithCustomError(selaPoint, "EnforcedPause");
    });
  });

  describe("Permission Management", function () {
    it("should allow Owner to add/remove minter privileges", async function () {
      // Add minter privilege
      await expect(selaPoint.connect(owner).addMinter(minter.address))
        .to.emit(selaPoint, "MinterAdded")
        .withArgs(minter.address);

      expect(await selaPoint.minters(minter.address)).to.be.true;
      expect(await selaPoint.isMinter(minter.address)).to.be.true;

      // Remove minter privilege
      await expect(selaPoint.connect(owner).removeMinter(minter.address))
        .to.emit(selaPoint, "MinterRemoved")
        .withArgs(minter.address);

      expect(await selaPoint.minters(minter.address)).to.be.false;
      expect(await selaPoint.isMinter(minter.address)).to.be.false;
    });

    it("should allow Owner to add/remove burner privileges", async function () {
      // Add burner privilege
      await expect(selaPoint.connect(owner).addBurner(burner.address))
        .to.emit(selaPoint, "BurnerAdded")
        .withArgs(burner.address);

      expect(await selaPoint.burners(burner.address)).to.be.true;
      expect(await selaPoint.isBurner(burner.address)).to.be.true;

      // Remove burner privilege
      await expect(selaPoint.connect(owner).removeBurner(burner.address))
        .to.emit(selaPoint, "BurnerRemoved")
        .withArgs(burner.address);

      expect(await selaPoint.burners(burner.address)).to.be.false;
      expect(await selaPoint.isBurner(burner.address)).to.be.false;
    });

    it("should not allow regular user to add/remove privileges", async function () {
      await expect(
        selaPoint.connect(user1).addMinter(user2.address)
      ).to.be.revertedWithCustomError(selaPoint, "OwnableUnauthorizedAccount");

      await expect(
        selaPoint.connect(user1).addBurner(user2.address)
      ).to.be.revertedWithCustomError(selaPoint, "OwnableUnauthorizedAccount");
    });

    it("should not allow granting privileges to zero address", async function () {
      await expect(
        selaPoint.connect(owner).addMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot add zero address as minter");

      await expect(
        selaPoint.connect(owner).addBurner(ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot add zero address as burner");
    });

    it("should not allow duplicate privilege granting", async function () {
      // Add minter privilege
      await selaPoint.connect(owner).addMinter(minter.address);

      // Attempt duplicate addition
      await expect(
        selaPoint.connect(owner).addMinter(minter.address)
      ).to.be.revertedWith("Address is already a minter");

      // Add burner privilege
      await selaPoint.connect(owner).addBurner(burner.address);

      // Attempt duplicate addition
      await expect(
        selaPoint.connect(owner).addBurner(burner.address)
      ).to.be.revertedWith("Address is already a burner");
    });

    it("should not allow removing privileges from non-privileged address", async function () {
      await expect(
        selaPoint.connect(owner).removeMinter(user1.address)
      ).to.be.revertedWith("Address is not a minter");

      await expect(
        selaPoint.connect(owner).removeBurner(user1.address)
      ).to.be.revertedWith("Address is not a burner");
    });
  });

  describe("Pause Function", function () {
    it("should allow Owner to pause/unpause contract", async function () {
      // Pause
      await selaPoint.connect(owner).pause();
      expect(await selaPoint.paused()).to.be.true;

      // Unpause
      await selaPoint.connect(owner).unpause();
      expect(await selaPoint.paused()).to.be.false;
    });

    it("should not allow regular user to pause/unpause", async function () {
      await expect(
        selaPoint.connect(user1).pause()
      ).to.be.revertedWithCustomError(selaPoint, "OwnableUnauthorizedAccount");

      await expect(
        selaPoint.connect(user1).unpause()
      ).to.be.revertedWithCustomError(selaPoint, "OwnableUnauthorizedAccount");
    });

    it("should not allow token transfers when paused", async function () {
      const transferAmount = ethers.parseEther("100");

      // Pause contract
      await selaPoint.connect(owner).pause();

      // ERC20 standard transfer should also be paused
      await expect(
        selaPoint.connect(owner).transfer(user1.address, transferAmount)
      ).to.be.revertedWithCustomError(selaPoint, "EnforcedPause");
    });
  });

  describe("Batch Mint Function", function () {
    it("should allow minting to multiple addresses at once", async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        ethers.parseEther("300"),
      ];

      const tx = await selaPoint.connect(owner).batchMint(recipients, amounts);

      // Check TokensMinted event for each address
      await expect(tx)
        .to.emit(selaPoint, "TokensMinted")
        .withArgs(recipients[0], amounts[0], owner.address);

      // Check balances
      expect(await selaPoint.balanceOf(user1.address)).to.equal(amounts[0]);
      expect(await selaPoint.balanceOf(user2.address)).to.equal(amounts[1]);
      expect(await selaPoint.balanceOf(user3.address)).to.equal(amounts[2]);
    });

    it("should fail if array lengths differ", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100")]; // Different length

      await expect(
        selaPoint.connect(owner).batchMint(recipients, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("should not allow batch mint with empty arrays", async function () {
      await expect(
        selaPoint.connect(owner).batchMint([], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("should fail if batch mint contains zero address or zero amount", async function () {
      const recipients = [user1.address, ethers.ZeroAddress];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

      await expect(
        selaPoint.connect(owner).batchMint(recipients, amounts)
      ).to.be.revertedWith("Cannot mint to zero address");

      const validRecipients = [user1.address, user2.address];
      const invalidAmounts = [ethers.parseEther("100"), 0];

      await expect(
        selaPoint.connect(owner).batchMint(validRecipients, invalidAmounts)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should not allow unauthorized user to batch mint", async function () {
      const recipients = [user2.address, user3.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

      await expect(
        selaPoint.connect(user1).batchMint(recipients, amounts)
      ).to.be.revertedWith("Not authorized to mint");
    });
  });

  describe("ERC20 Standard Functions", function () {
    beforeEach(async function () {
      // Mint test tokens
      const mintAmount = ethers.parseEther("1000");
      await selaPoint.connect(owner).mint(user1.address, mintAmount);
    });

    it("should work token transfer properly", async function () {
      const transferAmount = ethers.parseEther("100");

      await expect(
        selaPoint.connect(user1).transfer(user2.address, transferAmount)
      ).to.emit(selaPoint, "Transfer");

      expect(await selaPoint.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("should work allowance and transferFrom properly", async function () {
      const allowanceAmount = ethers.parseEther("200");
      const transferAmount = ethers.parseEther("100");

      // Set allowance
      await selaPoint.connect(user1).approve(user2.address, allowanceAmount);
      expect(await selaPoint.allowance(user1.address, user2.address)).to.equal(
        allowanceAmount
      );

      // Execute transferFrom
      await selaPoint
        .connect(user2)
        .transferFrom(user1.address, user3.address, transferAmount);

      expect(await selaPoint.balanceOf(user3.address)).to.equal(transferAmount);
      expect(await selaPoint.allowance(user1.address, user2.address)).to.equal(
        allowanceAmount - transferAmount
      );
    });
  });

  describe("Additional Functions", function () {
    it("should work getTotalSupply function properly", async function () {
      const totalSupply = await selaPoint.getTotalSupply();
      expect(totalSupply).to.equal(await selaPoint.totalSupply());
    });

    it("should grant burnFrom privilege to non-owner user when set as burner", async function () {
      // Mint tokens
      await selaPoint
        .connect(owner)
        .mint(user1.address, ethers.parseEther("1000"));

      // Set user2 as burner
      await selaPoint.connect(owner).addBurner(user2.address);

      // user2 burns user1's tokens
      const burnAmount = ethers.parseEther("100");
      await expect(
        selaPoint.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.emit(selaPoint, "TokensBurned");
    });

    it("should always give Owner minter and burner privileges", async function () {
      expect(await selaPoint.isMinter(owner.address)).to.be.true;
      expect(await selaPoint.isBurner(owner.address)).to.be.true;

      // Even if explicitly removed from minter, Owner should still have privilege
      await selaPoint.connect(owner).removeMinter(owner.address);
      expect(await selaPoint.isMinter(owner.address)).to.be.true;
    });
  });

  describe("Gas Efficiency and Large Volume Test", function () {
    it("should have reasonable gas efficiency for large batch mint", async function () {
      const batchSize = 50;
      const recipients = [];
      const amounts = [];

      for (let i = 0; i < batchSize; i++) {
        // Generate random addresses
        recipients.push(ethers.Wallet.createRandom().address);
        amounts.push(ethers.parseEther("100"));
      }

      const tx = await selaPoint.connect(owner).batchMint(recipients, amounts);
      const receipt = await tx.wait();

      // Check gas usage is within reasonable range
      expect(receipt.gasUsed).to.be.lessThan(3000000); // 3M gas limit
    });

    it("should allow unlimited minting", async function () {
      const largeAmount = ethers.parseEther("1000000000"); // 1 billion tokens

      await expect(selaPoint.connect(owner).mint(user1.address, largeAmount)).to
        .not.be.reverted;

      expect(await selaPoint.balanceOf(user1.address)).to.equal(largeAmount);
    });
  });
});
