import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - FOUNDERS ARENA',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white py-20 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white -ml-4 px-4 py-2 rounded-md hover:bg-white/5 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Agreement to Terms</h2>
            <p>
              These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and FOUNDERS ARENA ("we," "us" or "our"), concerning your access to and use of our platform.
            </p>
            <p>
              By accessing the platform, you agree that you have read, understood, and agree to be bound by all of these Terms of Service. If you do not agree with all of these Terms of Service, then you are expressly prohibited from using the platform and you must discontinue use immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Platform Nature and Disclaimer</h2>
            <p>
              FOUNDERS ARENA operates as an intelligent facilitation layer. We are not a social network or a direct lead-generation tool. We provide structured facilitation, infrastructure, and verified introductions.
            </p>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg my-4 text-sm text-gray-400">
              <strong>Disclaimer:</strong> FOUNDERS ARENA does not offer securities, solicit investments, or provide financial advice. All investment decisions and transactions are initiated and executed solely by participating members. The Network provides structured facilitation, infrastructure, and verified introductions only. Participation does not guarantee capital allocation, partnership formation, or transaction completion.
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. User Representations</h2>
            <p>By using the platform, you represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>All registration information you submit will be true, accurate, current, and complete.</li>
              <li>You will maintain the accuracy of such information and promptly update it as necessary.</li>
              <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
              <li>You are not under the age of 18.</li>
              <li>You will not use the platform for any illegal or unauthorized purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Verification and KYC</h2>
            <p>
              Access to specific stages of our platform requires successful completion of our multi-tier identity and business verification process (KYC). We reserve the right to deny access, freeze accounts, or request Enhanced Due Diligence (EDD) if risk flags are identified.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Confidentiality and Non-Circumvention</h2>
            <p>
              Users agree to maintain the strict confidentiality of all introductions, deal structures, and proprietary business information shared within the network. Any attempt to circumvent the platform to close deals directly outside of the monitored Deal Board without platform consent may result in immediate suspension or termination of access.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Modifications and Interruptions</h2>
            <p>
              We reserve the right to change, modify, or remove the contents of the platform at any time or for any reason at our sole discretion without notice. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Contact Information</h2>
            <p>
              For any questions or complaints regarding the platform, please contact us at: officeoftheceo@exoasia.org
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
