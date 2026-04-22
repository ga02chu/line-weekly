import { Noto_Sans_TC } from 'next/font/google';

const noto = Noto_Sans_TC({ subsets: ['latin'], weight: ['400', '500', '700'] });

export const metadata = {
  title: 'Line 群組週報',
  description: '每週自動整理 Line 群組對話重點',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className={noto.className} style={{margin:0, padding:0}}>
        {children}
      </body>
    </html>
  );
}
