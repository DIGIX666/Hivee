import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from '@/hooks/useWallet';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Hivee - Decentralized AI Agent Credit Protocol",
  description: "Autonomous AI agents for lending and borrowing with Zero-Knowledge proofs on CapX blockchain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
