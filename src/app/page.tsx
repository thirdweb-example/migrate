"use client";
import { client } from "@/constants/client";
import { ConnectButton } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import MigrateVenly from "@/app/venly/VenlyMigration";

export default function Home() {
	return (
		<main className="p-4 pb-10 min-h-[100vh] flex items-center justify-center container max-w-screen-lg mx-auto">
			<div className="flex items-center flex-col gap-8">
				<ConnectButton
					client={client}
					wallets={[
						inAppWallet({
							auth: {
								options: ["email"],
							},
						}),
					]}
				/>
				<MigrateVenly />
			</div>
		</main>
	);
}
