import type { Asset } from "@/types/Asset";

export default [
	{
		type: "ERC20",
		address: "0xBe6462706BB42A9E62aF2f29c377a277584eef5e",
		chainId: 11155111,
	},
	{
		type: "ERC721",
		address: "0x4a7636dDD4aD029B163a788Bfa51A94a1b758784",
		chainId: 11155111,
	},
	// {
	// 	type: "NATIVE",
	// 	chainId: 84532,
	// },
	// {
	// 	type: "NATIVE",
	// 	chainId: 11155111,
	// },
] as readonly Asset[];
