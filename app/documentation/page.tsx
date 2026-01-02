import { readFile } from "fs/promises";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { TableOfContents } from "@/components/documentation/table-of-contents";

export default async function DocumentationPage() {
  const filePath = join(process.cwd(), "documentation", "how-to-guide.md");
  const content = await readFile(filePath, "utf8");

  return (
    <div className="min-h-[calc(100svh-56px)] bg-background scroll-smooth">
      <div className="w-full py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Main content */}
            <div className="flex-1 min-w-0 max-w-4xl">
              {/* Mobile TOC */}
              <div className="lg:hidden">
                <TableOfContents variant="mobile" />
              </div>
              
              <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl sm:prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:first:mt-0 prose-h2:text-xl sm:prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h3:text-lg sm:prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-h4:text-base sm:prose-h4:text-lg md:prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-2 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-sm sm:prose-p:text-base prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-ul:list-disc prose-ol:list-decimal prose-li:my-2 prose-li:ml-4 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs sm:prose-code:text-sm prose-code:font-mono prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 sm:prose-pre:p-4 prose-pre:overflow-x-auto prose-hr:my-8 prose-hr:border-border prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4 prose-blockquote:text-muted-foreground prose-table:my-4 prose-table:border-collapse prose-table:text-sm sm:prose-table:text-base prose-thead:bg-muted prose-th:border prose-th:border-border prose-th:px-2 sm:prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-td:border prose-td:border-border prose-td:px-2 sm:prose-td:px-4 prose-td:py-2 prose-img:rounded-lg">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* Table of Contents - hidden on mobile, visible on large screens */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <TableOfContents variant="sidebar" />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

