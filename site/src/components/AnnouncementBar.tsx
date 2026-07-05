"use client";

import { useState } from "react";
import styles from "./AnnouncementBar.module.css";

export default function AnnouncementBar() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className={styles.bar}>
      <p className={styles.text}>
        New: keyless local web for your agent — search, fetch, crawl &amp; research over MCP{" "}
        <a
          href="https://github.com/KnockOutEZ/wigolo"
          className={styles.link}
        >
          Star on GitHub
        </a>
      </p>
      <button
        className={styles.close}
        aria-label="Dismiss announcement"
        onClick={() => setOpen(false)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
