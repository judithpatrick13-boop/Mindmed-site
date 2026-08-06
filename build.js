const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'public');
const BLOG_SRC = path.join(ROOT, 'content', 'blog');

const ANALYTICS_SNIPPET = `<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "dd98414a9b0d40bfb9d5b01b63d186c2"}'></script><!-- End Cloudflare Web Analytics -->`;

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function stripToPlainText(md) {
  return String(md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

const SITE_HEAD_CSS = `
:root{--primary:#1e4d3a;--primary-light:#2d6b52;--accent:#f59e0b;--dark:#0f172a;--light:#f8fafc;--text:#334155;--card-radius:16px}
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
html{scroll-behavior:smooth}
body{color:var(--text);line-height:1.6;overflow-x:hidden}
header{background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:50}
nav{max-width:1200px;margin:0 auto;padding:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
nav a{color:var(--dark);text-decoration:none;margin-left:1rem;font-weight:500;font-size:0.9rem;white-space:nowrap;transition:color 0.2s ease}
nav a:hover{color:var(--primary)}
.logo-wrap{display:flex;align-items:center;gap:0.5rem;text-decoration:none}
.logo-icon{animation:floatLogo 4s ease-in-out infinite;flex-shrink:0}
@keyframes floatLogo{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-4px) rotate(-3deg)}}
.logo-text{font-size:1.2rem;font-weight:700;color:var(--primary)}
.btn-primary{background:var(--primary);color:#fff;padding:0.7rem 1.2rem;border-radius:8px;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:0.5rem;border:none;cursor:pointer;transition:transform 0.2s ease, box-shadow 0.2s ease}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(30,77,58,0.3)}
.post{max-width:760px;margin:0 auto;padding:3rem 1.5rem;position:relative}
.post img.hero{width:100%;border-radius:18px;margin-bottom:2rem;box-shadow:0 12px 32px rgba(15,23,42,0.12)}
.post .tag{font-size:0.75rem;background:#dbeafe;color:#1e40af;padding:0.25rem 0.6rem;border-radius:4px;font-weight:600}
.post h1{font-size:2.2rem;color:var(--dark);margin:1rem 0;line-height:1.25;letter-spacing:-0.01em}
.post .meta{color:#64748b;font-size:0.9rem;margin-bottom:2rem}
.post-body h2{color:var(--dark);margin:2rem 0 1rem;font-size:1.5rem}
.post-body h3{color:var(--dark);margin:1.5rem 0 0.75rem;font-size:1.2rem}
.post-body p{margin-bottom:1.2rem}
.post-body ul,.post-body ol{margin:0 0 1.2rem 1.5rem}
.post-body li{margin-bottom:0.5rem}
.post-body img{width:100%;border-radius:12px;margin:1.5rem 0}
.post-body strong{color:var(--dark)}
.post-cta{background:linear-gradient(180deg,#f8fafc 0%,#eef2f0 100%);border-radius:18px;padding:2.2rem;text-align:center;margin-top:3rem}
.back-link{display:inline-block;margin-bottom:2rem;color:var(--primary);text-decoration:none;font-weight:600}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;max-width:1200px;margin:0 auto;padding:3rem 1.5rem;perspective:1200px}
.blog-card{background:linear-gradient(180deg,#ffffff 0%,#fbfdfc 100%);border:1px solid #e6ebe8;border-radius:var(--card-radius);overflow:hidden;text-decoration:none;color:inherit;display:block;box-shadow:0 4px 16px rgba(15,23,42,0.05);transition:transform 0.3s ease, box-shadow 0.3s ease}
.blog-card:hover{transform:perspective(1200px) rotateX(2deg) rotateY(-2deg) translateY(-6px);box-shadow:0 20px 40px rgba(15,23,42,0.14)}
.blog-card img{width:100%;height:180px;object-fit:cover;background:#e2e8f0}
.blog-card .pad{padding:1.2rem}
.blog-card h3{color:var(--dark);margin:0.75rem 0 0.5rem;font-size:1.1rem}
.blog-card .excerpt{font-size:0.9rem;color:#64748b}
.orb{position:absolute;border-radius:50%;filter:blur(50px);opacity:0.25;z-index:0;animation:driftOrb 12s ease-in-out infinite;pointer-events:none}
@keyframes driftOrb{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-20px) scale(1.08)}}
footer{background:var(--dark);color:#cbd5e1;padding:3rem 1rem;margin-top:4rem;text-align:center}
footer a{color:#94a3b8;text-decoration:none;transition:color 0.2s ease}
footer a:hover{color:#fff}
@media(max-width:768px){.blog-card:hover{transform:translateY(-4px)}}
`;

function siteHeader() {
  return `<header>
<nav>
<a class="logo-wrap" href="/"><svg class="logo-icon" width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 2a5 5 0 0 0-5 5c0 .34.03.67.08 1A4 4 0 0 0 2 11.5 4 4 0 0 0 4.5 15c-.17.5-.27 1-.27 1.5A4.5 4.5 0 0 0 9 21h1V8.5A4.5 4.5 0 0 0 9 2Z" fill="#10b981"/><path d="M15 2a5 5 0 0 1 5 5c0 .34-.03.67-.08 1A4 4 0 0 1 22 11.5 4 4 0 0 1 19.5 15c.17.5.27 1 .27 1.5A4.5 4.5 0 0 1 15 21h-1V8.5A4.5 4.5 0 0 1 15 2Z" fill="#1e4d3a"/></svg><span class="logo-text">MindMed</span></a>
<div style="display:flex;align-items:center;flex-wrap:wrap">
<a href="/">Home</a>
<a href="/blog/">Blog</a>
<a href="/#resources">Resources</a>
<a href="/#self-tests">Free Tests</a>
<a href="/#about">About</a>
<a href="/#pricing">Pricing</a>
<a href="/store.html">Store</a>
<a href="/#contact">Contact</a>
<a href="/#contact" class="btn-primary">Book Appointment</a>
</div>
</nav>
</header>`;
}

function siteFooter() {
  return `<footer>
<p><span style="color:#10b981;font-weight:700">Mind</span><span style="font-weight:700">Med</span> &nbsp;\u00B7&nbsp; Mind. Health. You.</p>
<p style="margin-top:0.8rem;font-size:0.9rem">
<a href="/">Home</a> &nbsp;\u00B7&nbsp;
<a href="/store.html">Store</a> &nbsp;\u00B7&nbsp;
<a href="/#contact">Contact</a> &nbsp;\u00B7&nbsp;
<a href="mailto:support@mindmed.com.ng">support@mindmed.com.ng</a> &nbsp;\u00B7&nbsp;
<a href="https://wa.me/2347069498050">WhatsApp</a>
</p>
<p style="margin-top:1rem;font-size:0.8rem;color:#64748b">\u00A9 2026 MindMed. All Rights Reserved. NDPA Compliant.</p>
</footer>`;
}

function articleSchema(post, metaDescriptionPlain) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": metaDescriptionPlain,
    "author": {
      "@type": "Person",
      "name": post.author || "MindMed Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "MindMed",
      "url": "https://mindmed.com.ng/"
    },
    "datePublished": new Date(post.date).toISOString(),
    "mainEntityOfPage": `https://mindmed.com.ng/blog/${post.slug}/`
  };
  if (post.image) data.image = post.image;
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function postPageHtml(post) {
  const bodyHtml = marked.parse(post.body || '');
  const title = escapeHtml(post.title);
  const metaTitle = escapeHtml(post.meta_title && post.meta_title.trim() ? post.meta_title.trim() : `${post.title} | MindMed`);
  const metaDescriptionPlain = post.meta_description && post.meta_description.trim()
    ? post.meta_description.trim().slice(0, 160)
    : stripToPlainText(post.body).slice(0, 155);
  const metaDescription = escapeHtml(metaDescriptionPlain);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle}</title>
<meta name="description" content="${metaDescription}">
<link rel="canonical" href="https://mindmed.com.ng/blog/${post.slug}/">
<style>${SITE_HEAD_CSS}</style>
${articleSchema(post, metaDescriptionPlain)}
${ANALYTICS_SNIPPET}
</head>
<body>
${siteHeader()}
<article class="post">
<a class="back-link" href="/blog/">\u2190 Back to all articles</a>
${post.image ? `<img class="hero" src="${escapeHtml(post.image)}" alt="${title}">` : ''}
<span class="tag">${escapeHtml(post.pillar || 'MindMed')}</span>
<h1>${title}</h1>
<div class="meta">${escapeHtml(post.author || 'MindMed Team')} &nbsp;\u2022&nbsp; ${formatDate(post.date)}</div>
<div class="post-body">${bodyHtml}</div>
<div class="post-cta">
<h3>Ready to speak with a therapist?</h3>
<p>Book a confidential online session today.</p>
<div style="margin-top:1rem">
<a href="/#contact" class="btn-primary">Book Appointment</a>
</div>
</div>
</article>
${siteFooter()}
</body>
</html>`;
}

function listingPageHtml(posts) {
  const cards = posts.map((p) => `
<a class="blog-card" href="/blog/${p.slug}/">
${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">` : ''}
<div class="pad">
<span class="tag">${escapeHtml(p.pillar || 'MindMed')}</span>
<h3>${escapeHtml(p.title)}</h3>
<div class="excerpt">${formatDate(p.date)}</div>
</div>
</a>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mental Health Articles & Resources | MindMed Blog</title>
<meta name="description" content="Evidence-based mental health articles for Nigerians: therapy costs, anxiety, depression, and how to get support in Lagos and beyond.">
<link rel="canonical" href="https://mindmed.com.ng/blog/">
<style>${SITE_HEAD_CSS}</style>
${ANALYTICS_SNIPPET}
</head>
<body>
${siteHeader()}
<section style="max-width:1200px;margin:0 auto;padding:3rem 1.5rem 0;text-align:center;position:relative">
<div class="orb" style="width:220px;height:220px;background:radial-gradient(circle,var(--primary-light),transparent 70%);top:-40px;left:-40px"></div>
<div class="orb" style="width:180px;height:180px;background:radial-gradient(circle,var(--accent),transparent 70%);top:0;right:-20px"></div>
<h1 style="color:var(--dark);font-size:2.2rem;position:relative;z-index:1">Mental Health Resources & Articles</h1>
<p style="color:#64748b;margin-top:0.5rem;position:relative;z-index:1">Evidence-based guidance for navigating mental health in Nigeria.</p>
</section>
<div class="blog-grid">
${cards || '<p style="color:#64748b">New articles coming soon.</p>'}
</div>
${siteFooter()}
</body>
</html>`;
}

function homepageCardHtml(p) {
  return `<div class="article-card" style="opacity:1">
<a href="/blog/${p.slug}/" style="text-decoration:none;color:inherit">
${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">` : ''}
<div><span class="tag">${escapeHtml((p.pillar || 'MindMed').split(':')[0].toUpperCase())}</span><h4 style="margin:0.5rem 0">${escapeHtml(p.title)}</h4><p style="font-size:0.85rem;color:#64748b">${formatDate(p.date)}</p></div>
</a>
</div>`;
}

function injectHomepageResources(homepageHtml, posts) {
  const featured = posts.slice(0, 4);
  const gridStart = homepageHtml.indexOf('<div class="grid-4">');
  const gridEndTag = '</div>\n</section>';
  if (gridStart === -1) return homepageHtml;
  const gridEnd = homepageHtml.indexOf(gridEndTag, gridStart);
  if (gridEnd === -1) return homepageHtml;

  if (featured.length === 0) {
    return homepageHtml;
  }
  const newGridInner = featured.map(homepageCardHtml).join('\n');

  const before = homepageHtml.slice(0, gridStart);
  const after = homepageHtml.slice(gridEnd);
  const newGridBlock = `<div class="grid-4">\n${newGridInner}\n</div>`;

  let result = before + newGridBlock + after;

  result = result.replace(
    /<span style="color:var\(--accent\);font-weight:600">Articles coming soon[^<]*<\/span>/,
    '<a href="/blog/" style="color:var(--accent);font-weight:600;text-decoration:none">View all articles \u2192</a>'
  );

  return result;
}

function build() {
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  for (const item of ['set-password.html', 'admin', 'images', 'sitemap.xml', 'store.html']) {
    const src = path.join(ROOT, item);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(OUT, item));
    }
  }

  const posts = [];
  if (fs.existsSync(BLOG_SRC)) {
    for (const file of fs.readdirSync(BLOG_SRC)) {
      if (!file.endsWith('.md')) continue;
      const raw = fs.readFileSync(path.join(BLOG_SRC, file), 'utf8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!match) continue;
      let data;
      try {
        data = yaml.load(match[1]);
      } catch (e) {
        console.error('Failed to parse frontmatter for', file, e.message);
        continue;
      }
      if (!data || data.draft === true || data.draft === 'true') continue;
      posts.push({
        title: data.title || 'Untitled',
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        date: data.date || new Date(),
        slug: data.slug || file.replace(/\.md$/, ''),
        pillar: data.pillar,
        keywords: data.keywords,
        author: data.author,
        image: data.image,
        body: match[2],
      });
    }
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const post of posts) {
    const dir = path.join(OUT, 'blog', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), postPageHtml(post));
  }

  fs.mkdirSync(path.join(OUT, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'blog', 'index.html'), listingPageHtml(posts));

  const homepageSrc = path.join(ROOT, 'index.html');
  if (fs.existsSync(homepageSrc)) {
    const rawHomepage = fs.readFileSync(homepageSrc, 'utf8');
    let finalHomepage = injectHomepageResources(rawHomepage, posts);
    if (finalHomepage.includes('</head>') && !finalHomepage.includes('cloudflareinsights.com')) {
      finalHomepage = finalHomepage.replace('</head>', `${ANALYTICS_SNIPPET}\n</head>`);
    }
    fs.writeFileSync(path.join(OUT, 'index.html'), finalHomepage);
  }

  console.log(`Build complete. Generated ${posts.length} blog post page(s).`);
}

build();
