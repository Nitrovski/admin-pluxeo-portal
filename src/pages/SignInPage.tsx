import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="centered-page">
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/tenants" signUpUrl="" />
    </div>
  );
}
