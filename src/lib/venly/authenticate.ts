"use server";

import type { VyUserAuth, VyUserDto } from "@venly/venly-core-sdk";

type VenlyAuthenticateResult = {
	auth: VyUserAuth;
	user: VyUserDto;
};

export default async function authenticate({
	email,
}: { email: string }): Promise<VenlyAuthenticateResult> {
	// Add your logic to sign into Venly here
	console.log("Put your logic here to authenticate with Venly here", email);
	throw new Error("Not implemented");
}
