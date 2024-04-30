---

# Swarm Open dOTC

## Purpose of the Project

The overarching goal of this project is to provide a secure, decentralized platform for trading various types of digital assets without needing a centralized authority. This approach enhances transparency, security, and trust among participants while also leveraging blockchain technology to automate many aspects of traditional OTC trading. By using smart contracts, the platform can reduce the risk of fraud, speed up transactions, and decrease the costs associated with trading, thereby making it accessible to a broader range of participants globally.

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

## [Technical requirements here](docs/TechnicalRequirements/OpenDotc/v2)

---

## [Deployment/Development instructions here](INSTRUCTIONS.md)

---
