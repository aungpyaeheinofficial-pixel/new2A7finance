
import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Myanmar Finance AI',
  description: 'Hybrid AI Platform for Myanmar Finance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Tailwind CDN as fallback/supplement to ensure styles match exactly */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="font-sans antialiased bg-slate-950 text-slate-200">
        {children}
      </body>
    </html>
  );
}
