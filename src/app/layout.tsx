import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { client } from "@/constants/client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "thirdweb migration",
	description: "Migrate from any in-app wallet provider to thirdweb",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<ThirdwebProvider>
					<AutoConnect client={client} />
					{children}
				</ThirdwebProvider>
			</body>
		</html>
	);
}
