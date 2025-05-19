import SubmitPlateForm from "@/app/submit-plate/submit-plate-form";
import { Metadata } from "next";
import {
  getCategories,
  getCountries,
  getCarMakes,
  getUsers,
  getTags,
} from "./actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Submit License Plate",
  description: "Upload photos of license plates you've spotted",
};

export default async function SubmitPlatePage() {
  // Check if user is authenticated
  const session = await auth();
  const isAuthenticated = !!session?.user;

  // If not authenticated, redirect to homepage
  // (the modal is shown from the SubmitPlateButton component)
  if (!isAuthenticated) {
    redirect("/");
  }

  // Fetch data using server actions
  const { categories } = await getCategories();
  const { countries } = await getCountries();
  const { carMakes } = await getCarMakes();
  const { users } = await getUsers();
  const { tags } = await getTags();

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

      <SubmitPlateForm
        categories={categories}
        countries={countries}
        carMakes={carMakes}
        users={users}
        tags={tags}
      />
    </div>
  );
}
