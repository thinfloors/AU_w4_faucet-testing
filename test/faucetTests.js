const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { utils } = require("ethers");

describe("Faucet", function () {
    async function deployContractAndSetVariables() {
        const Faucet = await ethers.getContractFactory("Faucet");
        // Deploying with 2 eth to test withdrawAll function
        const faucet = await Faucet.deploy({
            value: utils.parseEther("2.0"),
        });

        console.log(`Faucet deployed at: ${faucet.address}`);

        const [owner, nonOwner] = await ethers.getSigners();

        const withdrawAmount = ethers.utils.parseUnits("0.11", "ether");
        const faucetAddress = faucet.address;
        const ownerAddress = owner.address;

        console.log(`Owner address is: ${owner.address}`);
        console.log(`Non owner address is ${nonOwner.address}`);

        return {
            faucet,
            owner,
            nonOwner,
            withdrawAmount,
            faucetAddress,
            ownerAddress,
        };
    }

    it("Should deploy contract and set owner address correctly", async function () {
        const { faucet, owner } = await loadFixture(
            deployContractAndSetVariables
        );
        expect(await faucet.owner()).to.be.equal(owner.address);
    });
    it("Should revert when trying to withdraw >0.1 eth with the withdraw() function", async function () {
        const { faucet, withdrawAmount } = await loadFixture(
            deployContractAndSetVariables
        );
        await expect(faucet.withdraw(withdrawAmount)).to.be.reverted;
    });
    it("Should only allow the owner to call withdrawAll and selfdestruct functions", async function () {
        const { faucet, nonOwner } = await loadFixture(
            deployContractAndSetVariables
        );
        await expect(faucet.connect(nonOwner).withdrawAll()).to.be.reverted;
        await expect(faucet.connect(nonOwner).destroyFaucet()).to.be.reverted;
    });
    it("Calling destroyFunction should actually delete the code of the smart contract", async function () {
        const { faucet, owner, faucetAddress } = await loadFixture(
            deployContractAndSetVariables
        );
        await faucet.connect(owner).destroyFaucet();
        const contractCode = await ethers.provider.getCode(faucetAddress);
        console.log(contractCode);
        expect(contractCode).to.be.equal("0x");
    });
    it("The contract's entire eth balance should be emptied when destroyFaucet() is called", async function () {
        const { faucet, faucetAddress, owner, ownerAddress } =
            await loadFixture(deployContractAndSetVariables);

        // Need variables to test balances including gas
        const initialOwnerBalance = await ethers.provider.getBalance(
            ownerAddress
        );
        const initialContractBalance = await ethers.provider.getBalance(
            faucetAddress
        );

        destroyTx = await faucet.connect(owner).destroyFaucet();
        receipt = await destroyTx.wait();

        const addressBalance = await ethers.provider.getBalance(faucetAddress);
        const ownerBalance = await ethers.provider.getBalance(ownerAddress);

        // Need to calculate gas used for testing owner balance
        console.log(receipt);
        const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);

        expect(addressBalance).to.be.equal(0);

        // Testing whether faucet address + initial owner address is equal to
        // ending owner address + gas cost
        expect(initialOwnerBalance.add(initialContractBalance)).to.be.equal(
            ownerBalance.add(gasCost)
        );
    });
});
