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


```tsx
import { useEffect } from "react";
import { getUserEmail } from "thirdweb/wallets/in-app";

...

useEffect(() => {
  const checkMigrationStatus = async () => {
    const email = await getUserEmail({ client });
  };

  if (account) {
    checkMigrationStatus();
  }
}, [account]);
```

> Note: We use built-in React hooks like `useEffect` and `useMemo` throughout this example for simplicity, but recommend using [Tanstack React Query](https://tanstack.com/query/latest/docs/framework/react/overview) for production apps.

Once we have the user's email, we call `getMigrationStatus` to check if a migration is necessary.

```tsx
import { useEffect, useState } from "react";
import { getUserEmail } from "thirdweb/wallets/in-app";

...

const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | undefined>();
const [email, setEmail] = useState<string | undefined>();
useEffect(() => {
  const checkMigrationStatus = async () => {
    const email = await getUserEmail({ client });
    if (!email) throw new Error("User has no email");
    setEmail(email);
    return await getMigrationStatus({ client, email });
  };

  if (account) {
    checkMigrationStatus().then(setMigrationStatus);
  }
}, [account]);
```

We save the migration status (set to a `MigrationStatus` type in the example) and the user's email address in state variables for use in the child component.

### 3. Getting the user from Privy

In `getMigrationStatus`, we use Privy's `@privy-io/server-auth` package to get the user from their email. Once we have the user wallet address, we check each asset specified in `/config/assets.ts` to see if it's present in the user's legacy wallet.

```tsx
import { PrivyClient } from "@privy-io/server-auth";
import { getAddress } from "thirdweb/utils";

const privyClient = new PrivyClient({
  apiKey: process.env.PRIVY_API_KEY,
  apiSecret: process.env.PRIVY_API_SECRET,
});

const privyUser = await privyClient.getUserByEmail(email);

const address = getAddress(privyUser.wallet?.address || "");

// Check for owned assets, see `/lib/privy/getMigrationStatus.ts` for full implementation
```

### 4. Migrate the assets

Back in `/app/privy/PrivyMigration.tsx`, if migration status is set to a value with `migrationStatus.migrationCompleted` set to `false`, we render the `MigratePrivy` component, passing both the email (for Privy login) and the user's Privy wallet address. If migration has already been completed this component never renders and the user's UI is unaffected.

The `MigratePrivy` component handles the Privy auth process and will initially display the `PrivyLogin` component (while the `authenticated` value from the `usePrivy` hook is `false`). This component triggers a normal Privy login using their modal. We've added a `useEffect` hook to wait for the initial login field to display, autofill with the user's email, and send the OTP code. This slightly improves the user experience but isn't required. The user will still need to enter the OTP code they receive from Privy to authenticate to the old wallet.

Once the user has authenticated, we find the wallet that matches the one we're trying to migrate using Privy's `useWallets` hook. Once the user clicks the "Start Migrating" button, we kickoff `runMigration` to convert this wallet into a thirdweb account and send the necessary transactions.

To convert the Privy wallet to a thirdweb account, we use thirdweb's Ethers 5 adapter.
```tsx
import { ethers5Adapter } from "thirdweb/adapters/ethers5";

...

const provider = await privyWallet.getEthersProvider();
const signer = provider.getSigner();
const account = await ethers5Adapter.signer.fromEthers({ signer });
```

Once we have the account, we call `migrate` from `/lib/privy/migrate.ts` to send the necessary transactions. This file iterates through the assets specified in `/config/assets.ts` and sends all assets from the legacy wallet to the new one.

`migrate` will finish before all transactions are mined, so the users won't appear in users' wallets immediately. This is due to limitations with Privy's wallets.

> Privy wallets are build on Ethers 5 and could run into issues sending large amounts of transactions at once. We do some basic nonce management to handle this but if you run into any issues, please reach out to us via our [support site](https://thirdweb.com/support) and we can help resolve them.

Your users assets are now migrated. In the event any transactions fail, the process will repeat the same migration status check whenever they refresh the page and can retry the migration.

---

## Documentation

Check out our in-app wallet documentation to learn more:

-   [In-App Wallets](https://portal.thirdweb.com/connect/in-app-wallet/overview)
-   [TypeScript SDK](https://portal.thirdweb.com/typescript/v5)

## Support

If you have trouble with this repository, please reach out to us via our [support site](https://thirdweb.com/support).
