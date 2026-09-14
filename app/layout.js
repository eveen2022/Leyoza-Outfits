import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import './next-ui.css';

export const metadata = {
  title: 'Leyoza Outfits · Invoice Studio',
  description: 'Create, preview, and download invoices for Leyoza Outfits.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
