import { run } from 'hardhat';

const verify = async (contractAddress: string, args: unknown[], log: (m: string) => void) => {
    log('Verifying contract');
    try {
        await run('verify:verify', {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes('already verified')) {
            log('Already verified!');
        } else {
            log(e);
        }
    }
};

export default verify;
