# CHETNA - Crime Alert & Women Safety App

CHETNA is a smart safety application designed to protect and empower users using real-time alerts, location-based technology, and a community of verified helpers.

## 🚀 Project Structure

- **/backend**: Node.js & Express API with PostgreSQL (Prisma).
- **/mobile-app**: Expo (React Native) application with SQLite for offline support.

## 🛠️ Features Implemented

- **Dual Dashboard**: Separate interfaces for Girls (Safety Focus) and Boys (Helper Focus).
- **SOS System**: One-click emergency trigger with evidence recording.
- **Nearest Secret Cop Algorithm**: Server-side logic using Haversine formula to find 5 nearest helpers.
- **Offline Red Zones**: Local SQLite storage and geofencing for crime area detection.
- **AI Voice Alert**: Automatic speech notification when entering a "Red Zone".
- **Evidence System**: Automatic background audio recording during SOS events.
- **SMS Integration**: Emergency SMS utility with Google Maps location links.

## 🏁 Getting Started

### Backend Setup
1. `cd backend`
2. `npm install`
3. Set your `DATABASE_URL` and `JWT_SECRET` in `.env`.
4. `npx prisma db push` (to sync schema with PostgreSQL).
5. `npm start` (or `node src/index.js`).

### Mobile App Setup
1. `cd mobile-app`
2. `npm install`
3. `npx expo start`

## 📡 Tech Stack

- **Frontend**: React Native, Expo, Lucide Icons.
- **Backend**: Node.js, Express, Prisma ORM.
- **Database**: PostgreSQL (Online), SQLite (Offline).
- **APIs**: Expo Location, Expo Speech, Expo AV, Expo SMS.

---
*Created with ❤️ for Women Safety.*
