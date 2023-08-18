import { assert, expect } from "chai";
import { Contract } from "ethers";
import { network, ethers, getNamedAccounts } from "hardhat";
import config from "../../hardhat.config";
import { Lottery } from "../../typechain-types";

const { developmentChains } = config;

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Staging Tests", function () {
      let lottery: Lottery;
      let lotteryEntranceFee: bigint;
      let deployer: string;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        lottery = await ethers.getContract<Lottery & Contract>(
          "Lottery",
          deployer
        );
        lotteryEntranceFee = await lottery.getEntranceFee();
      });

      describe("fulfillRandomWords", function () {
        it.skip(
          "works with live Chainlink Keepers and Chainlink VRF, we get a random winner",
          async function () {
            const startingTimeStamp = await lottery.getLatestTimestamp();
            const accounts = await ethers.getSigners();

            // eslint-disable-next-line no-async-promise-executor
            await new Promise<void>(async (resolve, reject) => {
              // setup listener before we enter the lottery
              // Just in case the blockchain moves REALLY fast
              lottery.once(lottery.getEvent("WinnerPicked"), async () => {
                console.log("WinnerPicked event fired!");
                try {
                  // add our asserts here
                  const recentWinner = await lottery.getRecentWinner();
                  const lotteryState = await lottery.getLotteryState();
                  const winnerEndingBalance = await ethers.provider.getBalance(
                    await accounts[0].getAddress()
                  );
                  const endingTimeStamp = await lottery.getLatestTimestamp();

                  await expect(lottery.getPlayer(0)).to.be.reverted;
                  assert.equal(recentWinner.toString(), accounts[0].address);
                  assert.equal(lotteryState.toString(), "0");
                  assert.equal(
                    winnerEndingBalance.toString(),
                    (winnerStartingBalance + lotteryEntranceFee).toString()
                  );
                  assert(endingTimeStamp > startingTimeStamp);
                  resolve();
                } catch (error) {
                  console.log(error);
                  reject(error);
                }
              });

              const tx = await lottery.enterLottery({
                value: lotteryEntranceFee,
              });
              await tx.wait(1);
              const winnerStartingBalance = await ethers.provider.getBalance(
                await accounts[0].getAddress()
              );
            });
          }
        ).timeout(200000);
      });
    });
