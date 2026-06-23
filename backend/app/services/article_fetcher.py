"""
article_fetcher.py
------------------
Fetches news articles, blogs, and web content for stocks from free sources:
  1. Google News RSS
  2. Economic Times Markets RSS
  3. Moneycontrol News page (HTML scrape)
  4. Bing News search (HTML scrape fallback)

For each article:
  - Scrapes full article body text
  - Detects sentiment (keyword-based + optional LLM)
  - Generates short LLM summary
  - Deduplicates by URL before saving to DB
"""

import re
import time
import logging
import datetime
import urllib.parse
from typing import List, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

_REQUEST_TIMEOUT = 10
_SCRAPE_PAUSE = 0.5  # seconds between web requests


def _get(url: str, timeout: int = _REQUEST_TIMEOUT) -> Optional[requests.Response]:
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=timeout)
        if resp.status_code == 200:
            return resp
        logger.debug(f"HTTP {resp.status_code} for {url}")
    except Exception as e:
        logger.debug(f"Request failed for {url}: {e}")
    return None


# ---------------------------------------------------------------------------
# RSS parsers
# ---------------------------------------------------------------------------

def _parse_rss(rss_text: str) -> List[dict]:
    """Parse RSS XML into list of {title, url, published_date, source}."""
    items = []
    try:
        # Try feedparser first (better)
        import feedparser
        feed = feedparser.parse(rss_text)
        for entry in feed.entries:
            pub = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                pub = datetime.datetime(*entry.published_parsed[:6])
            items.append({
                "title": entry.get("title", "").strip(),
                "url": entry.get("link", "").strip(),
                "published_date": pub,
            })
        return items
    except ImportError:
        pass

    # Fallback: regex-based lightweight parse
    from xml.etree import ElementTree as ET
    try:
        root = ET.fromstring(rss_text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        channel = root.find("channel")
        if channel is None:
            channel = root
        for item in channel.findall("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            pub_el = item.find("pubDate")
            title = title_el.text.strip() if title_el is not None and title_el.text else ""
            url = link_el.text.strip() if link_el is not None and link_el.text else ""
            pub = None
            if pub_el is not None and pub_el.text:
                try:
                    from email.utils import parsedate_to_datetime
                    pub = parsedate_to_datetime(pub_el.text).replace(tzinfo=None)
                except Exception:
                    pass
            if title and url:
                items.append({"title": title, "url": url, "published_date": pub})
    except Exception as e:
        logger.warning(f"RSS parse failed: {e}")
    return items


# ---------------------------------------------------------------------------
# Source 1: Google News RSS
# ---------------------------------------------------------------------------

def fetch_google_news(company_name: str, symbol: str, limit: int = 40) -> List[dict]:
    """Fetch articles from Google News RSS for the company."""
    results = []
    queries = [
        f'"{company_name}" stock',
        f"{symbol} NSE",
        f"{company_name} earnings results",
    ]
    seen_urls = set()

    for query in queries:
        if len(results) >= limit:
            break
        encoded = urllib.parse.quote_plus(query)
        url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
        resp = _get(url)
        if not resp:
            continue
        items = _parse_rss(resp.text)
        for item in items:
            if len(results) >= limit:
                break
            u = item.get("url", "")
            if u and u not in seen_urls:
                seen_urls.add(u)
                item["source"] = "Google News"
                item["source_type"] = "news"
                results.append(item)
        time.sleep(_SCRAPE_PAUSE)

    logger.info(f"[{symbol}] Google News: found {len(results)} articles")
    return results


# ---------------------------------------------------------------------------
# Source 2: Economic Times RSS
# ---------------------------------------------------------------------------

def fetch_et_news(company_name: str, symbol: str, limit: int = 20) -> List[dict]:
    """Fetch articles from Economic Times RSS."""
    results = []
    seen_urls = set()
    encoded = urllib.parse.quote_plus(company_name)
    rss_url = f"https://economictimes.indiatimes.com/rssfeedstopstories.cms"
    search_url = f"https://economictimes.indiatimes.com/searchresult.cms?query={encoded}&type=news"

    # Try topic-specific ET RSS
    et_feeds = [
        f"https://economictimes.indiatimes.com/markets/stocks/news/rssfeeds/{encoded}/articleshow.cms",
        rss_url,
    ]
    for feed_url in et_feeds:
        if len(results) >= limit:
            break
        resp = _get(feed_url)
        if not resp:
            continue
        items = _parse_rss(resp.text)
        for item in items:
            if len(results) >= limit:
                break
            u = item.get("url", "")
            title = item.get("title", "")
            # Filter: must mention company or symbol
            if (
                company_name.lower().split()[0] in title.lower()
                or symbol.lower() in title.lower()
            ) and u not in seen_urls:
                seen_urls.add(u)
                item["source"] = "Economic Times"
                item["source_type"] = "news"
                results.append(item)
        time.sleep(_SCRAPE_PAUSE)

    logger.info(f"[{symbol}] ET News: found {len(results)} articles")
    return results


# ---------------------------------------------------------------------------
# Source 3: Moneycontrol News scrape
# ---------------------------------------------------------------------------

def fetch_moneycontrol_news(company_name: str, symbol: str, limit: int = 20) -> List[dict]:
    """Scrape Moneycontrol news listing for the company."""
    results = []
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.warning("BeautifulSoup not available, skipping Moneycontrol scrape")
        return []

    encoded = urllib.parse.quote_plus(company_name)
    search_url = f"https://www.moneycontrol.com/news/tags/{encoded.replace('+', '-').lower()}.html"
    resp = _get(search_url)
    if not resp:
        # Fallback to search page
        search_url = f"https://www.moneycontrol.com/news/business/stocks/"
        resp = _get(search_url)
    if not resp:
        logger.warning(f"[{symbol}] Moneycontrol: could not fetch news page")
        return []

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
        seen_urls = set()
        # Moneycontrol listing cards
        for tag in soup.select("li.clearfix h2 a, .news_listing h2 a, li.article a[href]"):
            if len(results) >= limit:
                break
            href = tag.get("href", "")
            title = tag.get_text(strip=True)
            if not href or not title:
                continue
            if not href.startswith("http"):
                href = "https://www.moneycontrol.com" + href
            # Filter relevance
            if (
                company_name.lower().split()[0] in title.lower()
                or symbol.lower() in title.lower()
            ) and href not in seen_urls:
                seen_urls.add(href)
                results.append({
                    "title": title,
                    "url": href,
                    "published_date": None,
                    "source": "Moneycontrol",
                    "source_type": "news",
                })
    except Exception as e:
        logger.warning(f"[{symbol}] Moneycontrol parse error: {e}")

    logger.info(f"[{symbol}] Moneycontrol: found {len(results)} articles")
    return results


# ---------------------------------------------------------------------------
# Source 4: Bing News search fallback
# ---------------------------------------------------------------------------

def fetch_bing_news(company_name: str, symbol: str, limit: int = 20) -> List[dict]:
    """Scrape Bing News search results for additional coverage."""
    results = []
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []

    query = f"{company_name} stock news India"
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.bing.com/news/search?q={encoded}&form=QBLH&sp=-1&pq={encoded}&sc=0-0&qs=n&sk="

    resp = _get(url)
    if not resp:
        return []

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
        seen_urls = set()
        for card in soup.select("div.news-card, a.title"):
            if len(results) >= limit:
                break
            title_el = card.select_one("a.title, .title")
            if not title_el:
                title_el = card if card.name == "a" else None
            if not title_el:
                continue
            href = title_el.get("href", "")
            title = title_el.get_text(strip=True)
            if not href or not title or href in seen_urls:
                continue
            # Resolve Bing redirect
            if "bing.com" in href:
                continue  # Skip Bing internal links
            seen_urls.add(href)
            results.append({
                "title": title,
                "url": href,
                "published_date": None,
                "source": "Bing News",
                "source_type": "news",
            })
    except Exception as e:
        logger.warning(f"[{symbol}] Bing News parse error: {e}")

    logger.info(f"[{symbol}] Bing News: found {len(results)} articles")
    return results


# ---------------------------------------------------------------------------
# Article body scraper
# ---------------------------------------------------------------------------

def scrape_article_content(url: str) -> str:
    """
    Fetch a web article and extract clean body text.
    Uses readability-lxml if available, else falls back to BeautifulSoup heuristics.
    """
    resp = _get(url, timeout=15)
    if not resp:
        return ""

    html = resp.text

    # Strategy 1: readability-lxml (best quality)
    try:
        from readability import Document
        doc = Document(html)
        raw = doc.summary()
        try:
            from bs4 import BeautifulSoup
            clean = BeautifulSoup(raw, "html.parser").get_text(separator="\n")
        except Exception:
            clean = re.sub(r"<[^>]+>", " ", raw)
        clean = re.sub(r"\s+", " ", clean).strip()
        if len(clean) > 200:
            return clean[:8000]  # Cap at 8000 chars
    except ImportError:
        pass

    # Strategy 2: BeautifulSoup heuristic extraction
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        # Remove boilerplate tags
        for tag in soup(["script", "style", "nav", "header", "footer",
                          "aside", "form", "iframe", "noscript", "svg"]):
            tag.decompose()

        # Try common article body selectors in order of priority
        for selector in [
            "article", "[class*='article-body']", "[class*='article_body']",
            "[class*='story-content']", "[class*='post-content']",
            "[class*='entry-content']", "[class*='content-body']",
            "main", ".article", "#article-body", "#content"
        ]:
            el = soup.select_one(selector)
            if el:
                text = el.get_text(separator="\n")
                text = re.sub(r"\s+", " ", text).strip()
                if len(text) > 200:
                    return text[:8000]

        # Last resort: full page text
        text = soup.get_text(separator="\n")
        text = re.sub(r"\s+", " ", text).strip()
        return text[:5000]
    except Exception as e:
        logger.debug(f"Content scrape failed for {url}: {e}")
        return ""


# ---------------------------------------------------------------------------
# Sentiment detection (keyword-based)
# ---------------------------------------------------------------------------

_POS_WORDS = {
    "surge", "soar", "rally", "profit", "growth", "record", "beat", "strong",
    "outperform", "upgrade", "buy", "bullish", "win", "order", "award",
    "expansion", "positive", "rise", "gain", "increase", "up", "high",
    "revenue", "margin", "dividend", "optimistic", "confidence"
}
_NEG_WORDS = {
    "fall", "drop", "decline", "loss", "miss", "weak", "downgrade", "sell",
    "bearish", "reduce", "concern", "warning", "risk", "debt", "negative",
    "down", "low", "cut", "layoff", "fraud", "penalty", "fine", "slowdown",
    "delay", "disappoint", "crash", "plunge", "slump", "withdraw"
}


def detect_sentiment(text: str) -> str:
    """Keyword-based sentiment: Positive, Negative, Neutral."""
    lower = text.lower()
    words = set(re.findall(r"\b\w+\b", lower))
    pos_count = len(words & _POS_WORDS)
    neg_count = len(words & _NEG_WORDS)
    if pos_count > neg_count + 1:
        return "Positive"
    elif neg_count > pos_count + 1:
        return "Negative"
    return "Neutral"


# ---------------------------------------------------------------------------
# LLM Summary generation
# ---------------------------------------------------------------------------

def summarize_article(title: str, content: str) -> str:
    """Generate a 2-sentence summary using Ollama LLM."""
    try:
        from app.core.ollama import ollama_client
        snippet = content[:2000] if content else title
        prompt = (
            f"Summarize the following financial news article in exactly 2 concise sentences. "
            f"Focus on facts relevant to investors. Do not add commentary.\n\n"
            f"Title: {title}\n\nContent: {snippet}\n\nSummary:"
        )
        summary = ollama_client.generate_completion(prompt).strip()
        # Truncate to 500 chars max
        return summary[:500]
    except Exception as e:
        logger.debug(f"LLM summary failed: {e}")
        # Fallback: first 200 chars of content
        return (content[:200] + "...") if content else title


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def fetch_and_store_articles(
    symbol: str,
    company_name: str,
    db,
    limit: int = 100
) -> list:
    """
    Fetch up to `limit` articles for a stock from all sources.
    Deduplicates by URL, scrapes full content, detects sentiment,
    generates summary, and saves new articles to the DB.

    Returns list of new StockArticle ORM objects (not yet vectorized).
    """
    from app.models.models import StockArticle

    logger.info(f"[{symbol}] Starting article fetch (limit={limit})...")

    # Collect raw article metadata from all sources
    raw_articles: List[dict] = []

    # Allocate limit across sources
    per_source = limit // 4 + 1

    # Source 1: Google News (primary — best coverage)
    raw_articles.extend(fetch_google_news(company_name, symbol, limit=per_source * 2))

    # Source 2: Economic Times
    raw_articles.extend(fetch_et_news(company_name, symbol, limit=per_source))

    # Source 3: Moneycontrol
    raw_articles.extend(fetch_moneycontrol_news(company_name, symbol, limit=per_source))

    # Source 4: Bing News (fill remaining quota)
    remaining = limit - len(raw_articles)
    if remaining > 0:
        raw_articles.extend(fetch_bing_news(company_name, symbol, limit=remaining))

    # Dedup by URL within this batch
    seen = set()
    deduped = []
    for a in raw_articles:
        u = a.get("url", "").strip()
        if u and u not in seen:
            seen.add(u)
            deduped.append(a)
        if len(deduped) >= limit:
            break

    logger.info(f"[{symbol}] Total unique article candidates: {len(deduped)}")

    new_articles = []
    for item in deduped:
        url = item.get("url", "").strip()
        title = item.get("title", "").strip()
        if not url or not title:
            continue

        # Skip if already in DB
        existing = db.query(StockArticle).filter(StockArticle.url == url).first()
        if existing:
            logger.debug(f"[{symbol}] Skipping duplicate: {url}")
            continue

        # Scrape article body
        time.sleep(_SCRAPE_PAUSE)
        content = scrape_article_content(url)

        # Detect sentiment
        sentiment_text = title + " " + content
        sentiment = detect_sentiment(sentiment_text)

        # Generate summary
        summary = summarize_article(title, content)

        # Create DB record
        article = StockArticle(
            stock_symbol=symbol,
            title=title,
            url=url,
            source=item.get("source", "Unknown"),
            source_type=item.get("source_type", "news"),
            published_date=item.get("published_date"),
            content_text=content,
            summary=summary,
            sentiment=sentiment,
            is_vectorized=False,
        )
        try:
            db.add(article)
            db.commit()
            db.refresh(article)
            new_articles.append(article)
            logger.info(f"[{symbol}] Saved article: {title[:60]}... [{sentiment}]")
            
            # Risk & Sentiment scan alert hook
            from app.services.alert_manager import AlertManager
            AlertManager.inspect_and_alert(symbol, title, sentiment, summary or "")
        except Exception as e:
            db.rollback()
            logger.warning(f"[{symbol}] Could not save article (likely duplicate URL): {e}")

    logger.info(f"[{symbol}] Article fetch complete. {len(new_articles)} new articles saved.")
    return new_articles

