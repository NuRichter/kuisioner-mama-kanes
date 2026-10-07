import { QuestionnaireApp } from "@/components/questionnaire/questionnaire-app";

export default function Home() {
  const contactEmail = process.env.CONTACT_EMAIL?.trim() || undefined;
  return <QuestionnaireApp contactEmail={contactEmail} />;
}
