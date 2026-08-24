import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İMKÂN — Kazanım sabit, atölye uyarlanabilir",
  description: "Gerçek sınıf koşullarına göre güvenli ve izlenebilir atölye paketleri üretin.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
