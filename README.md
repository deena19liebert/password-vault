# 🔒 Secure Vault - Password Manager

A secure, self-hosted password manager with client-side encryption built with Next.js, TypeScript, and MongoDB.

## Features

- ✅ **Secure Password Generation** - Advanced generator with strength analysis
- ✅ **Client-Side Encryption** - AES-256-GCM encryption before storage
- ✅ **Personal Vault** - Each user has their own encrypted vault
- ✅ **Search & Filter** - Find passwords quickly
- ✅ **Copy to Clipboard** - Auto-clear after 15 seconds
- ✅ **Categories & Tags** - Organize your passwords
- ✅ **JWT Authentication** - Secure login system

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, React
- **Backend**: Next.js API Routes, MongoDB, Mongoose
- **Security**: JWT, bcryptjs, AES-256-GCM encryption
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/deena19liebert/password-vault.git
   cd password-vault