import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Head from "next/head";
import { useEffect, useState } from "react";

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch latest user info
const refreshUser = async () => {
  const savedUser = JSON.parse(localStorage.getItem("user"));
  console.log("Before API:", savedUser);

  if (!savedUser) return;

  try {
    const res = await fetch(`http://localhost:5000/api/me/${savedUser.id}`);
    const updatedUser = await res.json();
    console.log("API response:", updatedUser);

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  // On component mount, refresh user data
  useEffect(() => {
    refreshUser();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";  // handles invalid date strings
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Account</title>
        </Head>
        <Header />
        <div className="account-container">
          <h2>Loading account info...</h2>
        </div>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>Account</title>
        </Head>
        <Header />
        <div className="account-container">
          <h2>Please login to view your account</h2>
        </div>
        <Footer />
      </>
    );
  }

  const isSubscribed = user.subscribed;

  return (
    <>
      <Head>
        <title>Account</title>
      </Head>
      <Header />

      <div className="account-container">
        <h1>Account</h1>

        <div className="account-card">
          <p>
            <strong>Name:</strong> {user.name}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>

          {isSubscribed ? (
            <>
              <p>
                <strong>Status:</strong> Subscribed
              </p>
              <p>
                <strong>Subscribed from:</strong> {formatDate(user.subscribedAt)}
              </p>
              <p>
                <strong>Subscribed until:</strong> {formatDate(user.subscribedUntil)}
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Status:</strong> Not subscribed
              </p>
              <button
                className="subscribe-btn"
                onClick={refreshUser} // For testing / manually refresh
              >
                Subscribe (coming soon)
              </button>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
