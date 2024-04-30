# Roles:

## 1. Contract Owner

    Permissions:
        Update key contract parameters, such as fee amounts and addresses.
        Change the addresses of related contracts like the escrow or manager contracts.
        Access administrative functions to update or modify contract settings.
    Typical Actions:
        Setting the fee receiver address.
        Changing the escrow or manager contract addresses to integrate new functionalities or updates.
        Adjusting trading fees based on market conditions or business needs.

## 2. Manager

    Permissions:
        Oversee general operations and settings within the manager contract.
        Update trading parameters and manage contract addresses linked to the trading platform.
        Perform high-level administrative functions that affect the trading dynamics.
    Typical Actions:
        Authorizing the update of the DOTC contract address.
        Changing the address of the fee receiver.
        Adjusting the standardization and unstandardization logic for asset amounts.

## 3. Escrow Manager

    Permissions:
        Manage asset deposits and withdrawals related to trading offers.
        Oversee the execution of escrow operations, ensuring that assets are securely held and correctly released upon trade completion.
    Typical Actions:
        Initiating the deposit or withdrawal of assets from escrow based on completed trades.
        Cancelling offers and returning assets to makers if offers are withdrawn or expired.

## 4. Maker

    Permissions:
        Create trading offers by specifying the assets and terms involved.
        Update or cancel their offers under certain predefined conditions.
        Withdraw their assets if the offer terms allow or if the offer is not taken by its expiration.
    Typical Actions:
        Creating a new trading offer by depositing assets into escrow.
        Updating the terms of an existing offer.
        Cancelling an offer and retrieving the deposited assets from escrow.

## 5. Taker

    Permissions:
        Accept trading offers made by makers.
        Complete the asset exchange by meeting the offer requirements and transferring necessary assets.
    Typical Actions:
        Reviewing available offers and choosing one to accept.
        Transferring assets to fulfill the terms of the offer.
        Receiving assets from escrow once the trade is successfully completed.

## 6. Special Address

    Permissions:
        Participate in offers where they are specifically authorized, often used for regulatory compliance or private offerings.
    Typical Actions:
        Engaging in trades that are restricted to predefined addresses due to special conditions or qualifications.

# Authorization Mechanisms

    Role-Based Access Control (RBAC): The system uses RBAC to ensure that only authorized users can perform certain actions. This is implemented through modifiers in the smart contracts that check the role of the address attempting to execute a function.
    Modifiers: Custom modifiers are used extensively to control access to functions. For example, only makers can cancel or update their offers, and only the contract owner can modify critical system parameters.
    Event Logging: All significant actions are logged through events, providing transparency and an auditable trail for monitoring and compliance purposes.
