"use server";
import type { Asset } from "@/types/Asset";
import { PrivyClient } from "@privy-io/server-auth";
import type { Address } from "thirdweb/utils";
import { getBalance } from "thirdweb/extensions/erc20";
import { defineChain, getContract } from "thirdweb";
import { client } from "@/constants/client";
import { getOwnedTokenIds as getOwnedErc721TokenIds } from "thirdweb/extensions/erc721";
import { getOwnedTokenIds as getOwnedErc1155TokenIds } from "thirdweb/extensions/erc1155";
import { getAddress } from "thirdweb/utils";
import assets from "@/config/assets";
import { getWalletBalance } from "thirdweb/wallets";

export type MigrationStatus =
	| {
			address: Address;
			migrationCompleted: boolean;
			assetsToMigrate: Asset[];
	  }
	| {
			address?: Address;
			migrationCompleted: true;
			assetsToMigrate: [];
	  };

const privyClient = new PrivyClient(
	process.env.NEXT_PUBLIC_PRIVY_APP_ID as string,
	process.env.PRIVY_APP_SECRET as string,
);

export const getMigrationStatus = async (
	email: string,
): Promise<MigrationStatus> => {
	const privyUser = await privyClient.getUserByEmail(email);
	if (!privyUser) {
		return {
			migrationCompleted: true,
			assetsToMigrate: [],
		};
	}

	const address = getAddress(privyUser.wallet?.address || "");

	const ownedAssets = (
		await Promise.all(
			assets.map(async (asset: Asset) => {
				const owned = await countOwnedAssets(address, asset);
				if (owned > 0) {
					return asset;
				}
				return null;
			}),
		)
	).filter((asset) => asset !== null);

	return {
		address,
		migrationCompleted: ownedAssets.length === 0,
		assetsToMigrate: ownedAssets,
	} satisfies MigrationStatus;
};

const countOwnedAssets = async (address: string, asset: Asset) => {
	if (asset.type === "NATIVE") {
		return getWalletBalance({
			address,
			chain: defineChain(asset.chainId),
			client,
		}).then((result) => Number(result.value));
	}

	const contract = getContract({
		address: asset.address,
		client,
		chain: defineChain(asset.chainId),
	});

	switch (asset.type) {
		case "ERC20":
			return getBalance({
				address,
				contract,
			}).then((result) => Number(result.value));
		case "ERC721":
			return getOwnedErc721TokenIds({
				owner: address,
				contract,
			}).then((result) => result.length);
		case "ERC1155":
			return getOwnedErc1155TokenIds({
				address,
				contract,
			}).then((result) => result.length);
	}
};
