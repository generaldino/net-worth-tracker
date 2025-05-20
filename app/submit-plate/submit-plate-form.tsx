"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { submitLicensePlate } from "./actions";
import type { Category, Country, CarMake, User, Tag } from "@/db/schema";
import * as React from "react";
import { Check, ChevronsUpDown, Upload, User as UserIcon } from "lucide-react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
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

interface SubmitPlateFormProps {
  categories: Category[];
  countries: Country[];
  carMakes: CarMake[];
  users: User[];
  tags: Tag[];
}

const formSchema = z.object({
  plateNumber: z.string().min(1, "Plate number is required"),
  countryId: z.string().min(1, "Country is required"),
  carMakeId: z.string().min(1, "Car make is required"),
  categoryId: z.string().min(1, "Category is required"),
  userId: z.union([z.string().uuid(), z.string().length(0), z.undefined()]),
  caption: z.string().optional(),
  tagIds: z.array(z.string()).max(5, "Maximum 5 tags allowed").optional(),
  images: z
    .array(z.any())
    .min(1, "At least one image is required")
    .max(5, "Maximum 5 images allowed"),
  createdAt: z.string().optional(),
});

export default function SubmitPlateForm({
  categories,
  countries,
  carMakes,
  users,
  tags,
}: SubmitPlateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [openPopovers, setOpenPopovers] = React.useState({
    country: false,
    reporter: false,
    carMake: false,
    category: false,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plateNumber: "",
      countryId: "",
      carMakeId: "",
      categoryId: "",
      userId: "",
      caption: "",
      tagIds: [],
      images: [],
      createdAt: "",
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log("File input change detected", files.length, "files");

    if (files.length > 0) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));

      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      setIsCompressing(true);

      try {
        const compressedFiles = await Promise.all(
          files.map(async (file) => {
            console.log(
              `Original image: ${file.name}, Size: ${(
                file.size /
                1024 /
                1024
              ).toFixed(2)} MB`
            );

            const compressedFile = await imageCompression(file, options);

            console.log(
              `Compressed image: ${file.name}, Size: ${(
                compressedFile.size /
                1024 /
                1024
              ).toFixed(2)} MB`
            );

            // Create a new File object from the compressed blob
            return new File([compressedFile], file.name, {
              type: file.type,
              lastModified: file.lastModified,
            });
          })
        );

        console.log("All files compressed:", compressedFiles.length);

        const newPreviewUrls = compressedFiles.map((file) =>
          URL.createObjectURL(file)
        );

        console.log("Setting form value for images:", compressedFiles);
        form.setValue("images", compressedFiles, {
          shouldValidate: true,
        });

        console.log("Form values after update:", form.getValues());

        setPreviewUrls(newPreviewUrls);
      } catch (error) {
        console.error("Error compressing images:", error);
        const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
        form.setValue("images", files, { shouldValidate: true });
        setPreviewUrls(newPreviewUrls);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (
        !values.plateNumber ||
        !values.countryId ||
        !values.categoryId ||
        !values.carMakeId
      ) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Validate images
      if (!values.images || values.images.length === 0) {
        toast.error("Please upload at least one image");
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("plateNumber", values.plateNumber);
      formData.append("countryId", values.countryId);
      formData.append("categoryId", values.categoryId);
      formData.append("carMakeId", values.carMakeId);
      formData.append("userId", values.userId || "");
      formData.append("caption", values.caption || "");
      formData.append("createdAt", values.createdAt || "");

      if (values.tagIds && values.tagIds.length > 0) {
        values.tagIds.forEach((tagId) => formData.append("tagIds", tagId));
      }

      values.images.forEach((file) => formData.append("images", file));

      const result = await submitLicensePlate(formData);
      if (result.success) {
        toast.success("License plate submitted successfully!");
        router.push("/");
        router.refresh();
      } else {
        toast.error("Failed to submit license plate. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting license plate:", error);
      toast.error("Failed to submit license plate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error("Form validation failed:", errors);
          // Show specific error messages for each field
          Object.entries(errors).forEach(([field, error]) => {
            if (error?.message) {
              toast.error(`${field}: ${error.message}`);
            }
          });
        })}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="plateNumber"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start">
                <FormLabel>License Plate Number</FormLabel>
                <FormControl>
                  <Input placeholder="ABC123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start">
                <FormLabel>Country</FormLabel>
                <Popover
                  open={openPopovers.country}
                  onOpenChange={(open) =>
                    setOpenPopovers((prev) => ({ ...prev, country: open }))
                  }
                >
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
                                setOpenPopovers((prev) => ({
                                  ...prev,
                                  country: false,
                                }));
                              }}
                            >
                              <div className="flex items-center">
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
                              </div>
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

          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Reporter</FormLabel>
                <Popover
                  open={openPopovers.reporter}
                  onOpenChange={(open) =>
                    setOpenPopovers((prev) => ({ ...prev, reporter: open }))
                  }
                >
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
                              {users.find((user) => user.id === field.value)
                                ?.avatarUrl ? (
                                <Image
                                  src={
                                    users.find(
                                      (user) => user.id === field.value
                                    )?.avatarUrl || ""
                                  }
                                  alt="User avatar"
                                  width={20}
                                  height={20}
                                  className="h-5 w-5 rounded-full"
                                  unoptimized
                                />
                              ) : (
                                <UserIcon className="h-5 w-5" />
                              )}
                            </span>
                            {
                              users.find((user) => user.id === field.value)
                                ?.name
                            }
                          </>
                        ) : (
                          "Select reporter"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search reporter..." />
                      <CommandList>
                        <CommandEmpty>No reporter found.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              value={user.name || user.email}
                              key={user.id}
                              onSelect={() => {
                                form.setValue("userId", user.id);
                                setOpenPopovers((prev) => ({
                                  ...prev,
                                  reporter: false,
                                }));
                              }}
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    user.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <span className="mr-2 flex items-center">
                                  {user.avatarUrl ? (
                                    <Image
                                      src={user.avatarUrl}
                                      alt={`${user.name} avatar`}
                                      width={20}
                                      height={20}
                                      className="h-5 w-5 rounded-full"
                                      unoptimized
                                    />
                                  ) : (
                                    <UserIcon className="h-5 w-5" />
                                  )}
                                </span>
                                {user.name || user.email}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select who spotted this license plate. If not selected, you
                  will be recorded as the reporter.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carMakeId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Car Make</FormLabel>
                <Popover
                  open={openPopovers.carMake}
                  onOpenChange={(open) =>
                    setOpenPopovers((prev) => ({ ...prev, carMake: open }))
                  }
                >
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
                                setOpenPopovers((prev) => ({
                                  ...prev,
                                  carMake: false,
                                }));
                              }}
                            >
                              <div className="flex items-center">
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
                                      carMake.logoUrl ||
                                      "/car-logos/default.svg"
                                    }
                                    alt={`${carMake.name} logo`}
                                    width={20}
                                    height={20}
                                    className="h-5 w-5"
                                    unoptimized
                                  />
                                </span>
                                {carMake.name}
                              </div>
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

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Category</FormLabel>
                <Popover
                  open={openPopovers.category}
                  onOpenChange={(open) =>
                    setOpenPopovers((prev) => ({ ...prev, category: open }))
                  }
                >
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
                                setOpenPopovers((prev) => ({
                                  ...prev,
                                  category: false,
                                }));
                              }}
                            >
                              <div className="flex items-center">
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
                              </div>
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

          <FormField
            control={form.control}
            name="createdAt"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start">
                <FormLabel>Date Spotted (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    placeholder="DD/MM/YYYY HH:MM:SS"
                  />
                </FormControl>
                <FormDescription>
                  When was this license plate spotted? Leave empty for current
                  time.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tagIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (max 5)</FormLabel>
              <FormControl>
                <MultiSelect
                  selected={field.value || []}
                  options={tags.map((tag) => ({
                    label: tag.name,
                    value: tag.id,
                  }))}
                  onChange={field.onChange}
                  placeholder="Select tags..."
                  maxSelections={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
