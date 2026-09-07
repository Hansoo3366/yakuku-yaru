import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frontend to FullStack 발표',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PresentationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
