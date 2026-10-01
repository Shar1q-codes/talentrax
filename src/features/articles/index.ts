/**
 * The public surface of this feature. Code outside src/features/articles/
 * imports from "@/features/articles" and nothing deeper; anything not
 * exported here is private to the feature.
 */

export { ArticleBody } from "./components/ArticleBody";
export { ArticleList } from "./components/ArticleList";
export { ArticleModal } from "./components/ArticleModal";
export { EmptyInsights } from "./components/EmptyInsights";
export { blogPostingJsonLd } from "./article-schema";
export { getArticleBySlug, getArticles, getRelatedArticles } from "./queries";
export type {
  Article,
  ArticleBlock,
  ArticleFaq,
  ArticleSource,
  LinkMark,
  RichText,
} from "./queries";
