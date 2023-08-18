import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "hardhat-gas-reporter";
import "./type-extensions";
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import { ethers } from "ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
      entranceFee: ethers.parseEther("0.01"),
      gasLane:
        "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
      subscriptionId: "",
      callbackGasLimit: "500000",
      interval: 30,
    },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY as string],
      blockConfirmations: 6,
      vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
      entranceFee: ethers.parseEther("0.01"),
      gasLane:
        "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
      subscriptionId: "3092",
      callbackGasLimit: "500000",
      interval: 30,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  developmentChains: ["hardhat", "localhost"],
  organizerFee: 10,
  mocha: {
    timeout: 60000,
  },
};

export default config;
