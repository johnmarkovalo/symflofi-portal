"use client";

export default function DownloadLink({
  href,
  version,
  board,
  fileType,
  className,
  children,
}: {
  href: string;
  version: string;
  board: string;
  fileType: "image" | "update" | "apk" | "firmware";
  className: string;
  children: React.ReactNode;
}) {
  function handleClick() {
    fetch("/api/track-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, board, file_type: fileType }),
    }).catch(() => {});
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
