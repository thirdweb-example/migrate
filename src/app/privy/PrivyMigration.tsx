import { migrate } from "@/lib/privy/migrate";
import {
	addRpcUrlOverrideToChain,
	type ConnectedWallet as PrivyConnectedWallet,
	PrivyProvider,
	usePrivy,
	useWallets as usePrivyWallets,
} from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { useActiveAccount } from "thirdweb/react";
import type { Account } from "thirdweb/wallets";
import { Button } from "@/components/button";
import { defineChain } from "thirdweb";
import assets from "@/config/assets";
import {
	getMigrationStatus,
	type MigrationStatus,
} from "@/lib/privy/migration-status";
import { getUserEmail } from "thirdweb/wallets/in-app";
import { client } from "@/constants/client";

const overridePrivyRpc = async () => {
	for (const asset of assets) {
		const thirdwebChain = defineChain(asset.chainId);
		addRpcUrlOverrideToChain(
			{
				id: thirdwebChain.id,
				name: thirdwebChain.name || "",
				nativeCurrency: {
					name: thirdwebChain.nativeCurrency?.name || "",
					symbol: thirdwebChain.nativeCurrency?.symbol || "ETH",
					decimals: thirdwebChain.nativeCurrency?.decimals || 18,
				},
				rpcUrls: { default: { http: [thirdwebChain.rpc] } },
			},
			defineChain(asset.chainId).rpc,
		);
	}
};

const runMigration = async (
	wallet: PrivyConnectedWallet,
	recipientAccount: Account,
) => {
	overridePrivyRpc();
	const provider = await wallet.getEthersProvider();
	const signer = provider.getSigner();
	const account = await ethers5Adapter.signer.fromEthers({ signer });
	await migrate(account, recipientAccount);
};

export default function PrivyMigration() {
	const account = useActiveAccount();
	const [migrationStatus, setMigrationStatus] = useState<
		MigrationStatus | undefined
	>();
	const [email, setEmail] = useState<string | undefined>();

	useEffect(() => {
		const checkMigrationStatus = async () => {
			const email = await getUserEmail({ client });
			if (!email) throw new Error("No email");
			setEmail(email);
			return await getMigrationStatus(email);
		};
		if (account) {
			checkMigrationStatus().then(setMigrationStatus);
		}
	}, [account]);

	return (
		<PrivyProvider
			appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
			config={{
				embeddedWallets: {
					createOnLogin: "users-without-wallets",
				},
			}}
		>
			{migrationStatus && !migrationStatus.migrationCompleted && email && (
				<MigratePrivy email={email} address={migrationStatus.address} />
			)}
		</PrivyProvider>
	);
}

function MigratePrivy({ email, address }: { email: string; address: string }) {
	const recipientAccount = useActiveAccount();
	const [migrating, setMigrating] = useState<
		"incomplete" | "pending" | "complete"
	>("incomplete");

	const { wallets } = usePrivyWallets();
	const { authenticated } = usePrivy();
	const wallet = useMemo(
		() => wallets.find((wallet) => wallet.address === address),
		[wallets, address],
	);

	return (
		<div className="flex flex-col gap-2 border border-white/50 rounded-md shadow-md max-w-md mx-auto p-8">
			<h1 className="text-2xl font-semibold">
				This app is upgrading wallets for a better experience
			</h1>
			{authenticated ? (
				<div className="flex text-sm flex-col gap-2">
					{migrating === "complete" ? (
						<p>
							Migration complete! Your assets are now being transferred to your
							new wallet and will arrive shortly.
						</p>
					) : (
						<>
							<p>Click below to migrate your assets to the new wallet.</p>
							<Button
								disabled={
									!wallet || !recipientAccount || migrating === "pending"
								}
								onClick={() => {
									if (!wallet || !recipientAccount) return;
									setMigrating("pending");
									runMigration(wallet, recipientAccount).then(() => {
										setMigrating("complete");
									});
								}}
								className="mt-2"
							>
								{migrating === "pending" ? (
									<p>Migrating...</p>
								) : (
									<p>Start Migration</p>
								)}
							</Button>
						</>
					)}
				</div>
			) : (
				<div className="flex flex-col gap-2 text-sm">
					<p className="mb-2">
						We'll need to migrate your wallet to a new address to provide you
						with an improved app experience. Login with your legacy wallet to
						continue.
					</p>
					<PrivyLogin email={email} />
				</div>
			)}
		</div>
	);
}

function PrivyLogin({ email }: { email: string }) {
	const { login: privyLogin } = usePrivy();
	const [loginTriggered, setLoginTriggered] = useState(false);

	useEffect(() => {
		if (loginTriggered) {
			const timeoutId = setTimeout(() => {
				let submitButton = undefined;
				const buttons = document.querySelectorAll("button");
				for (const button of buttons) {
					if (button.textContent?.trim() === "Submit") {
						console.log("Found submit button");
						submitButton = button;
						setLoginTriggered(false);
						break;
					}
				}

				if (submitButton) {
					submitButton.click();
				} else {
					console.log("Submit button not found");
				}
			}, 500);
			return () => clearTimeout(timeoutId);
		}
	}, [loginTriggered]);

	return (
		<Button
			className="whitespace-nowrap"
			onClick={() => {
				privyLogin({ prefill: { type: "email", value: email } });
				setLoginTriggered(true);
			}}
		>
			Login with Legacy
		</Button>
	);
}
