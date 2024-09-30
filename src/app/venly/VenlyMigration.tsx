import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/button";
import { migrate } from "@/lib/venly/migrate";
import { client } from "@/constants/client";
import { getUserEmail } from "thirdweb/wallets";
import { getAddress } from "thirdweb";

export default function VenlyMigration() {
	const recipientAccount = useActiveAccount();
	const [migrating, setMigrating] = useState<
		"incomplete" | "pending" | "complete"
	>("incomplete");

	return (
		<div className="flex flex-col gap-2 border border-white/50 rounded-md shadow-md max-w-md mx-auto p-8">
			<h1 className="text-2xl font-semibold">
				This app is upgrading wallets for a better experience
			</h1>
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
								!recipientAccount || migrating === "pending"
							}
							onClick={() => {
								if (!recipientAccount) return;
								setMigrating("pending");
								getUserEmail({ client }).then(async (email) => {
									if (!email) throw new Error("No email found for user");
									await migrate(email, getAddress(recipientAccount.address))
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
		</div>
	);
}

