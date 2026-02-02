import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Blog({ posts }) {
  return (
    <>
      <Head>
        <title>ChapterIQ - Blog</title>
        <meta
          name="description"
          content="Read tips, study guides, and productivity articles by ChapterIQ"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Header />
      <main className="blog-main">
        <div className="blog-container">
          <h1 className="blog-heading">Blog</h1>
          <ul className="blog-list">
            {posts.map((post) => (
<li key={post.slug} className="blog-list-item">
  <Link href={`/blog/${post.slug}`}>
    <div className="blog-card">
      {post.image && <img src={post.image} className="blog-card-image" />}
      <div className="blog-card-text">
        <h2>{post.title}</h2>
        <p>{post.description}</p>
        <div className="blog-meta">
          <span className="blog-author">by {post.author || "ChapterIQ Team"}</span>
          <span className="blog-date">
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  </Link>
</li>

))}

          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}

export async function getStaticProps() {
  const files = fs.readdirSync(path.join("content/blog"));
  const posts = files.map((filename) => {
    const markdownWithMeta = fs.readFileSync(
      path.join("content/blog", filename),
      "utf-8"
    );
    const { data } = matter(markdownWithMeta);
    return {
      slug: filename.replace(".mdx", ""),
      ...data,
    };
  });

  return {
    props: {
      posts: posts.sort((a, b) => new Date(b.date) - new Date(a.date)),
    },
  };
}
