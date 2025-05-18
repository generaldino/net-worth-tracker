import SubmitPlateForm from "@/app/submit-plate/submit-plate-form";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Metadata } from "next";
import { getCategories, getCountries, getCarMakes } from "./actions";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Submit License Plate",
  description: "Upload photos of license plates you've spotted",
};

export default async function SubmitPlatePage() {
  // Check if user is authenticated
  const session = await auth();
  const isAuthenticated = !!session?.user;

  // Fetch data using server actions
  const { categories } = await getCategories();
  const { countries } = await getCountries();
  const { carMakes } = await getCarMakes();

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Submit a License Plate
        </h1>
        <p className="text-muted-foreground mt-2">
          Share interesting license plates you've spotted with the community.
        </p>
      </div>

      {isAuthenticated ? (
        <SubmitPlateForm
          categories={categories}
          countries={countries}
          carMakes={carMakes}
        />
      ) : (
        <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            Authentication Required
          </h2>
          <p className="mb-6">
            You need to sign in before you can submit a license plate. Click the
            button below to sign in with your Google account.
          </p>
          <div className="flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      )}
    </div>
  );
}
