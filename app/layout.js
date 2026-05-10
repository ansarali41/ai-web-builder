import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Provider from "./provider";
import ConvexClientProvider from "./ConvexClientProvider";
import ToastContainer from "@/components/custom/Toast";


export const metadata = {
  title: "AI Web Builder",
  description: "Build stunning websites with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body>
        <ConvexClientProvider>
        <Provider>
        {children}
        <ToastContainer />
        </Provider>
        </ConvexClientProvider>

      </body>
    </html>
  );
}
