import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Unbound",
  description: "How Unbound handles your child's information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Nav */}
        <div className="mb-8">
          <Link href="/" className="text-[#5b8f8a] font-semibold text-lg hover:underline">
            ← Back to Unbound
          </Link>
        </div>

        {/* Header */}
        <h1 className="text-4xl font-bold text-[#2d2d2d] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#8a8580] mb-10">Last updated: March 2026</p>

        <div className="prose prose-slate max-w-none text-[#2d2d2d]">

          {/* Short version */}
          <div className="bg-[#5b8f8a]/10 border border-[#5b8f8a]/20 rounded-2xl px-6 py-5 mb-10">
            <h2 className="text-lg font-bold text-[#5b8f8a] mt-0 mb-2">The short version</h2>
            <p className="text-[#2d2d2d] text-sm leading-relaxed m-0">
              We collect only what we need to generate your child&apos;s lesson plan. We don&apos;t sell your
              data. We don&apos;t store it longer than 24 hours. Your child&apos;s information never leaves
              the plan generation process.
            </p>
          </div>

          <Section title="Who we are">
            <p>
              Unbound is a personalized homeschool curriculum tool. We help parents create daily lesson
              plans tailored to their child&apos;s interests, grade level, and learning style. We are
              operated by Unbound Learning, LLC.
            </p>
            <p>
              Questions? Email us at{" "}
              <a href="mailto:privacy@unboundlearn.co" className="text-[#5b8f8a] hover:underline">
                privacy@unboundlearn.co
              </a>
            </p>
          </Section>

          <Section title="What we collect">
            <p>When you use Unbound, you provide:</p>
            <ul>
              <li>A nickname for your child (not a legal name)</li>
              <li>Target grade level</li>
              <li>Your child&apos;s interests</li>
              <li>What they find challenging</li>
              <li>How much time you have today</li>
              <li>Your priority for the session</li>
            </ul>

            <p>We also collect:</p>
            <ul>
              <li>
                A payment token through Stripe (we never see your card number — Stripe handles all
                payment processing)
              </li>
              <li>A Cloudflare Turnstile verification token (bot protection)</li>
            </ul>

            <p>We do <strong>NOT</strong> collect:</p>
            <ul>
              <li>Your name or email address</li>
              <li>Your child&apos;s legal name, date of birth, or exact age</li>
              <li>Medical diagnoses or health information</li>
              <li>Location data</li>
              <li>Cookies or tracking identifiers</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <p>
              Your information is used for one purpose: generating your child&apos;s personalized lesson
              plan. It is passed to our AI system (powered by Anthropic&apos;s Claude) to produce the
              plan. It is not used for advertising, analytics, or any secondary purpose.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              Your session data — including your child&apos;s profile and the generated plan — is stored
              temporarily and automatically deleted after 24 hours. We do not maintain a database of
              users or plans.
            </p>
          </Section>

          <Section title="Third parties we work with">
            <ul>
              <li>
                <strong>Anthropic</strong> — provides the AI that generates lesson plans. Your child&apos;s
                profile is sent to Anthropic&apos;s API during plan generation.{" "}
                <a href="https://anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#5b8f8a] hover:underline">
                  anthropic.com/privacy
                </a>
              </li>
              <li>
                <strong>Stripe</strong> — processes payments securely. We never see your card details.{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#5b8f8a] hover:underline">
                  stripe.com/privacy
                </a>
              </li>
              <li>
                <strong>Vercel</strong> — hosts the application and stores temporary session data.{" "}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#5b8f8a] hover:underline">
                  vercel.com/legal/privacy-policy
                </a>
              </li>
              <li>
                <strong>Cloudflare</strong> — provides bot protection via Turnstile.{" "}
                <a href="https://cloudflare.com/privacypolicy" target="_blank" rel="noopener noreferrer" className="text-[#5b8f8a] hover:underline">
                  cloudflare.com/privacypolicy
                </a>
              </li>
            </ul>
          </Section>

          <Section title="Children's privacy (COPPA)">
            <p>
              Unbound is designed for use by parents, not by children directly. Parents provide
              information about their child on their own behalf to generate a lesson plan. We do not
              knowingly collect information directly from children.
            </p>
            <p>
              If you believe your child has directly submitted information to Unbound without your
              knowledge, please contact us at{" "}
              <a href="mailto:privacy@unboundlearn.co" className="text-[#5b8f8a] hover:underline">
                privacy@unboundlearn.co
              </a>{" "}
              and we will promptly delete it.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              Because we don&apos;t maintain user accounts or long-term records, most data is automatically
              deleted within 24 hours. If you have a specific request — including deletion of data
              before the 24-hour window — contact us at{" "}
              <a href="mailto:privacy@unboundlearn.co" className="text-[#5b8f8a] hover:underline">
                privacy@unboundlearn.co
              </a>{" "}
              and we&apos;ll address it promptly.
            </p>
            <p>
              California residents have additional rights under the CCPA. EU/UK residents have rights
              under the GDPR. Contact us for any requests under these laws.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We&apos;ll update this page if our practices change. The date at the top reflects the most
              recent revision.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <a href="mailto:privacy@unboundlearn.co" className="text-[#5b8f8a] hover:underline">
                privacy@unboundlearn.co
              </a>
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

// Section wrapper for consistent heading style
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#2d2d2d] mb-3 pb-2 border-b border-[#e8e4e0]">
        {title}
      </h2>
      <div className="text-[#2d2d2d] text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
