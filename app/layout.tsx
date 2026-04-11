import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeScope — 人生財務沙盤推演平台",
  description: "台灣唯一的蒙地卡羅退休模擬器。用 1,000 次平行宇宙測試你的財務計畫成功率，壓力測試你的現金流極限。",
  keywords: ["理財", "退休規劃", "蒙地卡羅", "複利計算", "租屋買房", "FIRE", "財務自由"],
  openGraph: {
    title: "LifeScope — 人生財務沙盤推演平台",
    description: "用機率思維規劃你的財務人生。台灣唯一的蒙地卡羅退休模擬器。",
    type: "website",
    locale: "zh_TW",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
