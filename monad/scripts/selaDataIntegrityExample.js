const { ethers } = require("hardhat");

async function main() {
  const [deployer, user1, user2, user3] = await ethers.getSigners();

  console.log("=== Sela Data Integrity Registry Example ===\n");
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);

  // 1. Deploy SelaDataIntegrityRegistry contract
  console.log("\n1. Deploying SelaDataIntegrityRegistry contract...");

  const SelaDataIntegrityRegistry = await ethers.getContractFactory(
    "SelaDataIntegrityRegistry"
  );
  const registry = await SelaDataIntegrityRegistry.deploy();
  await registry.deployed();

  const contractAddress = registry.address;
  console.log(`✅ SelaDataIntegrityRegistry deployed: ${contractAddress}`);

  // 2. Sample data preparation
  console.log("\n2. Preparing sample data for integrity verification...");

  const sampleData = [
    {
      type: "API Response",
      content: JSON.stringify({
        price: 3500.75,
        volume: 125000,
        timestamp: 1703097600,
        exchange: "KRX",
      }),
      description: "Stock market data from KRX API - KOSPI200",
    },
    {
      type: "Web Scraping",
      content:
        "Product: iPhone 15 Pro, Price: $999, Stock: 50, Seller: Apple Store",
      description: "Product information scraped from Apple Store website",
    },
    {
      type: "News Article",
      content:
        "Breaking: New blockchain regulation announced by financial authorities...",
      description: "Financial news article - blockchain regulation update",
    },
    {
      type: "Social Media",
      content:
        "Twitter sentiment analysis: 75% positive, 20% neutral, 5% negative",
      description: "Social media sentiment analysis data",
    },
  ];

  console.log(`Prepared ${sampleData.length} sample datasets for testing`);

  // 3. Store data hashes using different methods
  console.log("\n3. Storing data hashes...");

  const storedHashes = [];

  // Method 1: Store string hash directly
  console.log("\nMethod 1: Using storeStringHash()");
  for (let i = 0; i < 2; i++) {
    const data = sampleData[i];
    console.log(`Storing hash for: ${data.type}`);

    const tx = await registry
      .connect(user1)
      .storeStringHash(data.content, data.description);
    const receipt = await tx.wait();

    console.log(`Transaction receipt logs count: ${receipt.logs.length}`);

    // Extract hash ID from event (ethers v5 method)
    let hashStoredEvent = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = registry.interface.parseLog(log);
        if (parsedLog.name === "HashStored") {
          hashStoredEvent = parsedLog;
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed by this contract
        continue;
      }
    }

    if (hashStoredEvent) {
      const hashId = hashStoredEvent.args[0];
      const dataHash = hashStoredEvent.args[1];

      storedHashes.push({
        id: hashId,
        hash: dataHash,
        originalData: data.content,
        description: data.description,
        submitter: user1.address,
      });

      console.log(`  ✅ Hash ID: ${hashId}`);
      console.log(`  📝 Description: ${data.description}`);
      console.log(`  🔑 Hash: ${dataHash}`);
    } else {
      console.log(`  ❌ Failed to extract event from transaction`);
    }
  }

  // Method 2: Store computed hash
  console.log("\nMethod 2: Using storeHash() with pre-computed hash");
  for (let i = 2; i < sampleData.length; i++) {
    const data = sampleData[i];
    const computedHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(data.content)
    );

    console.log(`Storing pre-computed hash for: ${data.type}`);

    const user = i === 2 ? user2 : user3; // Different users for different data
    const tx = await registry
      .connect(user)
      .storeHash(computedHash, data.description);
    const receipt = await tx.wait();

    // Extract hash ID from event (ethers v5 method)
    let hashStoredEvent = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = registry.interface.parseLog(log);
        if (parsedLog.name === "HashStored") {
          hashStoredEvent = parsedLog;
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed by this contract
        continue;
      }
    }

    if (hashStoredEvent) {
      const hashId = hashStoredEvent.args[0];

      storedHashes.push({
        id: hashId,
        hash: computedHash,
        originalData: data.content,
        description: data.description,
        submitter: user.address,
      });

      console.log(`  ✅ Hash ID: ${hashId}`);
      console.log(`  📝 Description: ${data.description}`);
      console.log(`  🔑 Hash: ${computedHash}`);
    } else {
      console.log(`  ❌ Failed to extract event from transaction`);
    }
  }

  // 4. Query stored hash information
  console.log("\n4. Querying stored hash information...");

  for (const stored of storedHashes) {
    console.log(`\nQuerying Hash ID: ${stored.id}`);

    const hashInfo = await registry.getHashInfo(stored.id);
    console.log(`  Data Hash: ${hashInfo.dataHash}`);
    console.log(`  Submitter: ${hashInfo.submitter}`);
    console.log(
      `  Timestamp: ${new Date(
        Number(hashInfo.timestamp) * 1000
      ).toLocaleString()}`
    );
    console.log(`  Description: ${hashInfo.description}`);
    console.log(`  Exists: ${hashInfo.exists}`);

    // Query by hash value
    const hashId = await registry.getHashId(stored.hash);
    console.log(`  Hash ID lookup: ${hashId}`);

    // Check existence
    const exists = await registry.hashExists(stored.hash);
    console.log(`  Hash exists: ${exists}`);
  }

  // 5. Data integrity verification
  console.log("\n5. Data integrity verification...");

  // Verify original data
  console.log("\nVerifying original (unmodified) data:");
  for (let i = 0; i < storedHashes.length; i++) {
    const stored = storedHashes[i];
    console.log(`\nVerifying Hash ID ${stored.id} (${sampleData[i].type}):`);

    // Method 1: Verify by hash ID
    const isValidById = await registry.verifyDataByHashId(
      stored.id,
      ethers.utils.toUtf8Bytes(stored.originalData)
    );
    console.log(`  ✅ Verification by Hash ID: ${isValidById}`);

    // Method 2: Verify by hash value
    const isValidByHash = await registry.verifyDataByHash(
      stored.hash,
      ethers.utils.toUtf8Bytes(stored.originalData)
    );
    console.log(`  ✅ Verification by Hash: ${isValidByHash}`);
  }

  // 6. Tampered data verification (should fail)
  console.log("\n6. Testing tampered data detection...");

  const tamperedData = [
    {
      original: sampleData[0].content,
      tampered: JSON.stringify({
        price: 4000.0, // Changed price
        volume: 125000,
        timestamp: 1703097600,
        exchange: "KRX",
      }),
      description: "Price data tampered",
    },
    {
      original: sampleData[1].content,
      tampered:
        "Product: iPhone 15 Pro, Price: $899, Stock: 50, Seller: Apple Store", // Changed price
      description: "Product price tampered",
    },
  ];

  for (let i = 0; i < tamperedData.length; i++) {
    const stored = storedHashes[i];
    const tampered = tamperedData[i];

    console.log(`\nTesting tampered data for Hash ID ${stored.id}:`);
    console.log(`  Original: ${tampered.original.substring(0, 50)}...`);
    console.log(`  Tampered: ${tampered.tampered.substring(0, 50)}...`);

    const isValidTampered = await registry.verifyDataByHashId(
      stored.id,
      ethers.utils.toUtf8Bytes(tampered.tampered)
    );
    console.log(
      `  🚨 Tampered data verification: ${isValidTampered} (should be false)`
    );

    if (!isValidTampered) {
      console.log(`  ✅ Data tampering successfully detected!`);
    } else {
      console.log(`  ❌ Failed to detect data tampering!`);
    }
  }

  // 7. Advanced hash operations
  console.log("\n7. Advanced hash operations...");

  // Check next hash ID
  const nextHashId = await registry.nextHashId();
  console.log(`Next hash ID to be assigned: ${nextHashId}`);

  // Try to store duplicate hash (should fail)
  console.log("\nTesting duplicate hash prevention:");
  try {
    await registry.storeStringHash(
      sampleData[0].content, // Same content as first stored hash
      "Duplicate test"
    );
    console.log("❌ Duplicate hash storage succeeded (unexpected)");
  } catch (error) {
    console.log("✅ Duplicate hash storage failed as expected");
    console.log(`   Error: ${error.reason || error.message}`);
  }

  // 8. Non-existent hash queries
  console.log("\n8. Testing non-existent hash queries...");

  const nonExistentHashId = 9999;
  const nonExistentHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("non-existent-data")
  );

  console.log(`Checking non-existent hash ID ${nonExistentHashId}:`);
  const hashIdExists = await registry.hashIdExists(nonExistentHashId);
  console.log(`  Hash ID exists: ${hashIdExists}`);

  console.log(`Checking non-existent hash: ${nonExistentHash}`);
  const hashExists = await registry.hashExists(nonExistentHash);
  console.log(`  Hash exists: ${hashExists}`);

  const hashIdLookup = await registry.getHashId(nonExistentHash);
  console.log(`  Hash ID lookup result: ${hashIdLookup} (0 means not found)`);

  // 9. Final statistics
  console.log("\n9. Final statistics...");

  console.log(`Total hashes stored: ${storedHashes.length}`);
  console.log(`Next hash ID: ${await registry.nextHashId()}`);

  console.log("\nStored hash summary:");
  for (let i = 0; i < storedHashes.length; i++) {
    const stored = storedHashes[i];
    console.log(`  Hash ID ${stored.id}: ${stored.description}`);
    console.log(`    Submitter: ${stored.submitter}`);
    console.log(`    Data type: ${sampleData[i].type}`);
  }

  console.log("\n=== SelaDataIntegrityRegistry Example Completed ===");
  console.log("\n💡 Key features demonstrated:");
  console.log("✅ Hash storage using string data and pre-computed hashes");
  console.log("✅ Hash information queries and lookups");
  console.log("✅ Data integrity verification");
  console.log("✅ Tampered data detection");
  console.log("✅ Duplicate hash prevention");
  console.log("✅ Non-existent hash handling");
  console.log("✅ Multiple user interactions");

  console.log("\n🔒 Use cases demonstrated:");
  console.log("📊 Financial data integrity (API responses)");
  console.log("🛒 E-commerce data verification (web scraping)");
  console.log("📰 News article authenticity");
  console.log("📱 Social media data integrity");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred during execution:", error);
    process.exit(1);
  });
