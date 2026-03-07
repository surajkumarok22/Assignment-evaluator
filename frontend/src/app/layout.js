import "./globals.css";

export const metadata = {
  title: "AI Assignment Evaluator",
  description: "Automatically assess assignments using AI-powered rubric evaluation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
