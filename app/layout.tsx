import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Wavestream — Stream Anywhere',
  description: 'Build your playlist, share your stream URL anywhere',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#121212',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-spotify-black text-white antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#282828',
              color: '#fff',
              border: '1px solid #3E3E3E',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#1DB954',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
