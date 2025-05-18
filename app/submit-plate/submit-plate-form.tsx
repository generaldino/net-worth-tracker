"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Check, ChevronsUpDown, Upload } from "lucide-react";
import Image from "next/image";

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
  caption: z.string().min(5, {
    message: "Caption must be at least 5 characters.",
  }),
  tags: z.array(z.string()).optional(),
  images: z
    .array(z.instanceof(File))
    .min(1, { message: "At least one image is required." })
    .max(5, { message: "Maximum 5 images allowed." }),
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

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length > 0) {
      // Update form value
      form.setValue("images", files, { shouldValidate: true });

      // Create preview URLs
      const newPreviewUrls = files.map((file) => URL.createObjectURL(file));

      // Clean up previous preview URLs to avoid memory leaks
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      // Set new preview URLs
      setPreviewUrls(newPreviewUrls);
    }
  };

  // Form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Create FormData object for the server action
      const formData = new FormData();
      formData.append("plateNumber", values.plateNumber);
      formData.append("countryId", values.countryId);
      if (values.carMakeId) {
        formData.append("carMakeId", values.carMakeId);
      }
      formData.append("categoryId", values.categoryId);
      formData.append("caption", values.caption);

      // Add tags if available
      if (values.tags && values.tags.length > 0) {
        values.tags.forEach((tag) => {
          formData.append("tags", tag);
        });
      }

      // Add images
      values.images.forEach((file, index) => {
        formData.append(`images`, file);
      });

      // Call the server action
      const result = await submitLicensePlate(formData);

      if (result.success) {
        toast.success("License plate submitted successfully!");
        // Redirect to home page
        router.push("/");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit license plate.");
      }
    } catch (error) {
      toast.error("Failed to submit license plate.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          render={({ field: { onChange, value, ...rest } }) => (
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
                        {...rest}
                      />
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit License Plate"}
        </Button>
      </form>
    </Form>
  );
}
