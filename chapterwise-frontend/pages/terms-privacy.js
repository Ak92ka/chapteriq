import Head from "next/head";
// Only import Header/Footer if you really need interactive behavior
import Header from "@/components/Header.js";
import Footer from "@/components/Footer.js";

export default function TermsPrivacy() {
  return (
    <>
      <Head>
        <title>Terms of Service & Privacy Policy | ChapterIQ</title>
        <meta
          name="description"
          content="Read ChapterIQ’s terms of service and privacy policy to understand how we handle user data and platform usage."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {/* Optional: lazy-load Header for lighter JS */}
        <Header />

        <div className="terms-privacy-container">
          <h1>Terms & Privacy</h1>

          <h2>Terms of Service</h2>
          <p><strong>1. Acceptance of Terms:</strong> By using ChapterIQ, you agree to comply with these Terms of Service. If you do not agree, please do not use the website or app.</p>

          <p><strong>2. Use of the Service:</strong> ChapterIQ provides generated study notes for personal educational use. Commercial use, plagiarism, or distributing content that violates laws is prohibited.</p>

          <p><strong>3. User Responsibility:</strong> You are responsible for the accuracy and legality of any content you submit. ChapterIQ is not responsible for errors in uploaded chapters or misuse of generated notes.</p>

          <p><strong>4. Intellectual Property:</strong> All generated notes and materials remain property of ChapterIQ. Users may use notes for personal study only. Redistribution or commercial use is prohibited.</p>

          <p><strong>5. Account & Security:</strong> You are responsible for keeping your login credentials secure. Notify us immediately if you suspect unauthorized access.</p>

          <p><strong>6. Changes to Terms:</strong> ChapterIQ may update these terms at any time. Continued use constitutes acceptance of changes.</p>

          <h2 id="privacy-policy">Privacy Policy</h2>

          <p><strong>1. Information We Collect:</strong> We collect information you provide, such as account details, uploaded chapters, and usage data.</p>

          <p><strong>2. How We Use Your Data:</strong> Data is used to generate study notes, improve the service, provide support, and personalize your experience.</p>

          <p><strong>3. Data Sharing:</strong> We do not sell your data. We may share information only when legally required.</p>

          <p><strong>4. Security:</strong> We use reasonable technical measures to protect your data. No method is completely secure.</p>

          <p><strong>5. Retention:</strong> Uploaded chapters and generated notes are stored temporarily. Data in your account is retained until you delete your account.</p>

          <p><strong>6. Cookies & Tracking:</strong> ChapterIQ uses cookies for session management and analytics. You may accept or reject non-essential cookies.</p>

          <p><strong>7. User Rights (GDPR):</strong></p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your data.</li>
            <li><strong>Correction:</strong> Correct inaccurate or incomplete data.</li>
            <li><strong>Erasure:</strong> Delete your account and data.</li>
            <li><strong>Restriction:</strong> Temporarily limit how we process your data.</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format.</li>
            <li><strong>Object:</strong> Object to processing for marketing or other purposes.</li>
          </ul>
          <p>Requests can be made by contacting us at <a href="mailto:support@ChapterIQ.com">support@ChapterIQ.com</a>.</p>

          <p><strong>8. Complaints:</strong> If you believe your data rights have been violated, you may file a complaint with your local data protection authority.</p>
        </div>
      </main>

      <Footer />
    </>
  );
}
