
# ChitChatConnect - Anonymous AI-Moderated Video Chat

<div align="center">

**A modern, real-time video and text chat application that connects users anonymously based on shared interests.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socket.io)](https://socket.io/)
[![Genkit](https://img.shields.io/badge/Google_Genkit-1.x-orange?logo=google&logoColor=white)](https://firebase.google.com/docs/genkit)
[![ShadCN UI](https://img.shields.io/badge/ShadCN/UI-black?logo=shadcn-ui&logoColor=white)](https://ui.shadcn.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-blue?logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

**ChitChatConnect** is a production-ready platform for spontaneous, one-on-one conversations with strangers from around the world. Built with a cutting-edge technology stack, it provides a seamless, safe, and engaging user experience. The application features AI-powered content moderation to ensure a secure environment for all users.

## ✨ Key Features

-   **🌐 Anonymous Connections**: Chat with strangers without revealing personal information.
-   **🤝 Interest-Based Matching**: Enter your interests to get paired with like-minded individuals for more engaging conversations.
-   **📹 Real-Time Video & Audio**: High-quality, low-latency video and audio streaming powered by WebRTC.
-   **💬 Instant Text Messaging**: A built-in text chat alongside the video feed for a hybrid communication experience.
-   **🤖 AI-Powered Safety**: On-the-fly nudity detection using **Google Genkit (Gemini)** to moderate video streams and automatically terminate inappropriate chats.
-   **📱 Modern & Responsive UI**: A sleek, intuitive interface built with **ShadCN UI** and **Tailwind CSS** that works beautifully on all devices.
-   **⚙️ User Controls**: Easily toggle your camera and microphone on or off, stop a chat, or find the next partner.
-   **🚀 Scalable Backend**: The real-time signaling server is built on Node.js and Socket.IO for efficient, event-driven communication.

## 🛠️ Technology Stack

This project leverages a modern, type-safe, and performant stack for a production-grade application.

-   **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components, TypeScript)
-   **UI Library**: [React](https://react.dev/)
-   **Component Library**: [ShadCN UI](https://ui.shadcn.com/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Real-time Communication**: [Socket.IO](https://socket.io/) & [WebRTC](https://webrtc.org/)
-   **AI & Content Moderation**: [Google Genkit](https://firebase.google.com/docs/genkit) with the Gemini model
-   **Deployment**: Optimized for [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## 🏗️ Project Architecture

The codebase is structured to be modular and maintainable, separating concerns across different layers of the application.

```
src
├── app/                  # Next.js App Router: pages, layouts, and routing
│   ├── page.tsx          # Main entry point, handles global app state
│   └── layout.tsx        # Root layout
│
├── components/           # Reusable React components
│   ├── chat-page.tsx     # The core chat interface (video, text, controls)
│   ├── home-page.tsx     # Initial landing page to start a chat
│   └── ui/               # ShadCN UI components
│
├── ai/                   # All AI-related logic powered by Genkit
│   ├── flows/            # Genkit flow definitions
│   │   └── nudity-detection-flow.ts
│   └── genkit.ts         # Genkit initialization and configuration
│
├── lib/                  # Utility functions and libraries
│   ├── socket.ts         # Client-side Socket.IO setup
│   └── utils.ts          # Shared utility functions (e.g., cn)
│
└── server.ts             # Custom Node.js server for integrating Socket.IO with Next.js
```

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing.

### Prerequisites

-   [Node.js](https://nodejs.org/en) (v18 or later recommended)
-   [pnpm](https://pnpm.io/installation) (or your preferred package manager like npm/yarn)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Angrajkarn/chat-with-random-stranger.git
    cd chat-with-random-stranger
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory by copying the example file:
    ```bash
    cp .env .env.local
    ```
    Now, add your Google AI API key to `.env.local`. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).
    ```env
    # .env.local
    GOOGLE_API_KEY="YOUR_API_KEY_HERE"
    ```

4.  **Run the Development Servers:**
    The application requires two concurrent processes: the Next.js frontend and the Genkit AI server. You will need two separate terminal windows.

    -   **Terminal 1: Start the Next.js & Socket.IO server:**
        ```bash
        pnpm dev
        ```
        This will start the main application, typically on `http://localhost:9002`.

    -   **Terminal 2: Start the Genkit development server:**
        ```bash
        pnpm genkit:dev
        ```
        This starts the Genkit server, which makes the AI flows available for the main app.

5.  **Open the application:**
    Navigate to `http://localhost:9002` in your browser. To test the full video chat functionality, you'll need to open two separate browser windows or tabs and start a chat in each.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is distributed under the MIT License. See `LICENSE` for more information.
