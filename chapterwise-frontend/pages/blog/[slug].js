import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";


// Highlight component
function Highlight({ children }) {
  return <mark className="highlight">{children}</mark>;
}

const components = { Highlight };

export default function Post({ frontMatter, mdxSource }) {
  return (
    <>
      <Head>
        <title>{frontMatter.title} - ChapterIQ Blog</title>
        <meta name="description" content={frontMatter.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Header />
      <main className="blog-main">
        <a href="/blog" className="back-to-blog">← Back to Blog</a>
<div className="post-container">
  {frontMatter.image && (
    <img src={frontMatter.image} className="post-image" />
  )}
  <h1 className="post-title">{frontMatter.title}</h1>
  <div className="post-meta">
    <span className="post-author">by {frontMatter.author || "ChapterIQ Team"}</span>
    <span className="post-date">
      {new Date(frontMatter.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </span>
    {/* Tags */}
{frontMatter.tags?.length > 0 && (
  <div className="post-tags">
    {frontMatter.tags.map((tag) => (
      <span key={tag} className="tag">{tag}</span>
    ))}
  </div>
)}
  </div>
  <div className="post-content">
    <MDXRemote {...mdxSource} components={{ Highlight }} />
  </div>
</div>
      </main>
      <Footer />
    </>
  );
}

export async function getStaticPaths() {
  const files = fs.readdirSync(path.join("content/blog"));
  const paths = files.map((filename) => ({
    params: { slug: filename.replace(".mdx", "") },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params: { slug } }) {
  const markdownWithMeta = fs.readFileSync(
    path.join("content/blog", slug + ".mdx"),
    "utf-8"
  );

  const { data: frontMatter, content } = matter(markdownWithMeta);
  const mdxSource = await serialize(content);

  return { props: { frontMatter, mdxSource } };
}
