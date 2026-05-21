export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="private-layout">
      {/* 
        Add authentication checks here later.
        Add private navigation (sidebar/header) here.
      */}
      {children}
    </div>
  );
}
