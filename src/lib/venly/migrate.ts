"use server";
import { client } from "@/constants/client";
import {
	Address,
	estimateGas,
	getContract,
	prepareTransaction,
} from "thirdweb";
import {
	getBalance,
} from "thirdweb/extensions/erc20";
import { defineChain } from "thirdweb/chains";
import { getWalletBalance } from "thirdweb/wallets";
import {
	getOwnedTokenIds as getOwnedErc721TokenIds,
} from "thirdweb/extensions/erc721";
import assets from "@/config/assets";
import { Venly, VyBuildTransactionRequestType, VyChain, VyEnvironment, VyQuery_GetWallets, VyUserAuth, VyWalletDto } from "@venly/venly-core-sdk";
import authenticate from "./authenticate";

export async function migrate(email: string, recipientAddress: Address) {
	const { auth, user } = await authenticate({ email });
	Venly.initialize(process.env.VENLY_ID!, process.env.VENLY_SECRET!, VyEnvironment.Production);

	const wallets = await Venly.Wallet.getWallets(new VyQuery_GetWallets({ userId: user.id! }));
	const wallet = wallets.data[0];

	for (const asset of assets.filter((asset) => asset.type !== "NATIVE")) {

		if (!wallet) {
			throw new Error("Wallet not found for user");
		}

		switch (asset.type) {
			case "ERC20": {
				migrateERC20(auth, wallet, recipientAddress, asset.address, asset.chain, asset.chainId);
				break;
			}
			case "ERC721":
				migrateERC721(auth, wallet, recipientAddress, asset.address, asset.chain, asset.chainId);
				break;
		}
	}

	await Promise.all(
		assets
			.filter((asset) => asset.type === "NATIVE")
			.map(async (asset) => {
				await migrateNative(auth, wallet, recipientAddress, asset.chain, asset.chainId);
			}),
	);
}

async function migrateERC20(
	user: VyUserAuth,
	wallet: VyWalletDto,
	recipient: Address,
	address: Address,
	chain: VyChain,
	chainId: number,
) {
	if (!wallet.address) {
		throw new Error("Wallet address is not set");
	}

	try {
		const balance = await getBalance({
			address: wallet.address,
			contract: getContract({
				address,
				client,
				chain: defineChain(chainId),
			}),
		});

		if (balance.value === 0n) {
			return;
		}

		const result = await Venly.Wallet.transferErc20Token({
			type: VyBuildTransactionRequestType.TokenTransfer,
			walletFromId: wallet.id,
			toAddress: recipient,
			chain,
			tokenAddress: address,
			value: Number(balance.value),
		},
			user
		);

		return result.data.transactionHash;
	} catch (error) {
		console.error("error migrating erc20", error);
	}
}

async function migrateERC721(
	user: VyUserAuth,
	wallet: VyWalletDto,
	recipient: Address,
	address: Address,
	chain: VyChain,
	chainId: number,
) {
	if (!wallet.address) {
		throw new Error("Wallet address is not set");
	}

	try {
		const tokenIds = await getOwnedErc721TokenIds({
			owner: wallet.address,
			contract: getContract({
				address,
				client,
				chain: defineChain(chainId),
			}),
		});

		if (tokenIds.length === 0) {
			return;
		}

		const transactions = await Promise.all(tokenIds.map(async (tokenId) => {
			return (await Venly.Wallet.transferNonFungibleToken({
				type: VyBuildTransactionRequestType.TokenTransfer,
				walletFromId: wallet.id,
				toAddress: recipient,
				chain,
				tokenContractAddress: address,
				tokenId: Number(tokenId),
			}, user)).data.transactionHash;
		}));

		return transactions;
	} catch (error) {
		console.error("error migrating erc721", error);
	}
}

async function migrateNative(
	user: VyUserAuth,
	wallet: VyWalletDto,
	recipient: Address,
	chain: VyChain,
	chainId: number,
) {
	if (!wallet.address) {
		throw new Error("Wallet address is not set");
	}

	try {
		const balance = await getWalletBalance({
			address: wallet.address,
			chain: defineChain(chainId),
			client,
		});

		if (balance.value === 0n) {
			return;
		}

		const transactionBeforeGasEstimate = prepareTransaction({
			to: recipient,
			value: balance.value,
			chain: defineChain(chainId),
			client,
		});

		const gas = await estimateGas({
			transaction: transactionBeforeGasEstimate,
			from: wallet.address,
		});

		const result = await Venly.Wallet.transferNativeToken({
			type: VyBuildTransactionRequestType.TokenTransfer,
			walletFromId: wallet.id,
			toAddress: recipient,
			chain,
			value: Number(balance.value - (gas * 120n) / 100n), // 20% gas buffer
		},
			user
		);

		return result.data.transactionHash;
	} catch (error) {
		console.error("error migrating native", error);
	}
}
