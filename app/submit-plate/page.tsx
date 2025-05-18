import SubmitPlateForm from "@/app/submit-plate/submit-plate-form";
import { Metadata } from "next";
import { getCategories, getCountries, getCarMakes } from "./actions";

export const metadata: Metadata = {
  title: "Submit License Plate",
  description: "Upload photos of license plates you've spotted",
};

export default async function SubmitPlatePage() {
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
      <SubmitPlateForm
        categories={categories}
        countries={countries}
        carMakes={carMakes}
      />
    </div>
  );
}
