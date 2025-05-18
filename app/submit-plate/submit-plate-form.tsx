"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Check, ChevronsUpDown, Upload } from "lucide-react";
import Image from "next/image";
import imageCompression from "browser-image-compression";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Category, Country, CarMake } from "@/db/schema";
import { submitLicensePlate } from "./actions";

// Form schema for validation
const formSchema = z.object({
  plateNumber: z.string().min(2, {
    message: "License plate number must be at least 2 characters.",
  }),
  countryId: z.string().uuid({
    message: "Please select a country.",
  }),
  carMakeId: z.string().uuid().optional(),
  categoryId: z.string().uuid({
    message: "Please select a category.",
  }),
  caption: z
    .string()
    .min(5, {
      message: "Caption must be at least 5 characters.",
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  images: z.any(), // Using z.any() to avoid type issues with File objects
});

interface SubmitPlateFormProps {
  categories: Category[];
  countries: Country[];
  carMakes: CarMake[];
}

export default function SubmitPlateForm({
  categories,
  countries,
  carMakes,
}: SubmitPlateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const [isCompressing, setIsCompressing] = React.useState(false);

  // Initialize form
  const form = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      plateNumber: "",
      countryId: "",
      carMakeId: "",
      categoryId: "",
      caption: "",
      tags: [],
      images: [],
    },
  });

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log("File input change detected", files.length, "files");

    if (files.length > 0) {
      // Clean up previous preview URLs to avoid memory leaks
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      // Compression options
      const options = {
        maxSizeMB: 0.8, // Set max size to 0.8MB to ensure it stays under 1MB
        maxWidthOrHeight: 1920, // Resize if larger than 1920px
        useWebWorker: true, // Use web workers for better performance
      };

      setIsCompressing(true);

      try {
        // Compress all images
        const compressedFiles = await Promise.all(
          files.map(async (file) => {
            // Log original file size
            console.log(
              `Original image: ${file.name}, Size: ${(
                file.size /
                1024 /
                1024
              ).toFixed(2)} MB`
            );

            // Compress the file
            const compressedFile = await imageCompression(file, options);

            // Log compressed file size
            console.log(
              `Compressed image: ${file.name}, Size: ${(
                compressedFile.size /
                1024 /
                1024
              ).toFixed(2)} MB`
            );

            return compressedFile;
          })
        );

        console.log("All files compressed:", compressedFiles.length);

        // Create preview URLs
        const newPreviewUrls = compressedFiles.map((file) =>
          URL.createObjectURL(file)
        );

        // Update form value with type assertion to bypass TypeScript errors
        console.log("Setting form value for images:", compressedFiles);
        form.setValue("images", compressedFiles as any, {
          shouldValidate: true,
        });

        // Log form values after update to verify
        console.log("Form values after update:", form.getValues());

        // Set new preview URLs
        setPreviewUrls(newPreviewUrls);
      } catch (error) {
        console.error("Error compressing images:", error);
        // Fall back to original files if compression fails
        const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
        form.setValue("images", files as any, { shouldValidate: true });
        setPreviewUrls(newPreviewUrls);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  // Form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submission started", values);

    setIsSubmitting(true);

    try {
      // Create a new FormData instance
      const formData = new FormData();

      // Add all text fields
      formData.append("plateNumber", values.plateNumber);
      formData.append("countryId", values.countryId);
      formData.append("categoryId", values.categoryId);
      formData.append("caption", values.caption || "");

      if (values.carMakeId) {
        formData.append("carMakeId", values.carMakeId);
      }

      // Add any tags if present
      if (values.tags && values.tags.length > 0) {
        values.tags.forEach((tag) => formData.append("tags", tag));
      }

      // Add images directly from the form state
      if (values.images && values.images.length > 0) {
        for (let i = 0; i < values.images.length; i++) {
          const file = values.images[i];
          console.log(`Adding image ${i} to FormData:`, file.name, file.size);
          formData.append("images", file);
        }
      } else {
        console.error("No images found in form values");
        toast.error("Please upload at least one image");
        setIsSubmitting(false);
        return;
      }

      // Submit the form data to the server action
      console.log("Calling server action with form data");
      const result = await submitLicensePlate(formData);
      console.log("Server action result:", result);

      if (result.success && result.plateNumber) {
        toast.success(
          <div className="flex flex-col space-y-2">
            <p>License plate submitted successfully!</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/${encodeURIComponent(result.plateNumber)}`)
              }
            >
              View License Plate
            </Button>
          </div>
        );

        // Redirect after successful submission
        router.push("/");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit license plate");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while submitting the form");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit as any, (errors) => {
          console.error("Form validation failed:", errors);
          toast.error("Please fill all required fields correctly");
        })}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* License Plate Number */}
          <FormField
            control={form.control}
            name="plateNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate Number</FormLabel>
                <FormControl>
                  <Input placeholder="ABC123" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the license plate number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Country Dropdown */}
          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Country</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          <>
                            <span className="mr-2">
                              {countries.find(
                                (country) => country.id === field.value
                              )?.flag || "🏳️"}
                            </span>
                            {
                              countries.find(
                                (country) => country.id === field.value
                              )?.name
                            }
                          </>
                        ) : (
                          "Select country"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {countries.map((country) => (
                            <CommandItem
                              value={country.name}
                              key={country.id}
                              onSelect={() => {
                                form.setValue("countryId", country.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  country.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="mr-2">{country.flag}</span>
                              {country.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select the country of the license plate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Car Make Dropdown */}
          <FormField
            control={form.control}
            name="carMakeId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Car Make</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          <>
                            <span className="mr-2 flex items-center">
                              <Image
                                src={
                                  carMakes.find(
                                    (carMake) => carMake.id === field.value
                                  )?.logoUrl || "/car-logos/default.svg"
                                }
                                alt="Car logo"
                                width={20}
                                height={20}
                                className="h-5 w-5"
                                unoptimized
                              />
                            </span>
                            {
                              carMakes.find(
                                (carMake) => carMake.id === field.value
                              )?.name
                            }
                          </>
                        ) : (
                          "Select car make"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search car make..." />
                      <CommandList>
                        <CommandEmpty>No car make found.</CommandEmpty>
                        <CommandGroup>
                          {carMakes.map((carMake) => (
                            <CommandItem
                              value={carMake.name}
                              key={carMake.id}
                              onSelect={() => {
                                form.setValue("carMakeId", carMake.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  carMake.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="mr-2 flex items-center">
                                <Image
                                  src={
                                    carMake.logoUrl || "/car-logos/default.svg"
                                  }
                                  alt={`${carMake.name} logo`}
                                  width={20}
                                  height={20}
                                  className="h-5 w-5"
                                  unoptimized
                                />
                              </span>
                              {carMake.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select the make of the car (optional).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category Dropdown */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Category</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          <>
                            <span className="mr-2">
                              {
                                categories.find(
                                  (category) => category.id === field.value
                                )?.emoji
                              }
                            </span>
                            {
                              categories.find(
                                (category) => category.id === field.value
                              )?.name
                            }
                          </>
                        ) : (
                          "Select category"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => (
                            <CommandItem
                              value={category.name}
                              key={category.id}
                              onSelect={() => {
                                form.setValue("categoryId", category.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  category.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="mr-2">{category.emoji}</span>
                              {category.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select a category for the license plate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Caption */}
          <FormField
            control={form.control}
            name="caption"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Caption</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Write a caption for this license plate"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Add a caption to describe the license plate.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Image Upload */}
        <FormField
          control={form.control}
          name="images"
          render={({ field: { onChange, value, ...rest }, fieldState }) => (
            <FormItem>
              <FormLabel>Upload Images</FormLabel>
              <FormControl>
                <div className="flex flex-col items-center space-y-4">
                  <div className="grid w-full gap-4">
                    <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border border-dashed p-4">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Drag & drop or click to upload license plate photos
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        className="mt-4 w-full max-w-xs"
                        onChange={handleFileChange}
                        disabled={isCompressing}
                        {...rest}
                      />
                      {isCompressing && (
                        <p className="mt-2 text-sm text-amber-600 animate-pulse">
                          Optimizing images for upload...
                        </p>
                      )}
                      {fieldState.error && (
                        <p className="mt-2 text-sm text-red-500">
                          {fieldState.error.message} (Debug:{" "}
                          {value?.length || 0} images)
                        </p>
                      )}
                    </div>

                    {/* Image Previews */}
                    {previewUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="h-full w-full rounded-md object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Upload up to 5 photos of the license plate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-8">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            onClick={() => {
              // Debug validation before submission
              const isValid = form.formState.isValid;
              const errors = form.formState.errors;
              console.log("Form is valid:", isValid);
              console.log("Form errors:", errors);
              console.log("Current form values:", form.getValues());
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit License Plate"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
