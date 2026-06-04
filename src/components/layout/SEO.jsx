import { memo } from "react";
import { Helmet } from "react-helmet-async";

export const SEO = memo(({ title, desc, canonical }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={desc} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title"        content={title} />
    <meta property="og:description"  content={desc} />
    <meta property="og:url"          content={canonical} />
    <meta property="og:type"         content="website" />
    <meta property="og:site_name"    content="thatpart" />
    <meta property="og:image"        content="https://thatpart.app/og-image.png" />
    <meta property="og:image:width"  content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:title"       content={title} />
    <meta name="twitter:description" content={desc} />
    <meta name="twitter:image"       content="https://thatpart.app/og-image.png" />
    <meta name="google-site-verification" content="tl8FQnHwLZsDIFlwHSPSgTDjh0g8Sm4C893F_HWoqBQ" />
  </Helmet>
));