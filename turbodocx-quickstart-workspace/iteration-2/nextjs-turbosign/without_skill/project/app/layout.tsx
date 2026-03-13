export const metadata = {
  title: 'TurboSign Demo',
  description: 'Send documents for e-signature and check their status with TurboSign',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
