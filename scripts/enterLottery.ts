import { ethers } from "hardhat";
import { Lottery } from "../typechain-types";

async function enterLottery() {
  const lottery = await ethers.getContract<Lottery>("Lottery");
  const entranceFee = await lottery.getEntranceFee();
  await lottery.enterLottery({ value: entranceFee + BigInt(1) });
  console.log("Entered!");
}

enterLottery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
