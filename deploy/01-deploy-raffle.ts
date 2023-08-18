import { HardhatRuntimeEnvironment } from "hardhat/types";
import { config, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import verify from "../utils/verify";
import { VRFCoordinatorV2Mock } from "../typechain-types";
import { EventLog } from "ethers";

const deployLottery: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
  ethers,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  let vrfCoordinatorV2Address = network.config.vrfCoordinator;
  let subscriptionId = network.config.subscriptionId;
  let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;

  if (config.developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress();
    const transactionReceipt = await (
      await vrfCoordinatorV2Mock.createSubscription()
    ).wait(1);

    subscriptionId = (transactionReceipt?.logs[0] as EventLog).args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      ethers.parseEther("2")
    );
  }

  const args = [
    vrfCoordinatorV2Address,
    network.config.entranceFee,
    network.config.gasLane,
    subscriptionId,
    network.config.callbackGasLimit,
    network.config.interval,
    config.organizerFee,
  ];

  const lottery = await deploy("Lottery", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (config.developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock!.addConsumer(subscriptionId, lottery.address);
  }

  if (
    !config.developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(lottery.address, args, log);
  }

  log("----------------------------");
};

deployLottery.tags = ["all", "lottery"];
export default deployLottery;
