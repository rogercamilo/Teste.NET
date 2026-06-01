"use client";

const STORAGE_KEY = "Formattio_cookie_consent";

export default function CookiePreferencesLink() {
  function handleClick() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  return (
    <button
      onClick={handleClick}
      className="hover:text-foreground transition-colors cursor-pointer"
    >
      Cookies
    </button>
  );
}
