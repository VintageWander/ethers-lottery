import { assert, expect } from "chai";
import { EventLog } from "ethers";
import { network, deployments, ethers } from "hardhat";
import config from "../../hardhat.config";
import { Lottery, VRFCoordinatorV2Mock } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const { developmentChains, networks: networkConfig } = config;

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", function () {
      let lottery: Lottery;
      let lotteryContract: Lottery;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let lotteryEntranceFee: bigint;
      let interval: number;
      let player: SignerWithAddress;
      let accounts: SignerWithAddress[];
      let lotteryAddress: string;

      beforeEach(async () => {
        accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        player = accounts[1];
        await deployments.fixture(["mocks", "lottery"]);
        vrfCoordinatorV2Mock = await ethers.getContract<VRFCoordinatorV2Mock>(
          "VRFCoordinatorV2Mock"
        );
        lotteryContract = await ethers.getContract<Lottery>("Lottery");
        lottery = lotteryContract.connect(player);
        lotteryEntranceFee = await lottery.getEntranceFee();
        interval = Number(await lottery.getInterval());
        lotteryAddress = await lottery.getAddress();
        lottery.once(lottery.getEvent("LotteryEnter"), () => {
          console.log("LotteryEnter event");
        });
      });

      describe("constructor", function () {
        it("initializes the lottery correctly", async () => {
          // Ideally, we'd separate these out so that only 1 assert per "it" block
          // And ideally, we'd make this check everything
          const lotteryState = (await lottery.getLotteryState()).toString();
          assert.equal(lotteryState, "0");
          assert.equal(
            interval.toString(),
            networkConfig && networkConfig[network.name]?.interval.toString()
          );
        });
      });

      describe("enterLottery", function () {
        it("reverts when you don't pay enough", async () => {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
            lottery,
            "Lottery__NotEnoughEthToEnter"
          );
        });
        it("records player when they enter", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          const contractPlayer = await lottery.getPlayer(0);
          assert.equal(player.address, contractPlayer);
        });
        it("emits event on enter", async () => {
          await expect(
            lottery.enterLottery({ value: lotteryEntranceFee })
          ).to.emit(lottery, "LotteryEnter");
        });
        it("doesn't allow entrance when lottery is calculating", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval + 1);
          // we pretend to be a keeper for a second
          await lottery.performUpkeep("0x");
          await expect(
            lottery.enterLottery({ value: lotteryEntranceFee })
          ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen");
        });
      });
      describe("checkUpkeep", function () {
        it("returns false if people haven't sent any ETH", async () => {
          await time.increase(interval + 1);

          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });
        it("returns false if lottery isn't open", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval + 1);
          await lottery.performUpkeep("0x");
          const lotteryState = await lottery.getLotteryState();
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert.equal(lotteryState.toString() == "1", !upkeepNeeded);
        });
        it("returns false if enough time hasn't passed", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval - 2);
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval + 1);
          const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x");
          assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval + 1);
          const tx = await lottery.performUpkeep("0x");
          assert(tx);
        });
        it("reverts if checkup is false", async () => {
          await expect(
            lottery.performUpkeep("0x")
          ).to.be.revertedWithCustomError(lottery, "Lottery__UpkeepNotNeeded");
        });
        it("updates the lottery state and emits a requestId", async () => {
          // Too many asserts in this test!
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval + 1);
          const txResponse = await lottery.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const lotteryState = await lottery.getLotteryState();
          const requestId = (txReceipt?.logs[1] as EventLog).args!.requestId;
          assert(requestId > 0);
          assert(lotteryState == BigInt(1));
        });
      });
      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await time.increase(interval + 1);
        });
        it("can only be called after performupkeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(
              0,
              await lottery.getAddress()
            )
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(
              1,
              await lottery.getAddress()
            )
          ).to.be.revertedWith("nonexistent request");
        });
        // This test is too big...
        it.skip("picks a winner, resets, and sends money", async () => {
          lottery.on(lottery.getEvent("LotteryEnter"), () => {
            console.log("LotteryEnter event");
          });
          const additionalEntrances = 3;
          const startingIndex = 2;
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrances;
            i++
          ) {
            lottery = lotteryContract.connect(accounts[i]);
            await lottery.enterLottery({ value: lotteryEntranceFee });
          }
          const startingTimeStamp = await lottery.getLatestTimestamp();

          // This will be more important for our staging tests...
          // eslint-disable-next-line no-async-promise-executor
          await new Promise<void>(async (resolve, reject) => {
            lottery.once(lottery.getEvent("WinnerPicked"), async () => {
              console.log("WinnerPicked fired");
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              try {
                // Now lets get the ending values...
                const recentWinner = await lottery.getRecentWinner();
                const lotteryState = await lottery.getLotteryState();
                const winnerBalance = await ethers.provider.getBalance(
                  await accounts[2].getAddress()
                );
                const deployerBalance = await ethers.provider.getBalance(
                  await accounts[0].getAddress()
                );
                const endingTimeStamp = await lottery.getLatestTimestamp();
                await expect(lottery.getPlayer(0)).to.be.reverted;
                const contractBalance =
                  BigInt(lotteryEntranceFee) * BigInt(additionalEntrances) +
                  BigInt(lotteryEntranceFee);
                const organizerFee =
                  (contractBalance * BigInt(config.organizerFee)) / BigInt(100);
                assert.equal(recentWinner.toString(), accounts[2].address);
                assert.equal(lotteryState, BigInt(0));
                assert.equal(
                  winnerBalance.toString(),
                  (startingBalance + contractBalance - organizerFee).toString()
                );
                assert(deployerBalance > deployerStartingBalance);
                assert(
                  deployerBalance - deployerStartingBalance <= organizerFee
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const tx = await lottery.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const startingBalance = await ethers.provider.getBalance(
              await accounts[2].getAddress()
            );
            const deployerStartingBalance = await ethers.provider.getBalance(
              await accounts[0].getAddress()
            );
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              (txReceipt!.logs![1] as EventLog).args.requestId,
              lotteryAddress
            );
          });
        });
      });
    });
