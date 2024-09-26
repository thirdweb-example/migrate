import type { Address } from "thirdweb";

type AssetType = "ERC20" | "ERC721" | "ERC1155";
export type Asset =
	| {
			type: AssetType;
			address: Address;
			chainId: number;
	  }
	| {
			type: "NATIVE";
			chainId: number;
	  };
