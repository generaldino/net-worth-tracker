"use client";

import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  variant?: "sidebar" | "mobile";
}

export function TableOfContents({ variant = "sidebar" }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Wait for content to be rendered, then extract headings
    const extractHeadings = () => {
      const headingElements = Array.from(
        document.querySelectorAll(".prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6")
      );

      const headingData: Heading[] = headingElements
        .filter((heading) => heading.id) // Only include headings with IDs (from rehype-slug)
        .map((heading) => {
          const id = heading.id;
          const level = parseInt(heading.tagName.charAt(1));
          const text = heading.textContent?.trim() || "";

          return { id, text, level };
        });

      setHeadings(headingData);
    };

    // Try immediately
    extractHeadings();

    // Also try after a short delay to ensure content is rendered
    const timeout = setTimeout(extractHeadings, 100);

    // Use MutationObserver to detect when headings are added
    const observer = new MutationObserver(extractHeadings);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  if (headings.length === 0) {
    return null;
  }

  const getPaddingLeft = (level: number) => {
    switch (level) {
      case 1:
        return "pl-0";
      case 2:
        return "pl-4";
      case 3:
        return "pl-8";
      case 4:
        return "pl-12";
      default:
        return "pl-16";
    }
  };

  const getTextSize = (level: number) => {
    switch (level) {
      case 1:
        return "text-base font-semibold";
      case 2:
        return "text-sm font-medium";
      case 3:
        return "text-sm";
      default:
        return "text-xs";
    }
  };

  const content = (
    <ul className="space-y-2">
      {headings.map((heading, index) => (
        <li key={`${heading.id}-${index}`}>
          <a
            href={`#${heading.id}`}
            className={`block ${getPaddingLeft(heading.level)} ${getTextSize(heading.level)} text-muted-foreground hover:text-foreground transition-colors`}
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(heading.id);
              if (element) {
                const offset = variant === "mobile" ? 120 : 100;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - offset;

                window.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth",
                });
                
                if (variant === "mobile") {
                  setIsOpen(false);
                }
              }
            }}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );

  if (variant === "mobile") {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="lg:hidden mb-8">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Table of Contents
          </h2>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="border-l border-border pl-4 max-h-[60vh] overflow-y-auto">
            {content}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="border-l border-border pl-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Table of Contents
        </h2>
        {content}
      </div>
    </nav>
  );
}

