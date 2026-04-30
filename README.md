#  Blockchain-Based Pharmaceutical Reverse Logistics Tracker

## Overview

This project is a **blockchain-powered system** designed to track pharmaceutical products through their lifecycle — from manufacturing to delivery and potential reverse logistics (returns, recalls, or destruction).

It ensures:

* Transparency
* Tamper-proof tracking
* End-to-end visibility of drug movement

---

## Problem Statement

The pharmaceutical supply chain often suffers from:

* Lack of transparency
* Counterfeit drugs entering the system
* Inefficient tracking of returned or expired medicines

This leads to **safety risks, regulatory issues, and financial losses**.

---

## Solution

We built a **secure logistics tracking system using blockchain** that:

* Records every transaction on-chain
* Enforces role-based access control
* Tracks lifecycle states (Created → In Transit → Delivered → Confirmed → Destroyed)
* Maintains immutable history of package movement

---

## System architecture

  
<img width="1334" height="352" alt="image" src="https://github.com/user-attachments/assets/86f5c4cf-709c-4b11-b405-4201ad08ecd3" />

## Key Features

* **Role-Based Access Control**

  * Admin, Sender, Transporter, Receiver

* **Package Lifecycle Tracking**

  * Create → Assign → Transport → Deliver → Confirm

* **Location History Tracking**

  * Every movement stored on blockchain

* **Tamper-Proof Data**

  * Immutable smart contract storage

* **Blockchain Integration**

  * Polygon Amoy Testnet

---

## Tech Stack

### Backend

* Node.js
* Express.js
* ethers.js

### Blockchain

* Solidity (Smart Contracts)
* Remix IDE
* MetaMask
* Polygon Amoy Testnet

### Tools

* Git & GitHub
* VS Code
* Postman (API testing)

---

## Project Structure

```id="projstruct"
backend/
│── config/
│   └── blockchain.js
│
├── controllers/
│   └── pharmacontroller.js
│
├── routes/
│   └── pharmaroutes.js
│
├── models/
│   └── batchModel.js
│
├── server.js
├── package.json
└── .env
```

---

## How It Works

1. Admin assigns roles (Sender, Transporter, Receiver)
2. Sender creates a package
3. Transporter updates location and delivers
4. Receiver confirms receipt
5. Blockchain stores every step permanently

---

## Getting Started

### 1. Clone the repository

```bash id="clonecmd"
git clone https://github.com/2507-thaaru/integration-of-blockchain-system-in-pharmacy-and-medicine-.git
cd pharmachain-backend
```

---

### 2. Install dependencies

```bash id="installcmd"
npm install
```

---

### 3. Setup environment variables

Create a `.env` file:

```env id="envsetup"
PORT=5001
RPC_URL=YOUR_POLYGON_AMOY_RPC
PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT
```

---

### 4. Run the server

```bash id="runcmd"
npm start
```

---

## API Endpoints

### ➤ Create Package

```http id="api1"
POST /api/pharma/create
```

### ➤ Get Package

```http id="api2"
GET /api/pharma/:id
```

### ➤ Update Location

```http id="api3"
POST /api/pharma/update
```

---

## Smart Contract Highlights

* Role-based permissions
* Strict lifecycle enforcement
* Event logging for traceability
* Immutable storage

---

## Testing

* Smart contract tested using Remix
* Backend APIs tested using Postman
* Blockchain transactions verified via MetaMask

---

## Hackathon Value

This project demonstrates:

* Real-world blockchain application
* Secure and scalable backend architecture
* Integration of Web3 with traditional systems

---

## License

MIT License
