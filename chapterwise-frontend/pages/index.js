// import { useState } from "react";
// import Head from "next/head";
import Header from "@/components/Header.js";
import Footer from "@/components/Footer.js";
import SEO from "@/components/SEO";

export default function Home() {
  return (
    <>
    <SEO
              title="Turn Textbook Chapters into Exam-Ready Notes"
                description="ChapterIQ helps students turn textbook chapters into exam-ready study notes so you focus only on what matters for exams."
                url="https://www.chapteriq.com/"
                jsonLd={{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ChapterIQ",
    "url": "https://www.chapteriq.com",
    "logo": "https://www.chapteriq.com/logo.png"
  }}
              />
      <main>
        <Header />
        <div className="landing-container">
          <p className="tagline1">Read less. Remember more.</p>
          <h1 className="headline">
            Turn textbook chapters into exam-ready notes
          </h1>
          <p className="sub-headline">
            Upload a chapter. Get clear, structured notes made for exams.
          </p>
          <a href="/app" className="cta-app">
            Summarize a chapter
          </a>
          <p className="tagline2">Designed for undergraduate exams</p>
        </div>
        <div className="how-it-works">
          <h2>How it works?</h2>
          <p>
            <span className="numbered-list">1.</span> Upload a chapter
          </p>
          <p>
            <span className="numbered-list">2.</span> Get clean, structured
            notes
          </p>
          <p>
            <span className="numbered-list">3.</span> Study fast with confidence
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
