import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "文本整理与格式转换工具",
  description: "将 AI 网页复制内容整理为稳定的 Word/WPS 兼容格式",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
