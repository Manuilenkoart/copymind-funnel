export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="public-layout">
      {/* Add public navigation or footers here */}
      {children}
    </div>
  );
}
