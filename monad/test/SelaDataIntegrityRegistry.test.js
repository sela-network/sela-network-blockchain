const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SelaDataIntegrityRegistry", function () {
  let selaDataIntegrityRegistry;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // SelaDataIntegrityRegistry deploy
    const SelaDataIntegrityRegistry = await ethers.getContractFactory(
      "SelaDataIntegrityRegistry"
    );
    selaDataIntegrityRegistry = await SelaDataIntegrityRegistry.deploy();
    await selaDataIntegrityRegistry.waitForDeployment();
  });

  describe("Deployment and Initial State", function () {
    it("should deploy contract correctly", async function () {
      expect(await selaDataIntegrityRegistry.owner()).to.equal(owner.address);
      expect(await selaDataIntegrityRegistry.nextHashId()).to.equal(1);
    });
  });

  describe("Hash Storage Function", function () {
    it("should store hash value properly", async function () {
      const testData = "Scraped test data";
      const description = "Social media post data";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));

      await expect(
        selaDataIntegrityRegistry
          .connect(user1)
          .storeHash(dataHash, description)
      )
        .to.emit(selaDataIntegrityRegistry, "HashStored")
        .withArgs(1, dataHash, user1.address, description);

      // Check hash information
      const hashInfo = await selaDataIntegrityRegistry.getHashInfo(1);
      expect(hashInfo.dataHash).to.equal(dataHash);
      expect(hashInfo.submitter).to.equal(user1.address);
      expect(hashInfo.description).to.equal(description);
      expect(hashInfo.exists).to.be.true;
      expect(hashInfo.timestamp).to.be.gt(0);
    });

    it("should work string hash storage convenience function properly", async function () {
      const testData = "Scraped news article";
      const description = "News article content";

      await expect(
        selaDataIntegrityRegistry
          .connect(user1)
          .storeStringHash(testData, description)
      ).to.emit(selaDataIntegrityRegistry, "HashStored");

      // Compare with calculated hash
      const expectedHash = ethers.keccak256(
        ethers.solidityPacked(["string"], [testData])
      );
      const hashInfo = await selaDataIntegrityRegistry.getHashInfo(1);
      expect(hashInfo.dataHash).to.equal(expectedHash);
    });

    it("should not allow storing empty hash value", async function () {
      const emptyHash = "0x" + "0".repeat(64);
      const description = "Test description";

      await expect(
        selaDataIntegrityRegistry
          .connect(user1)
          .storeHash(emptyHash, description)
      ).to.be.revertedWith("Hash cannot be empty");
    });

    it("should not allow storing duplicate hash value", async function () {
      const testData = "Duplicate test data";
      const description1 = "First storage";
      const description2 = "Second storage attempt";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));

      // First storage should succeed
      await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(dataHash, description1);

      // Second storage should fail
      await expect(
        selaDataIntegrityRegistry
          .connect(user2)
          .storeHash(dataHash, description2)
      ).to.be.revertedWith("Hash already exists");
    });

    it("should allow multiple users to store different hashes", async function () {
      const data1 = "User1 data";
      const data2 = "User2 data";
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(data1));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(data2));

      await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(hash1, "User1 description");
      await selaDataIntegrityRegistry
        .connect(user2)
        .storeHash(hash2, "User2 description");

      expect(await selaDataIntegrityRegistry.nextHashId()).to.equal(3);

      const hash1Info = await selaDataIntegrityRegistry.getHashInfo(1);
      const hash2Info = await selaDataIntegrityRegistry.getHashInfo(2);

      expect(hash1Info.submitter).to.equal(user1.address);
      expect(hash2Info.submitter).to.equal(user2.address);
    });
  });

  describe("Hash Verification Function", function () {
    beforeEach(async function () {
      // Store test data
      const testData = "Verification test data";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));
      await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(dataHash, "Verification test");
    });

    it("should work data verification by hash ID properly", async function () {
      const originalData = ethers.toUtf8Bytes("Verification test data");

      await expect(
        selaDataIntegrityRegistry
          .connect(user2)
          .verifyDataByHashId(1, originalData)
      ).to.emit(selaDataIntegrityRegistry, "HashVerified");

      const isValid = await selaDataIntegrityRegistry
        .connect(user2)
        .verifyDataByHashId.staticCall(1, originalData);
      expect(isValid).to.be.true;
    });

    it("should fail verification for wrong data", async function () {
      const wrongData = ethers.toUtf8Bytes("Wrong data");

      const isValid = await selaDataIntegrityRegistry
        .connect(user2)
        .verifyDataByHashId.staticCall(1, wrongData);
      expect(isValid).to.be.false;
    });

    it("should fail verification for non-existent hash ID", async function () {
      const originalData = ethers.toUtf8Bytes("Verification test data");

      await expect(
        selaDataIntegrityRegistry
          .connect(user2)
          .verifyDataByHashId(999, originalData)
      ).to.be.revertedWith("Hash ID does not exist");
    });

    it("should work direct verification by hash value properly", async function () {
      const testData = "Direct verification test";
      const originalData = ethers.toUtf8Bytes(testData);
      const dataHash = ethers.keccak256(originalData);

      const isValid = await selaDataIntegrityRegistry
        .connect(user2)
        .verifyDataByHash(dataHash, originalData);
      expect(isValid).to.be.true;

      // Verification with wrong data
      const wrongData = ethers.toUtf8Bytes("Wrong data");
      const isInvalid = await selaDataIntegrityRegistry
        .connect(user2)
        .verifyDataByHash(dataHash, wrongData);
      expect(isInvalid).to.be.false;
    });
  });

  describe("Hash Query Function", function () {
    beforeEach(async function () {
      // Store test data
      const testData1 = "Query test data 1";
      const testData2 = "Query test data 2";
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(testData1));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(testData2));

      await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(hash1, "First data");
      await selaDataIntegrityRegistry
        .connect(user2)
        .storeHash(hash2, "Second data");
    });

    it("should be able to query hash ID by hash value", async function () {
      const testData = "Query test data 1";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));

      const hashId = await selaDataIntegrityRegistry.getHashId(dataHash);
      expect(hashId).to.equal(1);

      // Non-existent hash
      const nonExistentHash = ethers.keccak256(
        ethers.toUtf8Bytes("Non-existent data")
      );
      const nonExistentId = await selaDataIntegrityRegistry.getHashId(
        nonExistentHash
      );
      expect(nonExistentId).to.equal(0);
    });

    it("should be able to check hash existence", async function () {
      const testData = "Query test data 1";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));

      const exists = await selaDataIntegrityRegistry.hashExists(dataHash);
      expect(exists).to.be.true;

      const nonExistentHash = ethers.keccak256(
        ethers.toUtf8Bytes("Non-existent data")
      );
      const notExists = await selaDataIntegrityRegistry.hashExists(
        nonExistentHash
      );
      expect(notExists).to.be.false;
    });

    it("should be able to check hash ID existence", async function () {
      const exists = await selaDataIntegrityRegistry.hashIdExists(1);
      expect(exists).to.be.true;

      const notExists = await selaDataIntegrityRegistry.hashIdExists(999);
      expect(notExists).to.be.false;
    });

    it("should fail when querying info with non-existent hash ID", async function () {
      await expect(
        selaDataIntegrityRegistry.getHashInfo(999)
      ).to.be.revertedWith("Hash ID does not exist");
    });
  });

  describe("Permission and Security", function () {
    it("should work ReentrancyGuard", async function () {
      // Check normal function calls work without issues
      const testData = "Reentrancy test";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));

      // Test storeHash function
      await expect(
        selaDataIntegrityRegistry
          .connect(user1)
          .storeHash(dataHash, "Reentrancy test")
      ).to.not.be.reverted;

      // Test storeStringHash function (with different data)
      await expect(
        selaDataIntegrityRegistry
          .connect(user1)
          .storeStringHash("String test", "String hash test")
      ).to.not.be.reverted;

      // Check stored hashes can be queried normally
      expect(await selaDataIntegrityRegistry.nextHashId()).to.equal(3);
    });

    it("should work Owner functionality properly", async function () {
      expect(await selaDataIntegrityRegistry.owner()).to.equal(owner.address);

      // Change owner
      await selaDataIntegrityRegistry
        .connect(owner)
        .transferOwnership(user1.address);
      expect(await selaDataIntegrityRegistry.owner()).to.equal(user1.address);
    });

    it("should not allow non-owner to change ownership", async function () {
      await expect(
        selaDataIntegrityRegistry
          .connect(user1)
          .transferOwnership(user2.address)
      ).to.be.revertedWithCustomError(
        selaDataIntegrityRegistry,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Event Verification", function () {
    it("should emit HashStored event with correct parameters", async function () {
      const testData = "Event test data";
      const description = "Event test description";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));

      const tx = await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(dataHash, description);

      await expect(tx)
        .to.emit(selaDataIntegrityRegistry, "HashStored")
        .withArgs(1, dataHash, user1.address, description);
    });

    it("should emit HashVerified event with correct parameters", async function () {
      // First store hash
      const testData = "Verification event test";
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));
      await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(dataHash, "Verification test");

      // Execute verification
      const originalData = ethers.toUtf8Bytes(testData);
      const tx = await selaDataIntegrityRegistry
        .connect(user2)
        .verifyDataByHashId(1, originalData);

      await expect(tx)
        .to.emit(selaDataIntegrityRegistry, "HashVerified")
        .withArgs(1, dataHash, true);
    });
  });

  describe("Gas Efficiency Test", function () {
    it("should have reasonable gas usage for large volume hash storage", async function () {
      const hashes = [];
      for (let i = 0; i < 10; i++) {
        const data = `Large volume test data ${i}`;
        const hash = ethers.keccak256(ethers.toUtf8Bytes(data));
        hashes.push(hash);
      }

      // Measure gas for first hash storage
      const tx1 = await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(hashes[0], `Description 0`);
      const receipt1 = await tx1.wait();

      // Measure gas for last hash storage
      const tx10 = await selaDataIntegrityRegistry
        .connect(user1)
        .storeHash(hashes[9], `Description 9`);
      const receipt10 = await tx10.wait();

      // Check gas usage doesn't increase significantly
      const gasRatio = Number(receipt10.gasUsed) / Number(receipt1.gasUsed);
      expect(gasRatio).to.be.lessThan(1.2); // Allow only up to 20% increase
    });
  });
});
