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

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return '';
  }
}

const SITE_HEAD_CSS = `
:root{--primary:#1e4d3a;--accent:#f59e0b;--dark:#0f172a;--light:#f8fafc;--text:#334155}
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
html{scroll-behavior:smooth}
body{color:var(--text);line-height:1.6}
header{background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:50}
nav{max-width:1200px;margin:0 auto;padding:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
nav a{color:var(--dark);text-decoration:none;margin-left:1rem;font-weight:500;font-size:0.9rem;white-space:nowrap}
nav a:hover{color:var(--primary)}
.logo{display:flex;align-items:center;gap:0.5rem;font-size:1.3rem;font-weight:700;color:var(--primary);text-decoration:none}
.btn-primary{background:var(--primary);color:#fff;padding:0.7rem 1.2rem;border-radius:8px;text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:0.5rem;border:none;cursor:pointer}
.btn-primary:hover{opacity:0.9}
.post{max-width:760px;margin:0 auto;padding:3rem 1.5rem}
.post img.hero{width:100%;border-radius:16px;margin-bottom:2rem}
.post .tag{font-size:0.75rem;background:#dbeafe;color:#1e40af;padding:0.25rem 0.6rem;border-radius:4px;font-weight:600}
.post h1{font-size:2.2rem;color:var(--dark);margin:1rem 0;line-height:1.25}
.post .meta{color:#64748b;font-size:0.9rem;margin-bottom:2rem}
.post-body h2{color:var(--dark);margin:2rem 0 1rem;font-size:1.5rem}
.post-body h3{color:var(--dark);margin:1.5rem 0 0.75rem;font-size:1.2rem}
.post-body p{margin-bottom:1.2rem}
.post-body ul,.post-body ol{margin:0 0 1.2rem 1.5rem}
.post-body li{margin-bottom:0.5rem}
.post-body img{width:100%;border-radius:12px;margin:1.5rem 0}
.post-body strong{color:var(--dark)}
.post-cta{background:#f8fafc;border-radius:16px;padding:2rem;text-align:center;margin-top:3rem}
.back-link{display:inline-block;margin-bottom:2rem;color:var(--primary);text-decoration:none;font-weight:600}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;max-width:1200px;margin:0 auto;padding:3rem 1.5rem}
.blog-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;display:block}
.blog-card img{width:100%;height:180px;object-fit:cover;background:#e2e8f0}
.blog-card .pad{padding:1.2rem}
.blog-card h3{color:var(--dark);margin:0.75rem 0 0.5rem;font-size:1.1rem}
.blog-card .excerpt{font-size:0.9rem;color:#64748b}
footer{background:var(--dark);color:#cbd5e1;padding:3rem 1rem;margin-top:4rem;text-align:center}
footer a{color:#94a3b8;text-decoration:none}
footer a:hover{color:#fff}
`;

function siteHeader() {
  return `<header>
<nav>
<a class="logo" href="/">\u{1F9E0} MindMed</a>
<div style="display:flex;align-items:center;flex-wrap:wrap">
<a href="/">Home</a>
<a href="/blog/">Blog</a>
<a href="/#about">About</a>
<a href="/#contact">Contact</a>
<a href="https://doxy.me/mindmed" target="_blank" class="btn-primary">\u{1F4C5} Book Appointment</a>
</div>
</nav>
</header>`;
}

function siteFooter() {
  return `<footer>
<p>\u00A9 2026 MindMed. All Rights Reserved. NDPR Compliant.</p>
<p style="margin-top:0.5rem">
<a href="mailto:support@mindmed.com.ng">\u2709\uFE0F support@mindmed.com.ng</a> &nbsp;|&nbsp;
<a href="https://wa.me/2347069498050">\u{1F4AC} Chat on WhatsApp</a>
</p>
</footer>`;
}

function postPageHtml(post) {
  const bodyHtml = marked.parse(post.body || '');
  const title = escapeHtml(post.title);
  const desc = escapeHtml((post.keywords || '').split(';')[0] || post.title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | MindMed</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="https://mindmed.com.ng/blog/${post.slug}/">
<style>${SITE_HEAD_CSS}</style>
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
<a href="https://form.jotform.com/261754301710044" target="_blank" class="btn-primary">\u{1F4C5} Book Appointment</a>
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
<section style="max-width:1200px;margin:0 auto;padding:3rem 1.5rem 0;text-align:center">
<h1 style="color:var(--dark);font-size:2.2rem">Mental Health Resources & Articles</h1>
<p style="color:#64748b;margin-top:0.5rem">Evidence-based guidance for navigating mental health in Nigeria.</p>
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

  for (const item of ['set-password.html', 'admin']) {
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
