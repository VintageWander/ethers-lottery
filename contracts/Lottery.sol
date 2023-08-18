// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
//import "hardhat/console.sol";

error Lottery__NotEnoughEthToEnter();
error Lottery__TransferFailed();
error Lottery__NotOpen();
error Lottery__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numberOfPlayers,
    uint256 state
);

/**
 * @title Lottery Contract with organizer fee
 * @author Andrew Giang
 * @dev Implements VRFConsumerBaseV2 and Chainlink keepers
 */
contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum State {
        OPEN,
        CALCULATING
    }

    uint256 private immutable entranceFee;
    address payable[] private players;
    VRFCoordinatorV2Interface private immutable vrfCoordinator;
    bytes32 private immutable gasLane;
    uint64 private immutable subscriptionId;
    uint32 private immutable callbackGasLimit;

    address private recentWinner;
    State private state;
    uint256 private lastTimestamp;
    uint256 private immutable interval;
    uint256 private immutable fee;
    address payable private immutable organizer;

    uint16 private constant NUMBER_OF_REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    event LotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorAddress,
        uint256 _entranceFee,
        bytes32 _gasLane,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint256 _interval,
        uint256 _fee
    ) VRFConsumerBaseV2(vrfCoordinatorAddress) {
        entranceFee = _entranceFee;
        vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorAddress);
        gasLane = _gasLane;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        state = State.OPEN;
        lastTimestamp = block.timestamp;
        interval = _interval;
        fee = _fee;
        organizer = payable(msg.sender);
    }

    function enterLottery() public payable {
        if (msg.value < entranceFee) {
            revert Lottery__NotEnoughEthToEnter();
        }
        if (state != State.OPEN) {
            revert Lottery__NotOpen();
        }
        players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for `upkeepNeeded` to return True.
     * the following should be true for this to return true:
     * 1. The time interval has passed between lottery runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */
    function checkUpkeep(
        bytes memory
    ) public override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded =
            state == State.OPEN &&
            (block.timestamp - lastTimestamp) > interval &&
            players.length > 0 &&
            address(this).balance > 0;

        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(bytes calldata) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded(
                address(this).balance,
                players.length,
                uint256(state)
            );
        }

        state = State.CALCULATING;

        emit RequestedLotteryWinner(
            vrfCoordinator.requestRandomWords(
                gasLane,
                subscriptionId,
                NUMBER_OF_REQUEST_CONFIRMATIONS,
                callbackGasLimit,
                NUM_WORDS
            )
        );
    }

    function fulfillRandomWords(
        uint256,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % players.length;
        recentWinner = players[indexOfWinner];
        players = new address payable[](0);
        lastTimestamp = block.timestamp;
        state = State.OPEN;
        (uint256 prize, uint256 organizerFee) = getPaymentsAmounts();
        (bool success, ) = recentWinner.call{value: prize}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        organizer.transfer(organizerFee);

        emit WinnerPicked(recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return players[index];
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getLotteryState() public view returns (State) {
        return state;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return players.length;
    }

    function getLatestTimestamp() public view returns (uint256) {
        return lastTimestamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return NUMBER_OF_REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return interval;
    }

    function getPaymentsAmounts()
        internal
        view
        returns (uint256 prize, uint256 organizerFee)
    {
        organizerFee = (address(this).balance * fee) / 100;
        prize = address(this).balance - organizerFee;
    }
}
