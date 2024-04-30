# Development/Deployment Instructions

This document provides detailed steps for setting up, testing, documenting, deploying, and verifying the smart contracts for the decentralized OTC trading platform.

## Setup

1. **Environment Setup**

   - Create an `.env` file in the root of this project. Use the content from [.env.example](.env.example) as a guide for the required variables.

2. **Install Dependencies**
   - Run the following command to install the necessary dependencies:
     ```bash
     $ yarn
     ```

## Testing

- To compile the project for the correct work, execute:

  ```bash
  $ yarn compile
  ```

- To run the tests and ensure the smart contracts function as expected, execute:

  ```bash
  $ yarn test
  ```

- To run the coverage, execute:
  ```bash
  $ yarn coverage
  ```

## Documentation and Diagrams

- Update API Documentation

  Generate or update API documentation using:

  ```bash
  $ yarn docgen
  ```

- Generate UML Diagrams

  To create UML diagrams for better understanding of contract interactions, use:

  ```bash
  $ yarn doc:uml
  ```

## Deployment

- Deploy Contracts

  Deploy the smart contracts to the desired network with:

  ```bash
  $ yarn deployV1
  or
  $ yarn deployV2
  ```

  Supported networks include: mainnet, sepolia, polygon, mumbai, base, arbitrum, optimism.

## Verification

- Verify Contract

  After deployment, verify the smart contracts on Etherscan or the appropriate blockchain explorer based on the network. Use:

  ```bash
  $ yarn verifyV1
  or
  $ yarn verifyV2
  ```

  Supported networks for verification are: mainnet, sepolia, polygon, mumbai, base, arbitrum, optimism.
