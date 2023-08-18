import 'hardhat/types/config';

declare module 'hardhat/types/config' {
    export interface HttpNetworkUserConfig {
        blockConfirmations?: number;
        vrfCoordinator?: string;
        entranceFee: bigint;
        gasLane: string;
        subscriptionId?: string;
        callbackGasLimit: string;
        interval: number;
    }

    export interface HardhatNetworkUserConfig {
        blockConfirmations?: number;
        entranceFee: bigint;
        gasLane: string;
        subscriptionId?: string;
        callbackGasLimit?: string;
        interval: number;
    }

    export interface HardhatUserConfig {
        developmentChains: string[];
        organizerFee: number;
    }

    export interface HttpNetworkConfig {
        blockConfirmations: number;
        vrfCoordinator: string;
        entranceFee: bigint;
        gasLane: string;
        subscriptionId: string;
        callbackGasLimit: string;
        interval: number;
    }

    export interface HardhatNetworkConfig {
        blockConfirmations: number;
        vrfCoordinator?: string;
        entranceFee: bigint;
        gasLane: string;
        subscriptionId: string;
        callbackGasLimit: string;
        interval: number;
    }

    export interface HardhatConfig {
        developmentChains: string[];
        organizerFee: number;
    }
}
