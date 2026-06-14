import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - FOUNDERS ARENA',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white py-20 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white -ml-4 px-4 py-2 rounded-md hover:bg-white/5 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none text-gray-300 space-y-6">
          <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to FOUNDERS ARENA ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform.
            </p>
            <p>
              By accessing or using our platform, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us when you register for an account, fill out your profile, or communicate with us. This may include:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and professional credentials.</li>
              <li><strong>Business Data:</strong> Company name, role, revenue estimates, sector focus, and operational stage.</li>
              <li><strong>Authentication Data:</strong> Passwords, security questions, and Google OAuth data when you sign in via Google.</li>
              <li><strong>Documents:</strong> Verification documents submitted for our KYC/Verification process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use personal information collected via our platform for a variety of business purposes described below:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>To facilitate account creation and logon process.</li>
              <li>To provide our matching services and generate compatibility-scored introduction recommendations.</li>
              <li>To enforce our terms, conditions, and policies for business purposes, legal reasons, and contractual obligations.</li>
              <li>To fulfill and manage KYC (Know Your Customer) and Enhanced Due Diligence (EDD) requirements.</li>
              <li>To send administrative information to you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Sharing of Information</h2>
            <p>
              We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. 
              <strong> Crucially, no introduction or full profile is shared with any counterpart without explicit bilateral consent.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Google Data Usage</h2>
            <p>
              Our application uses Google OAuth to authenticate users. We only request and store the basic profile information (email, name, and profile picture) required to create and manage your account. We do not access your Google Drive, Gmail, or other sensitive Google services. 
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Data Security</h2>
            <p>
              We implement industry-standard security measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Contact Us</h2>
            <p>
              If you have questions or comments about this policy, you may email us at: officeoftheceo@exoasia.org
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
