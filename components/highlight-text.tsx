"use client";

import React from "react";

interface HighlightTextProps {
  text: string;
  searchTerm: string;
}

export function HighlightText({ text, searchTerm }: HighlightTextProps) {
  if (!searchTerm.trim()) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${searchTerm.trim()})`, "gi"));

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
        return isMatch ? (
          <span key={index} className="bg-yellow-200 dark:bg-yellow-800">
            {part}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </>
  );
}
