import "../styles/globals.css";
import '../styles/index.css';
import "../styles/header.css";
import "../styles/footer.css";
import "../styles/app.css";
import "../styles/about-us.css";
import "../styles/terms-privacy.css"
import "../styles/contact.css"
import "../styles/pricing.css"
import "../styles/blog.css"

export default function App({ Component, pageProps }) {
  return (
      <Component {...pageProps} />
  );
}
