import type { VyChain } from "@venly/venly-core-sdk";
import type { Address } from "thirdweb";

type AssetType = "ERC20" | "ERC721" | "ERC1155";
export type Asset =
	| {
			type: AssetType;
			address: Address;
			chainId: number;
			chain: VyChain;
	  }
	| {
			type: "NATIVE";
			chainId: number;
			chain: VyChain;
	  };
