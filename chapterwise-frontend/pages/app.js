"use client";
import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Header from "@/components/Header.js";
import Footer from "@/components/Footer.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpFromBracket, faDownload } from "@fortawesome/free-solid-svg-icons";
import { faCopy as faCopyRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faCopy as faCopySolid,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
// import mammoth from "mammoth/mammoth.browser";
// import JSZip from "jszip";
// import { parseStringPromise } from "xml2js";
// import { jsPDF } from "jspdf";
import SEO from "@/components/SEO";
import dynamic from "next/dynamic";

// Only load when the component mounts
const Mammoth = dynamic(() => import("mammoth/mammoth.browser"), { ssr: false });
const JSZipClient = dynamic(() => import("jszip"), { ssr: false });
const Xml2Js = dynamic(() => import("xml2js"), { ssr: false });
const JsPDF = dynamic(() => import("jspdf"), { ssr: false });


export default function App() {
  const [text, setText] = useState("");
  const [textareaActive, setTextareaActive] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [isAiOutput, setIsAiOutput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const generateButtonRef = useRef(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
const [startPage, setStartPage] = useState("");
const [endPage, setEndPage] = useState("");
const [downloadWholePdf, setDownloadWholePdf] = useState(false);
const [pdfMode, setPdfMode] = useState(false);
const [pdfSubmitted, setPdfSubmitted] = useState(false);
const [originalChapter, setOriginalChapter] = useState("");



  const successRef = useRef(null);

const handleSummarize = async () => {
  // ---------- PDF PAGE EXTRACTION ----------
if (pdfMode && uploadedFile) {

  // If not downloading whole PDF, validate page range
  if (!downloadWholePdf) {
    if (!startPage || !endPage || startPage < 1 || endPage < startPage) {
      setAiOutput("Please enter a valid page range.");
      setIsAiOutput(false);
      return;
    }
  }

  setLoading(true);
  setAiOutput("");

  try {
    const formData = new FormData();
    formData.append("file", uploadedFile);

    // Only send pages if user selected a range
    if (!downloadWholePdf) {
      formData.append("startPage", startPage);
      formData.append("endPage", endPage);
    }

    const res = await fetch("http://localhost:5000/api/extract-text", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to extract text from PDF.");

    const data = await res.json();

    // Don't set text, just generate notes directly
    setPdfMode(false);
    setUploaded(false);
    setStartPage("");
    setEndPage("");
    setDownloadWholePdf(false); // reset checkbox

    // Send extracted pages directly to notes generation
    setOriginalChapter(data.text);
    setPdfSubmitted(true);
    await generateNotes(data.text, true);

  } catch (err) {
    console.error(err);
    setAiOutput("Failed to extract text from PDF.");
    setIsAiOutput(false);
  } finally {
    setLoading(false);
  }

  return;
}


  // ---------- NORMAL TEXT MODE ----------
  if (!text.trim()) {
    setAiOutput("Please paste some text before generating notes.");
    setIsAiOutput(false);
    return;
  }

  // Optional: warn if text is very short
if (text.trim().length < 1000) {  // arbitrary minimum length
  setAiOutput("Text is too short to summarize.");
  setIsAiOutput(false);
  return;
}

  // Store the text-area content as original chapter
setOriginalChapter(text);

await generateNotes(text);


};

// Function to track guest usage
function updateGuestUsage(chars) {
  const today = new Date().toISOString().split("T")[0];
  let guestUsage = JSON.parse(localStorage.getItem("guestUsage") || "{}");

  if (guestUsage.date !== today) {
    guestUsage = { date: today, used: 0 };
  }

  guestUsage.used += chars;
  localStorage.setItem("guestUsage", JSON.stringify(guestUsage));
  return guestUsage.used;
}




// Separate function to call /generate-notes
const generateNotes = async (chapterText, fromPDF = false) => {
  setLoading(true);
  setAiOutput("");

  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Only include userId if logged in
    const payload = { text: chapterText };
    if (user?.id) payload.userId = user.id;

    // --------------------- GUEST LIMIT CHECK ---------------------
    if (!payload.userId) {
      const guestUsage = JSON.parse(localStorage.getItem("guestUsage") || "{}");
      const today = new Date().toISOString().split("T")[0];

      if (guestUsage.date !== today) {
        guestUsage.date = today;
        guestUsage.used = 0;
      }

      const guestDailyLimit = 1000;

      if ((guestUsage.used + chapterText.length) > guestDailyLimit) {
        setAiOutput("Guest limit reached. Please signup for more usage.");
        setIsAiOutput(false);
        setLoading(false);
        return;
      }

      guestUsage.used += chapterText.length;
      localStorage.setItem("guestUsage", JSON.stringify(guestUsage));
    }

    // --------------------- API CALL ---------------------
    const res = await fetch("http://localhost:5000/api/generate-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setAiOutput(data.error || "Error: Could not generate notes.");
      setIsAiOutput(false);
      return;
    }

    setAiOutput(data.output);
    setIsAiOutput(true);

    setTimeout(() => {
      successRef.current?.focus();
    }, 100);
  } catch (err) {
    console.error(err);
    setAiOutput("Error: Could not connect to server.");
    setIsAiOutput(false);
  } finally {
    setLoading(false);
    if (!fromPDF) setText("");
    generateButtonRef.current?.blur();
  }
};

  // copy to clipboard output
  const handleCopy = () => {
    if (!aiOutput) return;

    navigator.clipboard.writeText(aiOutput); // copy to clipboard
    setCopied(true);

    setTimeout(() => {
      setCopied(false); // revert after 5-10 seconds
    }, 5000); // 5000ms = 5 seconds
  };

const handleReset = () => {
  setText("");          // clear textarea
  setAiOutput("");      // clear AI output
  setLoading(false);
  setUploadedFile(null); // remove uploaded file
  setPdfMode(false);     // exit PDF mode
  setStartPage("");
  setEndPage("");
  setUploaded(false);    // optional: controls upload feedback
  setPdfSubmitted(false);
};


  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let extractedText = "";

    try {
      // ---------------- TXT ----------------
      if (fileName.endsWith(".txt")) {
        extractedText = await file.text();
      }
      // ---------------- Word ----------------
      else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      }
      // ---------------- PPTX ----------------
      else if (fileName.endsWith(".pptx") || fileName.endsWith(".ppt")) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        let pptText = "";

        const slideFiles = Object.keys(zip.files).filter(
          (f) => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")
        );

        for (const slidePath of slideFiles) {
          const slideData = await zip.files[slidePath].async("text");
          const slideXml = await parseStringPromise(slideData);

          const texts = [];
          const extractText = (obj) => {
            for (let key in obj) {
              if (key === "a:t") {
                if (Array.isArray(obj[key])) texts.push(obj[key].join(" "));
              } else if (typeof obj[key] === "object") extractText(obj[key]);
            }
          };
          extractText(slideXml);
          pptText += texts.join(" ") + "\n";
        }

        extractedText =
          pptText || "Could not extract text from this PPTX file.";
      }
      // ---------------- PDF ----------------
      else if (fileName.endsWith(".pdf")) {
  setUploadedFile(file);
  setPdfMode(true);
  setText(""); // clear textarea
  return; // stop here, wait for page input
}
      // else if (fileName.endsWith(".pdf")) {
      //   // send PDF to Node.js server for extraction
      //   const formData = new FormData();
      //   formData.append("file", file);

      //   const res = await fetch("http://localhost:5000/api/extract-text", {
      //     method: "POST",
      //     body: formData,
      //   });

      //   if (!res.ok) throw new Error("Failed to extract text from PDF.");

      //   const data = await res.json();
      //   extractedText = data.text;
      // }
      // ---------------- Unsupported ----------------
      else {
        alert("Unsupported file type. Allowed: PDF, Word, PPTX, TXT.");
        return;
      }

      // ---------------- Update textarea ----------------
      setText(extractedText);
      setUploaded(true);

      if (generateButtonRef.current) {
        generateButtonRef.current.classList.add("highlight");
        setTimeout(() => {
          generateButtonRef.current.classList.remove("highlight");
        }, 3000);
        generateButtonRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } catch (err) {
      console.error("File parsing error:", err);
      alert("Failed to extract text from the uploaded file.");
    }
  };

const handleDownloadPDF = () => {
  if (!aiOutput) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const margin = 40;
  const lineHeight = 18;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight() - margin * 2;

  let y = margin;

  const headings = [
    "Chapter Name:",
    "Overview:",
    "Chapter Summary:",
    "Key Concepts:",
    "Important Definitions:",
    "Exam Focus:",
    "Original Chapter:"
  ];

  const addText = (text) => {
    const lines = text.split("\n");

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      const isHeading = headings.some((h) => line.startsWith(h));

      doc.setFont("helvetica", isHeading ? "bold" : "normal");
      doc.setFontSize(12); // <-- keep font size 12

      const wrapped = doc.splitTextToSize(line, pageWidth);

      wrapped.forEach((wLine) => {
        if (y + lineHeight > pageHeight + margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(wLine, margin, y);
        y += lineHeight;
      });
    });
  };

  // -------- Add AI Notes --------
  addText(aiOutput);

  // -------- Add Original Chapter --------
  if (originalChapter) {
    addText("\n\nOriginal Chapter:\n\n" + originalChapter);
  }

  doc.save("ChapterNotes.pdf");
};
  return (
    <>
      <SEO
        title="Turn Textbook Chapters into Exam-Ready Notes"
        description="Use ChapterIQ to turn textbook chapters into concise, exam-ready study notes. Focus on what matters and study smarter for your exams."
        url="https://www.chapteriq.com/app"
        jsonLd={{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ChapterIQ Web App",
    "url": "https://www.chapteriq.com/app",
    "applicationCategory": "Education",
    "operatingSystem": "Web",
    "description": "Upload a chapter and get exam-ready notes in seconds."
  }}
      />
      <main>
        <Header />
        <div className="app-container">
          {(!aiOutput || !isAiOutput) && (
            <>
              <h1 className="app-h1">
                Turn textbook chapters into{" "}
                <span className="highlight">exam-ready study notes instantly</span>
              </h1>
              <p className="app-p">
                Paste your chapter or upload a file, and get clear, exam-ready
                notes in seconds.
              </p>
              <div className="textarea-wrapper">
                 {/* -------- PDF MODE -------- */}
 {/* PDF page input or normal textarea */}
{(!pdfSubmitted && !loading) && (
    pdfMode && uploadedFile ? (
  <div className="pdf-upload-box">
    <p><strong>📄 {uploadedFile.name}</strong></p>

    <div className="page-inputs">
  <input
    type="number"
    placeholder="Start page"
    value={startPage}
    onChange={(e) => setStartPage(e.target.value)}
    min="1"
    disabled={downloadWholePdf}
  />

  <span>to</span>

  <input
    type="number"
    placeholder="End page"
    value={endPage}
    onChange={(e) => setEndPage(e.target.value)}
    min="1"
    disabled={downloadWholePdf}
  />
</div>


    <p className="page-hint">
      Only selected pages will be summarized.
    </p>

    <div className="checkbox-container">
  <input
    type="checkbox"
    id="wholePdf"
    checked={downloadWholePdf}
    onChange={(e) => setDownloadWholePdf(e.target.checked)}
  />
  <label htmlFor="wholePdf">Summarize entire PDF</label>
</div>
  </div>
) : (
  // -------- Normal text input --------
   !pdfSubmitted && (
    <textarea
      id="chapterTextarea"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setTextareaActive(true)}
      onBlur={() => setTextareaActive(false)}
      placeholder="Paste your chapter here…"
    />
  )
))}

  {/* Upload button */}
  {!text && !textareaActive && !pdfMode && !pdfSubmitted && (
    <>
      <button
        className="upload-button"
        onClick={() => document.getElementById("fileInput").click()}
      >
        <FontAwesomeIcon
          className="upload-icon"
          icon={faArrowUpFromBracket}
        />
        Upload chapter
      </button>
      <p className="files-allowed">pdf, word, ppt, txt</p>
      <input
        type="file"
        id="fileInput"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
    </>
  )}
              </div>
              {/* character count */}
              <button
                ref={generateButtonRef}
                onClick={handleSummarize}
                disabled={loading || ( !text && !pdfMode )}
                className="app-button"
              >
                {loading ? "Creating your notes..." : "Create My Notes"}
              </button>
              {uploaded && !loading && (
                <p className="upload-feedback">
                  Text loaded! Press{" "}
                  <span className="span-message-upload">Create My Notes</span>{" "}
                  to continue.
                </p>
              )}
            </>
          )}
          {!isAiOutput && aiOutput && (
            <p className="error-message">{aiOutput}</p>
          )}

          {/* Error message handling (e.g., network errors, API errors). */}
          {isAiOutput && aiOutput && (
            <>
              <p
                className="output-success-message"
                ref={successRef}
                tabIndex={-1}
                aria-live="polite"
              >
                Your notes are ready!
              </p>
              {/* PDF download button */}
              <button
                onClick={handleDownloadPDF}
                className="pdf-download-button"
              >
                <FontAwesomeIcon
                        className="download-icon"
                        icon={faDownload}
                      />
                Download PDF
              </button>
              <pre className="ai-output">{aiOutput}</pre>
              <button
                onClick={handleCopy}
                disabled={!aiOutput}
                className="copy-button"
              >
                {copied ? (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="copied-icon" />
                    <span className="copied-text">copied</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={faCopyRegular}
                      className="copy-icon"
                    />
                    <span className="copy-text">copy</span>
                  </>
                )}
              </button>
              <div>
                <button onClick={handleReset} className="back-button">
                  Summarize another chapter
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
