![Group 1](https://github.com/thirdweb-example/thirdweb-auth-express/assets/17715009/06383e68-9c65-4265-8505-e88e573443f9)

# Migrate Venly Wallets to thirdweb

[<img alt="thirdweb SDK" src="https://img.shields.io/npm/v/thirdweb?label=Thirdweb SDK&style=for-the-badge&logo=npm" height="30">](https://www.npmjs.com/package/thirdweb)
[<img alt="Discord" src="https://img.shields.io/discord/834227967404146718.svg?color=7289da&label=discord&logo=discord&style=for-the-badge" height="30">](https://discord.gg/thirdweb)

## How to use this repository

This repository is meant to be a starting point from migrating your Venly users to thirdweb's in-app wallets. It should be easy to customize it to fit within your app and provide a smooth migration experience for all users.

## Things to know

1. This example involves no interactions with private keys
2. Because Venly provides backend access to wallets, specific implentations vary significantly. We've left certain portions of the logic unimplemented to allow you to customize the migration process to fit your needs. **This example will not work out of the box, it's purely a starting point.**
3. All users' wallets will need enough native funds to pay for the migration transfers. These funds can be airdropped to users using [Engine](https://thirdweb.com/engine) or another solution, or paid for by the users themselves.

---

## Getting started

First, install the dependencies by running:

```bash
pnpm install
```

Then, copy the `.env.example` file to `.env` and fill in the values for the environment variables. You'll need a thirdweb client ID and secret, which you can generate for free [here](https://thirdweb.com/dashboard/settings/api-keys).

Finally, run the app locally:

```bash
pnpm dev
```

To run the app for production, use:

```bash
pnpm build && pnpm start
```

---

## How the migration works

All assets you'd like to migrate should be added to `/config/assets.ts`. This includes native assets (using type "NATIVE"). Assets will be sent in the order specified so be sure to put the native assets last so users will still have funds to pay for gas.

> Currently, this example is setup to migrate wallets using email authentication. If you have an application that uses a different authentication method and would like to migrate, please reach out via our [support site](https://thirdweb.com/support) and we'll work with you to add support.

### 1. Sign in with thirdweb

Users first sign in to their new thirdweb account. Ideally, users should use the same login method as they used to sign in with Privy. This way we can easily identify if they have a legacy (Privy) wallet and which assets need to be migrated. In this example we use the thirdweb [`ConnectButton`](https://portal.thirdweb.com/react/v5/ConnectButton) to handle the login, but you can just as easily [create your own UI](https://portal.thirdweb.com/react/v5/getting-started).

```tsx
import { ConnectButton } from "@thirdweb-dev/react";

...

<ConnectButton
  client={client}
  wallets={[
    inAppWallet({
      auth: {
        options: ["email"] 
      },
    }),
  }
/>
```

> Note: All the logic going forward is contained within the `VenlyMigration` component in `/app/venly/VenlyMigration.tsx` and the functions found in `/lib/venly/`. This keeps the Venly-specific logic self-contained and easy to integrate into your own app.

### 2. Check for legacy wallets

Once a user is connected, we get the user email to be passed to your own Venly authentication (to be implemented in `/lib/venly/authenticate.ts`). This allows you to check for an existing user that shares this same email address. If there is a user, migration should be run.

### 4. Migrate the assets

Once we have authenticated the user's Venly account, we call the `migrate` function from `/lib/venly/migrate.ts` to initiate the asset migration process. This function performs the following steps:

1. Authenticate the user using their email address.
2. Initialize the Venly SDK with the provided credentials.
3. Retrieve the user's Venly wallet.
4. Iterate through the assets defined in `/config/assets.ts`, excluding native assets initially.
5. For each asset type (ERC20, ERC721), call the appropriate migration function.
6. Finally, migrate native assets (e.g., ETH) last to ensure gas fees can be covered.

The migration process handles different asset types:

- **ERC20 Tokens**: 
  - Check the balance of the token in the Venly wallet.
  - If the balance is non-zero, transfer the entire balance to the new thirdweb wallet.

- **ERC721 Tokens (NFTs)**:
  - Retrieve all token IDs owned by the Venly wallet for the specific NFT contract.
  - For each token ID, initiate a transfer to the new thirdweb wallet.

- **Native Tokens**:
  - Check the native token balance in the Venly wallet.
  - Estimate the gas required for the transfer.
  - Transfer the balance minus the estimated gas (with a 20% buffer) to the new thirdweb wallet.

Important considerations:

1. **Error Handling**: Each migration function includes error handling to log any issues that occur during the process.

2. **Gas Management**: For native token transfers, the function estimates gas and leaves a buffer to ensure the transaction can be completed.

3. **Asynchronous Operations**: The migration process uses async/await to handle multiple asynchronous operations, including balance checks and transfers.

4. **Venly SDK Integration**: The process utilizes Venly's SDK for wallet operations and transfers, ensuring compatibility with the Venly ecosystem.

5. **Flexibility**: The migration process is designed to handle various asset types and can be easily extended to support additional token standards if needed.

After the migration process completes, all supported assets from the user's Venly wallet should be transferred to their new thirdweb wallet. It's important to note that blockchain transactions may take some time to be confirmed, so the assets might not appear immediately in the new wallet.

---


---

## Documentation

Check out our in-app wallet documentation to learn more:

-   [In-App Wallets](https://portal.thirdweb.com/connect/in-app-wallet/overview)
-   [TypeScript SDK](https://portal.thirdweb.com/typescript/v5)

## Support

If you have trouble with this repository, please reach out to us via our [support site](https://thirdweb.com/support).
