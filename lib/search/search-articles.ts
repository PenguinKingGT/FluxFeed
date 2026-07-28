import type { Article } from '@/lib/types/article';

const HTML_TAG_PATTERN = /<[^>]*>/g;
const WHITESPACE_PATTERN = /\s+/g;

function searchableText(article: Article): string {
  return [
    article.title,
    article.summary,
    article.content.replace(HTML_TAG_PATTERN, ' '),
    article.author,
    article.tags.join(' '),
  ]
    .join(' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .toLocaleLowerCase();
}

export function searchArticles(articles: Article[], query: string): Article[] {
  const terms = query
    .trim()
    .toLocaleLowerCase()
    .split(WHITESPACE_PATTERN)
    .filter(Boolean);

  if (terms.length === 0) {
    return articles;
  }

  return articles.filter((article) => {
    const text = searchableText(article);
    return terms.every((term) => text.includes(term));
  });
}
