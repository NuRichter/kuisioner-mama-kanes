import { meta } from "@/data/questionnaire";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[68rem] px-5 pt-5 sm:px-8">
        <p className="text-[0.8125rem] leading-relaxed text-muted">
          Questionnaire dibuat {meta.author}{" "}
          <span className="whitespace-nowrap">
            © {meta.year} All Rights Reserved
          </span>
        </p>
      </div>
    </footer>
  );
}
