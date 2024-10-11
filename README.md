---

# Swarm Open dOTC

## Purpose of the Project

The overarching goal of this project is to provide a secure, decentralized platform for trading various types of digital assets without needing a centralized authority. This approach enhances transparency, security, and trust among participants while also leveraging blockchain technology to automate many aspects of traditional OTC trading. By using smart contracts, the platform can reduce the risk of fraud, speed up transactions, and decrease the costs associated with trading, thereby making it accessible to a broader range of participants globally.

## How to add price feed/authorization address

1. Fork a repo

### 1. DotcManagerV2 Contract

This contract acts as a configuration and management hub for the trading platform, handling:

- Fee Management: Sets and updates trading fees.
- Contract Address Management: Manages addresses of other related contracts, such as the Dotc and Escrow contracts.
- Asset Standardization: Standardizes asset amounts based on their type and specific token standards to facilitate consistent and accurate trading operations.

### 2. DotcV2 Contract

This contract serves as the core of the decentralized trading system. It enables users to create, manage, and interact with trading offers in a decentralized manner. Key features include:

- Offer Creation and Management: Users can create trading offers specifying the assets they want to deposit and receive. Offers can be full or partial, catering to different trading needs.
- Trade Execution: Offers can be taken by other users, facilitating the exchange of assets according to the specified terms.
- Offer Cancellation: Makers of offers can cancel their offers under certain conditions, returning the deposited assets.
- Asset and Offer Validations: Various checks ensure that offers and assets meet specific criteria, preventing common errors such as zero amounts or invalid asset types.

### 3. DotcEscrowV2 Contract

This contract manages the escrow mechanism essential for secure trading:

- Asset Escrow: Holds assets in escrow during the trading process to ensure that they are only transferred upon successful trade completion.
- Fee Handling: Manages the collection and distribution of trading fees.
- Offer Deposit and Withdrawal: Handles the logistics of depositing and withdrawing assets for offers, ensuring that assets are only moved according to the rules of the platform.

---

# Requirements

## [Functional requirements here](docs/FunctionalRequirements)

## [Technical requirements here](docs/TechnicalRequirements/OpenDotc/v2)

# Audit Reports

## [PeckShield](docs/PeckShield-Audit-Report-dOTC-v1.0.pdf)

---

## [Deployment/Development instructions here](INSTRUCTIONS.md)

---

## Review process and merge criteria

### Process overview

1. Follow the instructions below to create a PR that would [Adding a price feed address to the list](#Adding-a-price-feed-address-to-the-list) or [Adding an authorization address to the list](#Adding-an-authorization-address-to-the-list).
2. Wait for a reviewer to kick off the [automated checks](#automated-checks).
3. After the automated checks pass and a reviewer approves the PR, then it will automatically be merged.

### Automated checks

Our CI performs a series of automated checks on every PR.
These automated checks take place as part of the `Validate PR` check.
Some issues raised by CI will trigger an error and must be resolved before your PR will be approved.
These issues are marked below as "auto-reject" issues.
Other issues will surface a warning, and will require a manual review from a reviewer.
These issues are marked below as "requires manual review".

- Given tokens actually exist on all specified chains (auto-reject)
- L1 tokens are verified on Etherscan (auto-reject)
- Description is under 1000 characters (auto-reject)
- Token `name`, `symbol`, and `decimals` matches on-chain data (auto-reject)
  - If `overrides` are used (requires manual review)
- L2 token was deployed by the [StandardTokenFactory](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts/contracts/L2/messaging/L2StandardTokenFactory.sol) or is an [L2StandardERC20](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts/contracts/standards/L2StandardERC20.sol) token that uses the standard L2 bridge address (`0x4200000000000000000000000000000000000010`) (requires manual review)
- Ethereum token listed on the [CoinGecko Token List](https://tokenlists.org/token-list?url=https://tokens.coingecko.com/uniswap/all.json)(requires manual review)
  - _Why CoinGecko? CoinGecko's token list updates every hour which means we get token list updates very quickly. CoinGecko also uses an in-depth [listing criteria](https://www.coingecko.com/en/methodology)._

### Final approval

All PRs are subject to a light-weight final approval, even if not marked as `requires manual review`.

## Adding a price feed address to the list

### Create a folder for your price feed

Create (or find) a `.json` file inside of the [price-feeds](https://github.com/SwarmMarkets/open-dotc/tree/master/price-feeds) with the same name of the price feed you are trying to add. For example, if you are adding a price feed for "ETH" you must create/find a file called `ETH.json`.

### Create a price feed file

If there is no price feed for the desired currency, add a file to the folder called `{Currency}.json` with the following format:

```json
{
  "name": "Currency Name",
  "description": "Price feed description",
  "decimals": 8, // follow the decimals of price feed
  "address": {
    "ethereum": "0x1234123412341234123412341234123412341234",
    "polygon": "0x1234123412341234123412341234123412341234",
    "...": "0x1234123412341234123412341234123412341234"
  }
}
```

Please include the price feed addresses for _all_ of the supported chains by Swarm.

## Adding an authorization address to the list

### Create a folder for your authorization contract

Create (or find) a `.json` file inside of the [authorizations](https://github.com/SwarmMarkets/open-dotc/tree/master/authorizations) with the same name of the authorization you are trying to add. For example, if you are adding an open authorization, you must create/find a file called `AuthorizationOpen.json`.

### Create a an authorization file

If there is no desired authorization, add a file to the folder called `{Authorization}.json` with the following format:

```json
{
  "name": "Authorization Name",
  "address": {
    "base": "0x1234123412341234123412341234123412341234"
  }
}
```

Please include the authorization addresses for _all_ of the supported chains by Swarm.

