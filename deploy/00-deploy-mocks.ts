import { HardhatRuntimeEnvironment } from "hardhat/types";
import { config, network } from "hardhat";
import { ethers } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";

const deployMocks: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [ethers.parseEther("0.25"), 1e9];

  if (config.developmentChains.includes(network.name)) {
    log("Local network detected! Deploying mocks...");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args,
    });

    log("Mocks deployed!");
    log("----------------------");
  }
};

deployMocks.tags = ["all", "mocks"];

export default deployMocks;
