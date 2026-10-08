# HelioTrope

HelioTrope is a live commerce marketplace that connects home-based sellers and buyers in a modern shopping experience. The platform is designed around Bangladeshi e-commerce behavior, combining storefront discovery, live selling, AI-assisted shopping, and virtual product try-ons.

## Overview

HelioTrope brings together:

- Seller storefronts and product listings
- Live commerce and auction-style shopping experiences
- Digital wardrobe / closet management for fashion and lifestyle products
- AI-powered shopping assistance and virtual try-on experiences
- A modern React frontend with a scalable Node.js backend

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: MongoDB with Mongoose
- Media handling: Multer for uploads
- API and client communication: Axios, CORS
- Styling and interactions: React + Vite ecosystem, Framer Motion, Lucide icons

## Project Structure

```text
HelioTrope/
├── frontend/              # React frontend application
├── digitall-closet/       # Digital closet backend service
├── models/                # AI / ML model integrations (planned or experimental)
├── routes/                # API routes for server-side functionality
├── server.js              # Root backend server
├── package.json           # Root project configuration
├── package-lock.json      # Lock file for dependencies
├── .env.example           # Optional example environment file (if added locally)
├── README.md              # Project documentation
└── ...
```

## Features

### Seller Experience
- Create and manage product listings
- Showcase storefronts and products online
- Upload images and manage product assets
- Support live commerce and auction-style product discovery

### Buyer Experience
- Browse curated storefronts
- View live product collections
- Discover products in a marketplace format tailored for home-based sellers
- Explore virtual dressing / closet-style product experiences

### AI and Commerce
- AI-powered shopping assistance
- Virtual try-on and product fit experiences
- Smart recommendations and product matching for lifestyle and fashion use cases

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 18+ or later
- npm
- MongoDB instance or MongoDB Atlas connection string

### 1) Install dependencies

From the project root:

```bash
npm install
```

For the frontend:

```bash
cd frontend
npm install
```

For the digital closet service:

```bash
cd digitall-closet
npm install
```

### 2) Configure environment variables

Create a `.env` file in the root project (and in sub-projects where needed) and add your MongoDB configuration:

```env
MONGO_URI=mongodb://localhost:27017/heliotrope
PORT=5000
```

### 3) Run the application

Start the backend server:

```bash
npm start
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Start the digital closet service:

```bash
cd digitall-closet
npm run dev
```

## API Overview

The root server exposes the main backend API and serves static uploads. A sample endpoint structure includes:

```text
/api/closet
/uploads
```

This backend is intended to support product, closet, and media management operations for the HelioTrope ecosystem.

## Notes

This project is currently under active development. Features and folder responsibilities may evolve as the platform expands.

## License

This project is currently licensed under the ISC license unless otherwise updated by the repository owner.

## Contributing

Contributions are welcome. If you want to improve the platform, please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request with a clear description

## Contact

For questions or collaboration inquiries, please reach out through the repository owner or project maintainer.

---

Built for a smarter, AI-powered live commerce experience.

