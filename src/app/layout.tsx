import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Script from "next/script";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Improves font loading performance
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

// Enhanced metadata with comprehensive SEO
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://smartdataanalyser.com'),
  
  title: {
    default: "Smart Data Analyser - AI-Powered Data Analytics Dashboard",
    template: "%s | Smart Data Analyser"
  },
  
  description: "Transform your data into actionable insights with our advanced AI-powered analytics platform. Features real-time visualization, predictive analytics, and intelligent reporting for data-driven decision making.",
  
  keywords: [
    "data analytics", "AI analytics", "deep learning", "data visualization", 
    "business intelligence", "predictive analytics", "real-time dashboards",
    "machine learning insights", "data science platform", "analytics dashboard",
    "big data analysis", "automated reporting", "data mining", "statistical analysis",
    "interactive charts", "data intelligence", "enterprise analytics"
  ],
  
  authors: [{ name: "Smart Data Analyser Team" }],
  creator: "Smart Data Analyser",
  publisher: "Smart Data Analyser",
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://dataviz-ai.netlify.app/',
    siteName: "Smart Data Analyser",
    title: "Smart Data Analyser - AI-Powered Data Analytics Dashboard",
    description: "Transform your data into actionable insights with advanced AI-powered analytics. Real-time visualization, predictive analytics, and intelligent reporting.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Smart Data Analyser - AI-Powered Analytics Dashboard",
        type: "image/jpeg",
      },
      {
        url: "/og-image-square.jpg",
        width: 1200,
        height: 1200,
        alt: "Smart Data Analyser Logo",
        type: "image/jpeg",
      }
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    site: "@SmartDataAnalyser",
    creator: "@SmartDataAnalyser",
    title: "Smart Data Analyser - AI-Powered Data Analytics Dashboard",
    description: "Transform your data into actionable insights with advanced AI-powered analytics platform.",
    images: ["/twitter-image.jpg"],
  },
  
  verification: {
    google: process.env.GOOGLE_VERIFICATION_CODE,
    yandex: process.env.YANDEX_VERIFICATION_CODE,
    yahoo: process.env.YAHOO_VERIFICATION_CODE,
    other: {
      'msvalidate.01': process.env.BING_VERIFICATION_CODE || '',
    },
  },
  
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://dataviz-ai.netlify.app/',
    languages: {
      'en-US': '/en-US',
      'en-GB': '/en-GB',
    },
  },
  
  category: "Technology",
  classification: "Business Software",
  
  // App-specific metadata
  applicationName: "Smart Data Analyser",
  referrer: "origin-when-cross-origin",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" }
  ],
  
  // Apple-specific
  appleWebApp: {
    capable: true,
    title: "Smart Data Analyser",
    statusBarStyle: "default",
  },
  

  
  // Additional meta for better indexing
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes',
    'msapplication-tap-highlight': 'no',
    'theme-color': '#000000',
  },
};

// JSON-LD structured data for rich snippets
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Smart Data Analyser',
  description: 'Advanced AI-powered data analytics platform for business intelligence and data visualization',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD'
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1250'
  },
  author: {
    '@type': 'Organization',
    name: 'Smart Data Analyser Team',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://smartdataanalyser.com'
  },
  publisher: {
    '@type': 'Organization',
    name: 'Smart Data Analyser',
    logo: {
      '@type': 'ImageObject',
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://smartdataanalyser.com'}/logo.png`
    }
  },
  screenshot: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://smartdataanalyser.com'}/screenshot.jpg`,
  featureList: [
    'AI-Powered Analytics',
    'Real-time Data Visualization',
    'Predictive Analytics',
    'Interactive Dashboards',
    'Automated Reporting',
    'Deep Learning Integration'
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning={true}
    >
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Additional meta tags for better SEO */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Geo-targeting */}
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        
        {/* Content language */}
        <meta httpEquiv="content-language" content="en-US" />
        
        {/* Cache control */}
        <meta httpEquiv="cache-control" content="public, max-age=31536000" />
        
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      
      <body suppressHydrationWarning={true}>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `}
        </Script>

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
          `}
        </Script>

        {/* Hotjar */}
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>

        {/* Traff Analytics */}
        <Script
          src="https://traff.netlify.app/cdn.js"
          strategy="afterInteractive"
        />

        {/* Schema.org breadcrumb for better navigation understanding */}
        <nav aria-label="Breadcrumb" style={{ display: 'none' }}>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": process.env.NEXT_PUBLIC_BASE_URL || 'https://smartdataanalyser.com'
                }
              ]
            })}
          </script>
        </nav>

        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {/* Skip to main content for accessibility */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50"
            >
              Skip to main content
            </a>
            
            <main id="main-content" role="main">
              {children}
            </main>
            <Toaster />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}