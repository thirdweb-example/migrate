import { client } from "@/constants/client";
import {
	type ThirdwebContract,
	estimateGas,
	eth_getTransactionCount,
	getContract,
	getRpcClient,
	prepareTransaction,
	sendTransaction,
} from "thirdweb";
import {
	getBalance,
	transfer as transferErc20,
} from "thirdweb/extensions/erc20";
import { defineChain } from "thirdweb/chains";
import { getWalletBalance, type Account } from "thirdweb/wallets";
import {
	getOwnedTokenIds as getOwnedErc721TokenIds,
	transferFrom as transferErc721,
} from "thirdweb/extensions/erc721";
import {
	getOwnedTokenIds as getOwnedErc1155TokenIds,
	safeTransferFrom as transferErc1155,
} from "thirdweb/extensions/erc1155";
import assets from "@/config/assets";

export async function migrate(account: Account, recipient: Account) {
	const nonces: Record<number, number> = {};

	for (const asset of assets.filter((asset) => asset.type !== "NATIVE")) {
		if (nonces[asset.chainId]) {
			nonces[asset.chainId]++;
		} else {
			nonces[asset.chainId] = await getNonce(asset.chainId, account);
		}

		const contract = getContract({
			address: asset.address,
			client,
			chain: defineChain(asset.chainId),
		});

		switch (asset.type) {
			case "ERC20": {
				migrateERC20(account, recipient, contract, nonces[asset.chainId]);
				break;
			}
			case "ERC721":
				migrateERC721(account, recipient, contract, nonces[asset.chainId]);
				break;
			case "ERC1155":
				migrateERC1155(account, recipient, contract, nonces[asset.chainId]);
				break;
		}
	}

	await Promise.all(
		assets
			.filter((asset) => asset.type === "NATIVE")
			.map(async (asset) => {
				await migrateNative(account, recipient, asset.chainId);
			}),
	);
}

async function getNonce(chainId: number, account: Account) {
	const rpc = getRpcClient({
		chain: defineChain(chainId),
		client,
	});
	const nonce = await eth_getTransactionCount(rpc, {
		address: account.address,
	});
	return nonce;
}

async function migrateERC20(
	account: Account,
	recipient: Account,
	contract: ThirdwebContract,
	nonce: number,
) {
	try {
		const balance = await getBalance({
			address: account.address,
			contract,
		});

		if (balance.value === 0n) {
			return;
		}

		const transaction = transferErc20({
			to: recipient.address,
			amountWei: balance.value,
			contract,
		});

		return sendTransaction({
			transaction,
			account,
		});
	} catch (error) {
		console.error("error migrating erc20", error);
	}
}

async function migrateERC721(
	account: Account,
	recipient: Account,
	contract: ThirdwebContract,
	nonce: number,
) {
	try {
		const tokenIds = await getOwnedErc721TokenIds({
			owner: account.address,
			contract,
		});

		if (tokenIds.length === 0) {
			return;
		}

		const transactions = tokenIds.map((tokenId) => {
			return transferErc721({
				from: account.address,
				to: recipient.address,
				tokenId,
				contract,
				overrides: {
					nonce,
				},
			});
		});

		return Promise.all(
			transactions.map((transaction) =>
				sendTransaction({
					transaction,
					account,
				}),
			),
		);
	} catch (error) {
		console.error("error migrating erc721", error);
	}
}

async function migrateERC1155(
	account: Account,
	recipient: Account,
	contract: ThirdwebContract,
	nonce: number,
) {
	try {
		const tokens = await getOwnedErc1155TokenIds({
			address: account.address,
			contract,
		});

		if (tokens.length === 0) {
			return;
		}

		const transactions = tokens.map((token) => {
			return transferErc1155({
				from: account.address,
				to: recipient.address,
				tokenId: token.tokenId,
				value: token.balance,
				data: "0x",
				contract,
				overrides: {
					nonce,
				},
			});
		});

		return Promise.all(
			transactions.map((transaction) =>
				sendTransaction({
					transaction,
					account,
				}),
			),
		);
	} catch (error) {
		console.error("error migrating erc1155", error);
	}
}

async function migrateNative(
	account: Account,
	recipient: Account,
	chainId: number,
) {
	try {
		const balance = await getWalletBalance({
			address: account.address,
			chain: defineChain(chainId),
			client,
		});

		if (balance.value === 0n) {
			return;
		}

		const transactionBeforeGasEstimate = prepareTransaction({
			to: recipient.address,
			value: balance.value,
			chain: defineChain(chainId),
			client,
		});

		const gas = await estimateGas({
			transaction: transactionBeforeGasEstimate,
			from: account.address,
		});

		const transaction = prepareTransaction({
			to: recipient.address,
			value: balance.value - (gas * 120n) / 100n, // 20% gas buffer
			chain: defineChain(chainId),
			client,
		});

		return sendTransaction({
			transaction,
			account,
		});
	} catch (error) {
		console.error("error migrating native", error);
	}
}
