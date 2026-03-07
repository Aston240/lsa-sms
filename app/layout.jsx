export const metadata = {
  title: "LSA Safety Management System",
  description: "LS Airmotive Flight Safety SMS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
