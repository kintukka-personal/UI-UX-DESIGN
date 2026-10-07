#!/usr/bin/env python3
"""Build the Squarespace paste kit from the Dine In v2 site.

    python3 build.py

Reads ../dine-in-v2 (the source of truth) and rewrites this folder's
sitewide/, pages/, shop/ and url-mappings.txt. The output is committed, so
nobody needs to run this to copy and paste. Run it again after editing v2.

What it changes on the way:
- page links become Squarespace addresses (menu.html -> /menu)
- images point at the copies already on Brooke's Squarespace CDN
  (image-map.json), resized with Squarespace's ?format= widths
- every CSS rule is scoped under .dinein so it can't touch Squarespace's own
  header, footer, shop or cart
- the few files that aren't on the CDN yet come from uploads.json
"""
import base64, io, json, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.normpath(os.path.join(HERE, '..', 'dine-in-v2'))
SITE = 'https://dine-in.com.au'
rd = lambda p: open(p, encoding='utf-8').read()


def wr(rel, s):
    p = os.path.join(HERE, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(s)


IMAGES = json.load(open(os.path.join(HERE, 'image-map.json'), encoding='utf-8'))
UPLOADS = json.load(open(os.path.join(HERE, 'uploads.json'), encoding='utf-8'))

# v2 file -> Squarespace page address. Pages marked port=True get a code block.
PAGES = [
    ('index.html', '/', 'Home', True),
    ('menu.html', '/menu', 'Menu', True),
    ('experiences.html', '/experiences', 'Our Experiences', True),
    ('faq.html', '/faq', 'FAQ', True),
    ('testimonials.html', '/testimonials', 'Reviews & Press', True),
    ('contact.html', '/contact', 'Contact Us', True),
    ('book.html', '/book', 'Book Now', True),
    ('weddings.html', '/weddings', 'Weddings', True),
    ('corporate-events.html', '/corporate-events', 'Corporate events', True),
    ('cooking-classes.html', '/cooking-classes', 'Cooking classes', True),
    ('wollongong.html', '/wollongong', 'Wollongong', True),
    ('south-coast.html', '/south-coast', 'South Coast', True),
    ('southern-highlands.html', '/southern-highlands', 'Southern Highlands', True),
    ('sydney.html', '/sydney', 'Sydney', True),
    ('shop.html', '/shop', 'Shop', False),
    ('cart.html', '/cart', 'Cart', False),
    ('terms-and-conditions.html', '/terms-and-conditions', '', False),
    ('cancellation-policy.html', '/cancellation-policy', '', False),
    ('privacy-policy.html', '/privacy-policy', '', False),
    ('shop/egift-card.html', '/shop/p/egift-card', '', False),
    ('shop/brooke-silks-signature-chilli-jam.html', '/shop/p/brooke-silks-signature-chilli-jam', '', False),
    # Live address is /shop/p/test; GO-LIVE.md renames it and url-mappings.txt redirects
    ('shop/degustation-voucher.html', '/shop/p/degustation-voucher', '', False),
]
SLUG = {f[:-5]: s for f, s, _, _ in PAGES}
# Native Squarespace pages have no anchors of ours, so those are dropped
KEEP_ANCHORS = {f[:-5] for f, _, _, port in PAGES if port}


# ---- links -------------------------------------------------------------------
LINK_RE = re.compile(r'(?<![\w/.:-])(?:\.\./)?((?:shop/)?[a-z0-9-]+)\.html((?:\?[^"\'#\s<>]*)?)(#[\w-]+)?')


def links(s):
    def rep(m):
        page, q, anchor = m.group(1), m.group(2) or '', m.group(3) or ''
        assert page in SLUG, 'unknown page link: ' + m.group(0)
        if page not in KEEP_ANCHORS:
            anchor = ''
        return SLUG[page] + q + anchor
    s = LINK_RE.sub(rep, s)
    s = s.replace('https://dine-in.com.au//', 'https://dine-in.com.au/')
    return s


# ---- images ------------------------------------------------------------------
FORMATS = [100, 300, 500, 750, 1000, 1500, 2500]


def fmt_for(w):
    return next((f for f in FORMATS if f >= w), 2500)


def width_hint(name, fallback=1000):
    m = re.search(r'-(\d{3,4})\.\w+$', name)
    if m:
        return int(m.group(1))
    if '-sm.' in name:
        return 400
    # otherwise the width v2's own copy was saved at, which is what v2 was tuned to load
    p = os.path.join(V2, 'assets/images', name)
    if os.path.exists(p):
        from PIL import Image
        return min(Image.open(p).size[0], 1500)
    return fallback


def cdn(name, w=None):
    """CDN address for a v2 image file at about w pixels wide."""
    if name == 'og-image.jpg':  # the social crop isn't on the CDN; the hero photo it came from is
        name, w = 'home-banner-1920.webp', 1500
    if name in UPLOADS and UPLOADS[name]:
        return UPLOADS[name]
    assert name in IMAGES, 'image not on the CDN and not in uploads.json: ' + name
    url = IMAGES[name]['url']
    w = w or width_hint(name)
    if 'images.pexels.com' in url:
        return 'https://images.pexels.com/photos/5975429/pexels-photo-5975429.jpeg?auto=compress&cs=tinysrgb&w=%d' % min(w, 1260)
    if 'video.squarespace-cdn.com' in url or url.endswith('.gif'):
        return url
    return url + '?format=%dw' % fmt_for(w)


IMG_RE = re.compile(r'(?:https://dine-in\.com\.au/|\.\./)?assets/images/([\w.-]+)')


def srcset(m):
    out = []
    for part in m.group(1).split(','):
        part = part.strip()
        if ' ' not in part:  # <source srcset="one-file.webp">
            out.append(cdn(IMG_RE.match(part).group(1)))
            continue
        u, d = part.rsplit(' ', 1)
        name = IMG_RE.match(u).group(1)
        f = fmt_for(int(d[:-1]))
        out.append('%s %dw' % (cdn(name, f), f))
    return 'srcset="%s"' % ', '.join(out)


def images(s):
    s = re.sub(r'srcset="([^"]*assets/images/[^"]*)"', srcset, s)
    def one(m):
        return cdn(m.group(1))
    return IMG_RE.sub(one, s)


def portrait_fallback():
    """Until brooke-silk.webp is uploaded, a 640px copy rides inline."""
    from PIL import Image
    im = Image.open(os.path.join(V2, 'assets/images/brooke-silk.webp'))
    im.thumbnail((640, 875))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=72, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def media(s):
    """The two files that aren't on Brooke's CDN: chef portrait and the How it works loop."""
    if 'assets/images/brooke-silk.webp' in s and not UPLOADS.get('brooke-silk.webp'):
        s = s.replace('assets/images/brooke-silk.webp', portrait_fallback())
    if re.search(r'<video[^>]*data-motion-video', s) and not UPLOADS.get('how-it-works.mp4'):
        # Same animated GIF the live site shows today, until the 71 KB video is uploaded
        gif = IMAGES['how-it-works-poster.jpg']['url']
        s, k = re.subn(r'<video[^>]*data-motion-video[^>]*>.*?</video>',
                       '<img src="%s" width="320" height="478" alt="" loading="lazy" decoding="async">' % gif, s, flags=re.S)
        assert k == 1
    return s


# Squarespace's Menu Block styles .menu-item-title with !important. Those are the
# only Squarespace !important rules that reach v2 markup, so the kit renames them.
RENAME = {'menu-item-title': 'dinein-menu-item-title'}


def rename(s):
    for old, new in RENAME.items():
        s = re.sub(r'(?<![\w-])%s(?![\w-])' % re.escape(old), new, s)
    return s


def rewrite(s):
    return rename(images(media(links(s))))


# ---- CSS ---------------------------------------------------------------------
DROP = re.compile(r'\.menu-open|\.cart-|\.gallery|'
                  r'\.product-|\.buy-row|\.qty|\.mobile-nav|\.nav-cta|\.site-nav')
# :not(#_) adds one ID's weight to every Dine In selector, so Squarespace's own
# class rules (its Menu Block also uses .menu-item-title) can never win.
SCOPE = '.dinein:not(#_)'
PREFIX = re.compile(r'^(html:not\(\.js\)|\.js|body:(?:not|has)\((?:[^()]|\([^()]*\))*\)|\.print-one)\s+(.*)$')


def split_commas(sel):
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    out.append(cur.strip())
    return [x for x in out if x]


def scope_selector(sel, body):
    if DROP.search(sel) and not sel.startswith('body:has('):
        return None
    if sel == ':root' or sel.startswith('@'):
        return sel
    if sel == 'html':
        return None
    if sel == 'body':
        # the phone Call/Book bar needs room under Squarespace's footer too
        return 'body' if re.fullmatch(r'\s*padding-bottom:[^;]*;?\s*', body) else SCOPE
    if sel in ('*', '*::before', '*::after'):
        return SCOPE + ('' if sel == '*' else sel[1:]) + ', ' + SCOPE + ' ' + sel
    m = re.match(r'^body:has\((.*)\)\s+\.site-footer$', sel)
    if m:
        return 'body:has(.dinein %s) #footer-sections' % m.group(1)
    if '.site-footer' in sel:
        return None
    m = PREFIX.match(sel)
    if m:
        return m.group(1) + ' ' + SCOPE + ' ' + m.group(2)
    if sel.startswith('main '):
        sel = sel[5:]
    return SCOPE + ' ' + sel


def parse_blocks(css):
    """Yield (prelude, body) for each top-level block; body is raw text."""
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            break
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while depth:
            c = css[k]
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
            elif c in '"\'':
                k = css.index(c, k + 1)
            k += 1
        yield prelude, css[j + 1:k - 1]
        i = k


def scope_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out = []
    for prelude, body in parse_blocks(css):
        if prelude.startswith(('@media', '@supports', '@container')):
            inner = scope_css(body)
            if inner.strip():
                out.append('%s{%s}' % (prelude, inner))
        elif prelude.startswith(('@font-face', '@keyframes', '@property', '@page')):
            out.append('%s{%s}' % (prelude, body))
        else:
            sels = [scope_selector(s, body) for s in split_commas(prelude)]
            sels = [s for s in sels if s]
            if sels:
                out.append('%s{%s}' % (', '.join(sels), body))
    return '\n'.join(out)


def minify(css):
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};])\s*', r'\1', css)
    css = re.sub(r';}', '}', css)
    return css.strip()


SQS_CSS = '''
/* Squarespace adapter: a section holding a Dine In page block runs edge to edge */
.page-section:has(.dinein-page){padding:0!important;min-height:0!important}
.page-section:has(.dinein-page) .section-background{display:none!important}
.page-section:has(.dinein-page) .content-wrapper{padding:0!important;max-width:none!important;width:100%!important}
.page-section:has(.dinein-page) .content{width:100%!important;max-width:none!important}
.page-section:has(.dinein-page) .fluid-engine,.page-section:has(.dinein-page) .sqs-layout,.page-section:has(.dinein-page) .row,.page-section:has(.dinein-page) .col{display:block!important;width:auto!important;margin:0!important;padding:0!important}
.page-section:has(.dinein-page) .fe-block,.page-section:has(.dinein-page) .sqs-block,.page-section:has(.dinein-page) .sqs-block-content{padding:0!important;margin:0!important;min-height:0!important}
.dinein:not(#_){background:var(--paper);color:var(--ink);font-family:var(--font-body);font-size:var(--fs-body);line-height:1.65;text-align:start}
.dinein-chrome:not(#_),.dinein-footer:not(#_){background:none}
/* Squarespace's own header (and its announcement bar) give way to the Dine In header */
#header{display:none!important}
html{scroll-padding-top:calc(var(--hdr-bar) + 16px)}
.dinein-footer:not(#_){padding:8px 0 0}
/* Brooke's Adobe Fonts (Kepler) are already loaded by Squarespace: no size compensation needed */
:root{--display-scale:1;--large-scale:1}
'''


SQS_JS = """/* ---- Squarespace adapter ---- */
/* The Dine In header replaces Squarespace's (hidden in the Header injection).
   Move it to the top of <body> so it comes first for keyboard and screen-reader
   users, and mark the link to the page you're on. */
(function () {
  var c = document.querySelector('.dinein-chrome');
  if (c && document.body.firstElementChild !== c) document.body.insertBefore(c, document.body.firstChild);
  var here = location.pathname.replace(/\\/+$/, '') || '/';
  document.querySelectorAll('.dinein-chrome a[href^="/"]').forEach(function (a) {
    if ((a.pathname.replace(/\\/+$/, '') || '/') === here && !a.hash && !a.search) a.setAttribute('aria-current', 'page');
  });
})();"""


# Squarespace styles headings, paragraphs and links directly (h1 { color: ... }),
# which beats what v2 inherits. "all: revert" hands those elements back to the
# browser defaults v2 is built on. It outranks Squarespace's class rules but sits
# below every Dine In rule (:where() adds nothing, and it comes first). Chrome
# draws [hidden] as an attribute style, which revert also clears, so it is restated.
SQS_RESET = '''
.dinein:not(#_) :where(h1,h2,h3,h4,h5,h6,p,a,ul,ol,li,dl,dt,dd,blockquote,figure,figcaption,label,legend,fieldset,small,strong,em,b,i,sup,sub,abbr,mark,q,cite,time,button,input,select,textarea,table,th,td,img,picture,video,hr){all:revert}
.dinein:not(#_) :where([hidden]){display:none}
'''


def build_css():
    css = rename(rd(os.path.join(V2, 'assets/css/site.css')) + '\n' + rd(os.path.join(V2, 'assets/css/chef-card.css')))
    return minify(SQS_RESET + scope_css(css) + SQS_CSS)


# ---- JS ----------------------------------------------------------------------
def slim_js(s):
    """Drop whole-line comments and indentation (the files use no template literals)."""
    assert '`' not in s
    out, in_comment = [], False
    for line in s.split('\n'):
        t = line.strip()
        if in_comment:
            in_comment = not t.endswith('*/')
            continue
        if t.startswith('/*'):
            in_comment = not t.endswith('*/')
            continue
        if not t or t.startswith('//'):
            continue
        out.append(t)
    return '\n'.join(out)


def build_js():
    parts = []
    # The two data files keep their comments: they are where Brooke edits
    for f in ['reviews-data.js', 'forms-config.js', 'search-index.js', 'site.js', 'chef-card.js']:
        s = rd(os.path.join(V2, 'assets/js', f))
        if f in ('site.js', 'chef-card.js'):
            s = slim_js(s)
        parts.append('/* ---- %s ---- */\n%s' % (f, rewrite(s)))
    js = '\n'.join(parts)
    assert '.html' not in re.sub(r'https?://\S+', '', js.replace('innerHTML', '').replace('outerHTML', '')), 'html link left in JS'
    return js


# ---- pages -------------------------------------------------------------------
def main_html(src):
    a = src.index('<main id="page">') + len('<main id="page">')
    b = src.index('</main>')
    return src[a:b].strip()


def head_meta(src):
    get = lambda pat: (re.search(pat, src) or [None, ''])[1]
    return dict(title=get(r'<title>(.*?)</title>'), desc=get(r'<meta name="description" content="([^"]*)"'),
                og=get(r'<meta property="og:image" content="([^"]*)"'))


def page_header(src, slug):
    out = []
    for m in re.finditer(r'<link rel="preload" as="image" href="([^"]+)"( media="[^"]+")?>', src):
        out.append('<link rel="preload" as="image" href="%s"%s>' % (cdn(IMG_RE.search(m.group(1)).group(1)), m.group(2) or ''))
    for m in re.finditer(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', src, re.S):
        data = json.loads(m.group(1))
        s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        s = re.sub(r'https://dine-in\.com\.au/([a-z0-9/-]+)\.html', lambda x: SITE + SLUG[x.group(1)], s)
        s = images(s)
        s = s.replace(SITE + '/"', SITE + '/"')
        out.append('<script type="application/ld+json">%s</script>' % s)
    return '\n'.join(out) + '\n'


def seo_txt(meta, slug, name):
    og = meta['og'].replace('../', '')
    name_og = IMG_RE.search(og).group(1)
    if name_og == 'og-image.jpg':
        name_og = 'home-banner-1920.webp'
    img = cdn(name_og, 1500)
    return ('Page: %s\nURL slug: %s\n\nSEO title:\n%s\n\nSEO description:\n%s\n\nSocial sharing image (Page settings > Social image):\n%s\n'
            % (name, slug, html_unescape(meta['title']), html_unescape(meta['desc']), img))


def html_unescape(s):
    import html
    return html.unescape(s)


def build_pages():
    report = []
    for f, slug, name, port in PAGES:
        if not port:
            continue
        src = rd(os.path.join(V2, f))
        body = rewrite(main_html(src))
        key = 'home' if slug == '/' else slug.strip('/')
        block = ('<!-- Dine In: %s page. Paste into ONE Code Block that fills a blank section. Generated by build.py. -->\n'
                 '<div class="dinein dinein-page dinein-%s">\n%s\n</div>\n' % (name, key, body))
        leftovers = re.findall(r'(?<![\w/.:-])[\w/-]+\.html|assets/', re.sub(r'https?://[^"\s]+', '', block))
        assert not leftovers, (f, leftovers[:5])
        d = 'pages/%s/' % key
        wr(d + 'code-block.html', block)
        wr(d + 'page-header.html', '<!-- Page settings > Advanced > Page Header Code Injection for %s -->\n%s' % (slug, page_header(src, slug)))
        wr(d + 'seo.txt', seo_txt(head_meta(src), slug, name))
        report.append((key, len(block.encode('utf-8'))))
    return report


def build_sitewide(css, js):
    idx = rd(os.path.join(V2, 'index.html'))
    # Site chrome: skip link, header, spacer, menu drawer and the phone Call/Book bar.
    # aria-current comes off; the adapter script marks the page you're on instead.
    a = idx.index('<header class="ui-fp-header"')
    b = idx.index('<main id="page">')
    mob = re.search(r'<nav class="mobile-bar".*?</nav>', idx, re.S).group(0)
    bars = ('<a class="skip-link" href="#page">Skip to Content</a>\n' + idx[a:b].strip() + '\n' + mob)
    bars = bars.replace(' aria-current="page"', '')
    header = ('<!-- Settings > Developer tools > Code injection > HEADER. Generated by build.py. -->\n'
              '<script>document.documentElement.classList.add(\'js\')</script>\n'
              '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
              '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
              '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@200;300;400;500;600;700&display=swap">\n'
              '<style id="dinein-css">%s</style>\n' % css)
    footer = ('<!-- Settings > Developer tools > Code injection > FOOTER. Generated by build.py. -->\n'
              '<div class="dinein dinein-chrome">\n%s\n</div>\n<script>\n%s\n%s\n</script>\n' % (rewrite(bars), SQS_JS, js))
    wr('sitewide/header-injection.html', header)
    wr('sitewide/footer-injection.html', footer)
    occ = re.search(r'<nav class="footer-occasions".*?</nav>', idx).group(0)
    areas = re.search(r'<nav class="footer-areas".*?</nav>', idx).group(0)
    wr('sitewide/footer-links.html', '<!-- Footer: a Code Block above the policy links. Generated by build.py. -->\n'
       '<div class="dinein dinein-footer">\n%s\n%s\n</div>\n' % (links(occ), links(areas)))
    return len(header.encode()), len(footer.encode())


def build_gift_copy():
    g = rd(os.path.join(V2, 'shop/egift-card.html'))
    strip = lambda h: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).strip()
    facts = re.findall(r'<li><strong>(.*?)</strong><span>(.*?)</span></li>', g)
    redeem = re.search(r'<h2 id="gift-redeem-title">(.*?)</h2>\s*<p>(.*?)</p>', g)
    lead = re.search(r'<p class="gift-lead">(.*?)</p>', g).group(1)
    txt = ['eGift Card: copy for the native Squarespace product page',
           '(Commerce > Products > eGift Card > Description / Additional info). Generated by build.py.', '',
           lead, '', 'GOOD TO KNOW']
    txt += ['- %s: %s' % (html_unescape(a), html_unescape(b)) for a, b in facts]
    # (v2's "How it works" steps describe its own occasion picker, which the native product page doesn't have)
    txt += ['', html_unescape(redeem.group(1)).upper(), html_unescape(strip(redeem.group(2))),
            'Link "Book your experience" to: %s/book?src=gift-card-redeem&gift=1' % SITE, '']
    wr('shop/egift-card-description.txt', '\n'.join(txt))


def copy_uploads():
    d = os.path.join(HERE, 'uploads')
    os.makedirs(d, exist_ok=True)
    for f in ['brooke-silk.webp', 'how-it-works.mp4', 'how-it-works.webm', 'how-it-works-poster.jpg']:
        shutil.copyfile(os.path.join(V2, 'assets/images', f), os.path.join(d, f))
    from PIL import Image  # in case Custom files won't take .webp: same cut-out, transparent PNG
    Image.open(os.path.join(V2, 'assets/images/brooke-silk.webp')).save(os.path.join(d, 'brooke-silk.png'), optimize=True)


if __name__ == '__main__':
    css, js = build_css(), build_js()
    hb, fb = build_sitewide(css, js)
    pages = build_pages()
    build_gift_copy()
    wr('url-mappings.txt', '/shop/p/test -> /shop/p/degustation-voucher 301\n')
    copy_uploads()
    print('header injection %d KB, footer injection %d KB' % (hb // 1024, fb // 1024))
    for k, n in pages:
        print('  %-20s %3d KB' % (k, n // 1024))
